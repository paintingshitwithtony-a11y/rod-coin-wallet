import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { addresses } = await req.json();

        if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
            return Response.json({ error: 'No addresses provided' }, { status: 400 });
        }

        // Get the user's account
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: user.id });
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
                error: 'No active RPC configuration. Please configure your node connection first.',
                newDeposits: [],
                totalNewDeposits: 0
            }, { status: 200 });
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
                // Get recent transactions for this address
                const listResponse = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders
                    },
                    body: JSON.stringify({
                        jsonrpc: '1.0',
                        id: 'check_deposits',
                        method: 'listtransactions',
                        params: ['*', 50, 0, true]
                    })
                });

                if (!listResponse.ok) {
                    console.error(`RPC error for ${address}:`, await listResponse.text());
                    continue;
                }

                const listData = await listResponse.json();
                if (listData.error) {
                    console.error(`RPC error for ${address}:`, listData.error);
                    continue;
                }

                const transactions = listData.result || [];
                const incomingTxs = transactions.filter(tx => 
                    tx.category === 'receive' && 
                    tx.address === address
                );

                // Check which ones are already recorded
                for (const tx of incomingTxs) {
                    const txid = tx.txid;
                    const existing = await base44.asServiceRole.entities.Transaction.filter({
                        account_id: account.id,
                        memo: txid
                    });

                    if (existing.length === 0) {
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

        // Update account balance if there were new deposits
        if (totalNewDeposits > 0) {
            const allTransactions = await base44.asServiceRole.entities.Transaction.filter({
                account_id: account.id
            });

            const newBalance = allTransactions.reduce((sum, tx) => {
                return tx.type === 'receive' ? sum + tx.amount : sum - Math.abs(tx.amount);
            }, 0);

            await base44.asServiceRole.entities.WalletAccount.update(account.id, {
                balance: newBalance
            });
        }

        return Response.json({
            success: true,
            totalNewDeposits,
            newDeposits: allNewDeposits,
            addressesChecked: addresses.length
        });

    } catch (error) {
        console.error('Check all wallets deposits error:', error);
        return Response.json({ 
            error: error.message,
            totalNewDeposits: 0
        }, { status: 500 });
    }
});