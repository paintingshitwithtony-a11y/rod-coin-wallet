import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get RPC credentials
        const rpcHost = Deno.env.get('ROD_RPC_HOST');
        const rpcPort = Deno.env.get('ROD_RPC_PORT');
        const rpcUser = Deno.env.get('ROD_RPC_USERNAME');
        const rpcPass = Deno.env.get('ROD_RPC_PASSWORD');

        if (!rpcHost || !rpcPort || !rpcUser || !rpcPass) {
            return Response.json({ 
                error: 'RPC credentials not configured',
                newDeposits: []
            });
        }

        // Get user's wallet account
        const accounts = await base44.entities.WalletAccount.filter({ 
            email: user.email 
        });

        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];
        
        // Collect all addresses to monitor
        const addresses = [account.wallet_address];
        if (account.additional_addresses) {
            account.additional_addresses.forEach(addr => {
                addresses.push(addr.address);
            });
        }

        // Check for new transactions on each address
        const newDeposits = [];
        
        for (const address of addresses) {
            try {
                // Call ROD Core RPC to list transactions
                const rpcUrl = `http://${rpcHost}:${rpcPort}`;
                const rpcAuth = btoa(`${rpcUser}:${rpcPass}`);
                
                const rpcResponse = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${rpcAuth}`
                    },
                    body: JSON.stringify({
                        jsonrpc: '1.0',
                        id: 'checkDeposits',
                        method: 'listtransactions',
                        params: ['*', 100, 0, true]
                    })
                });

                if (!rpcResponse.ok) {
                    continue;
                }

                const rpcData = await rpcResponse.json();
                
                if (rpcData.result) {
                    // Filter for receive transactions to this address
                    const receiveTxs = rpcData.result.filter(tx => 
                        tx.category === 'receive' && 
                        tx.address === address &&
                        tx.confirmations >= 1
                    );

                    // Check if we already have these transactions recorded
                    for (const tx of receiveTxs) {
                        const existing = await base44.entities.Transaction.filter({
                            account_id: account.id,
                            address: tx.address,
                            amount: tx.amount
                        });

                        // If not already recorded, add it
                        if (existing.length === 0) {
                            const newTx = await base44.entities.Transaction.create({
                                account_id: account.id,
                                type: 'receive',
                                amount: tx.amount,
                                fee: 0,
                                address: tx.address,
                                memo: `TxID: ${tx.txid}`,
                                confirmations: tx.confirmations,
                                status: tx.confirmations >= 6 ? 'confirmed' : 'pending'
                            });

                            newDeposits.push({
                                amount: tx.amount,
                                address: tx.address,
                                confirmations: tx.confirmations,
                                txid: tx.txid
                            });

                            // Update account balance
                            const currentBalance = account.balance || 0;
                            await base44.asServiceRole.entities.WalletAccount.update(account.id, {
                                balance: currentBalance + tx.amount
                            });
                        }
                    }
                }
            } catch (err) {
                console.error(`Error checking address ${address}:`, err);
            }
        }

        return Response.json({ 
            success: true,
            newDeposits,
            addressesMonitored: addresses.length
        });

    } catch (error) {
        console.error('Check deposits error:', error);
        return Response.json({ 
            error: error.message,
            newDeposits: []
        }, { status: 500 });
    }
});