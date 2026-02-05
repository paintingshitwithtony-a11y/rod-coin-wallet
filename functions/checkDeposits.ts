import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's wallet account
        const accounts = await base44.entities.WalletAccount.filter({ 
            email: user.email 
        });

        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];

        // Get active RPC configuration
        const configs = await base44.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (configs.length === 0) {
            return Response.json({ 
                error: 'No active RPC configuration',
                newDeposits: []
            });
        }

        const config = configs[0];
        
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
                // Build RPC URL from active config
                const protocol = config.use_ssl ? 'https' : 'http';
                const rpcUrl = !config.port || config.port === ''
                    ? `${protocol}://${config.host}`
                    : `${protocol}://${config.host}:${config.port}`;
                
                // Prepare headers
                const headers = {
                    'Content-Type': 'application/json'
                };

                if (config.connection_type === 'api' && config.api_key) {
                    headers['X-API-Key'] = config.api_key;
                } else if (config.connection_type === 'rpc' && config.username && config.password) {
                    headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
                }
                
                const rpcResponse = await fetch(rpcUrl, {
                    method: 'POST',
                    headers,
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
                        // Enhanced duplicate detection: check by txid, amount, and address
                        const existing = await base44.entities.Transaction.filter({
                            account_id: account.id,
                            type: 'receive',
                            amount: tx.amount,
                            address: tx.address
                        });

                        // Additional check: verify memo contains this txid
                        const alreadyExists = existing.some(existingTx => 
                            existingTx.memo?.includes(tx.txid)
                        );

                        // If not already recorded, add it
                        if (existing.length === 0 || !alreadyExists) {
                            // Determine which wallet this belongs to
                            const wallets = await base44.entities.Wallet.filter({
                                account_id: account.id,
                                wallet_address: tx.address
                            });
                            const walletId = wallets.length > 0 ? wallets[0].id : null;
                            
                            const newTx = await base44.entities.Transaction.create({
                                account_id: account.id,
                                wallet_id: walletId,
                                wallet_address: tx.address,
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

                            // Update account balance - fetch fresh account data first
                            const freshAccounts = await base44.entities.WalletAccount.filter({ id: account.id });
                            const currentBalance = freshAccounts[0]?.balance || 0;
                            await base44.asServiceRole.entities.WalletAccount.update(account.id, {
                                balance: currentBalance + tx.amount
                            });
                            
                            // Also update individual wallet balance if it exists
                            const wallets = await base44.entities.Wallet.filter({
                                account_id: account.id,
                                wallet_address: tx.address
                            });
                            
                            if (wallets.length > 0) {
                                const wallet = wallets[0];
                                await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                                    balance: (wallet.balance || 0) + tx.amount
                                });
                            }
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