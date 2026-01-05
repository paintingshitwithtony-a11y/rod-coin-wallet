import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get RPC credentials
        const rpcHost = Deno.env.get('ROD_RPC_HOST');
        const rpcPort = Deno.env.get('ROD_RPC_PORT');
        const rpcUser = Deno.env.get('ROD_RPC_USERNAME');
        const rpcPass = Deno.env.get('ROD_RPC_PASSWORD');

        if (!rpcHost || !rpcPort || !rpcUser || !rpcPass) {
            return Response.json({ 
                error: 'RPC credentials not configured',
                accountsChecked: 0
            });
        }

        // Get all wallet accounts
        const accounts = await base44.asServiceRole.entities.WalletAccount.list();

        let totalNewDeposits = 0;
        let accountsChecked = 0;

        for (const account of accounts) {
            try {
                // Collect all addresses to monitor
                const addresses = [account.wallet_address];
                if (account.additional_addresses) {
                    account.additional_addresses.forEach(addr => {
                        addresses.push(addr.address);
                    });
                }

                // Check for new transactions on each address
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
                                id: 'monitorDeposits',
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
                                const existing = await base44.asServiceRole.entities.Transaction.filter({
                                    account_id: account.id,
                                    address: tx.address,
                                    amount: tx.amount,
                                    memo: `TxID: ${tx.txid}`
                                });

                                // If not already recorded, add it
                                if (existing.length === 0) {
                                    await base44.asServiceRole.entities.Transaction.create({
                                        account_id: account.id,
                                        type: 'receive',
                                        amount: tx.amount,
                                        fee: 0,
                                        address: tx.address,
                                        memo: `TxID: ${tx.txid}`,
                                        confirmations: tx.confirmations,
                                        status: tx.confirmations >= 6 ? 'confirmed' : 'pending'
                                    });

                                    // Update account balance
                                    const currentBalance = account.balance || 0;
                                    await base44.asServiceRole.entities.WalletAccount.update(account.id, {
                                        balance: currentBalance + tx.amount
                                    });

                                    totalNewDeposits++;
                                }
                            }
                        }
                    } catch (err) {
                        console.error(`Error checking address ${address}:`, err);
                    }
                }

                accountsChecked++;
            } catch (err) {
                console.error(`Error processing account ${account.id}:`, err);
            }
        }

        return Response.json({ 
            success: true,
            accountsChecked,
            totalNewDeposits,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Monitor deposits error:', error);
        return Response.json({ 
            error: error.message,
            accountsChecked: 0,
            totalNewDeposits: 0
        }, { status: 500 });
    }
});