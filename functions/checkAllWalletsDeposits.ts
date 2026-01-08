import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const addresses = body.addresses || [];

        if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
            return Response.json({ error: 'No addresses provided' }, { status: 400 });
        }

        // Get the user's account
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        }
        const account = accounts[0];

        // Get active RPC configuration
        const rpcConfigs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (rpcConfigs.length === 0) {
            return Response.json({ 
                success: false,
                error: 'No active RPC configuration',
                newDeposits: [],
                totalNewDeposits: 0
            });
        }

        const rpcConfig = rpcConfigs[0];
        let rpcUrl;
        let authHeaders = {};

        if (rpcConfig.connection_type === 'api') {
            rpcUrl = `${rpcConfig.host}:${rpcConfig.port}`;
            authHeaders['X-API-Key'] = rpcConfig.api_key;
        } else {
            rpcUrl = `http://${rpcConfig.host}:${rpcConfig.port}`;
            const auth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);
            authHeaders['Authorization'] = `Basic ${auth}`;
        }

        let totalNewDeposits = 0;
        const allNewDeposits = [];

        // Check each address
        for (const address of addresses) {
            try {
                // Get received transactions by address
                const listResponse = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders
                    },
                    body: JSON.stringify({
                        jsonrpc: '1.0',
                        id: 'check_deposits',
                        method: 'listreceivedbyaddress',
                        params: [0, true, true]
                    })
                });

                if (!listResponse.ok) {
                    const errorText = await listResponse.text();
                    console.error(`RPC error for ${address}:`, errorText);
                    continue;
                }

                const listData = await listResponse.json();
                if (listData.error) {
                    console.error(`RPC error for ${address}:`, listData.error);
                    continue;
                }

                const receivedList = listData.result || [];
                const addressData = receivedList.find(item => item.address === address);
                
                if (!addressData || addressData.amount === 0) {
                    continue;
                }

                // Get transaction list for this address
                const txListResponse = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders
                    },
                    body: JSON.stringify({
                        jsonrpc: '1.0',
                        id: 'list_txs',
                        method: 'listtransactions',
                        params: ['*', 100, 0, true]
                    })
                });

                if (!txListResponse.ok) {
                    continue;
                }

                const txListData = await txListResponse.json();
                if (txListData.error) {
                    continue;
                }

                const transactions = txListData.result || [];
                const incomingTxs = transactions.filter(tx => 
                    tx.category === 'receive' && 
                    tx.address === address
                );

                // Check which ones are already recorded
                for (const tx of incomingTxs) {
                    const txid = tx.txid;
                    
                    // Check for existing transaction by txid AND address to avoid duplicates
                    const existing = await base44.asServiceRole.entities.Transaction.filter({
                        account_id: account.id
                    });
                    
                    const isDuplicate = existing.some(existingTx => 
                        existingTx.memo === txid && existingTx.address === tx.address
                    );

                    if (!isDuplicate) {
                        // New deposit - record it
                        await base44.asServiceRole.entities.Transaction.create({
                            account_id: account.id,
                            type: 'receive',
                            amount: tx.amount,
                            fee: 0,
                            address: tx.address,
                            memo: txid,
                            confirmations: tx.confirmations || 0,
                            status: (tx.confirmations || 0) >= 6 ? 'confirmed' : 'pending'
                        });

                        allNewDeposits.push({
                            address: tx.address,
                            amount: tx.amount,
                            confirmations: tx.confirmations || 0
                        });

                        totalNewDeposits++;
                    }
                }
            } catch (err) {
                console.error(`Error checking address ${address}:`, err);
            }
        }

        // Always recalculate balance to ensure accuracy
        const allTransactions = await base44.asServiceRole.entities.Transaction.filter({
            account_id: account.id
        });

        // Remove any duplicate transactions (same memo/txid)
        const seenTxids = new Set();
        const duplicates = [];
        
        for (const tx of allTransactions) {
            if (tx.memo && seenTxids.has(tx.memo)) {
                duplicates.push(tx.id);
            } else if (tx.memo) {
                seenTxids.add(tx.memo);
            }
        }

        // Delete duplicates
        for (const dupId of duplicates) {
            await base44.asServiceRole.entities.Transaction.delete(dupId);
        }

        // Recalculate balance from remaining transactions
        const remainingTxs = allTransactions.filter(tx => !duplicates.includes(tx.id));
        const newBalance = remainingTxs.reduce((sum, tx) => {
            return tx.type === 'receive' ? sum + tx.amount : sum - Math.abs(tx.amount);
        }, 0);

        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            balance: newBalance
        });

        return Response.json({
            success: true,
            totalNewDeposits,
            newDeposits: allNewDeposits,
            addressesChecked: addresses.length
        });

    } catch (error) {
        console.error('Check all wallets deposits error:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Failed to check deposits',
            totalNewDeposits: 0,
            details: error.stack
        }, { status: 500 });
    }
});