import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { txid } = await req.json();

        if (!txid) {
            return Response.json({ error: 'Transaction ID required' }, { status: 400 });
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
                error: 'No active RPC configuration. Please configure your RPC connection first.'
            }, { status: 400 });
        }

        const config = configs[0];

        // Build RPC URL
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

        // Get transaction details
        const txResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'getTx',
                method: 'gettransaction',
                params: [txid]
            })
        });

        if (!txResponse.ok) {
            return Response.json({ error: 'Failed to fetch transaction from node' }, { status: 500 });
        }

        const txData = await txResponse.json();

        if (txData.error) {
            return Response.json({ error: txData.error.message }, { status: 400 });
        }

        const tx = txData.result;

        // Check if this transaction is to one of our addresses
        const userAddresses = [account.wallet_address];
        if (account.additional_addresses) {
            account.additional_addresses.forEach(addr => {
                userAddresses.push(addr.address);
            });
        }

        let depositFound = false;
        let totalAmount = 0;
        let targetAddress = '';

        if (tx.details) {
            for (const detail of tx.details) {
                if (detail.category === 'receive' && userAddresses.includes(detail.address)) {
                    depositFound = true;
                    totalAmount += detail.amount;
                    targetAddress = detail.address;
                    
                    // Check if already recorded
                    const existing = await base44.entities.Transaction.filter({
                        account_id: account.id,
                        address: detail.address,
                        amount: detail.amount,
                        memo: `TxID: ${txid}`
                    });

                    if (existing.length === 0) {
                        // Create transaction record
                        await base44.entities.Transaction.create({
                            account_id: account.id,
                            type: 'receive',
                            amount: detail.amount,
                            fee: 0,
                            address: detail.address,
                            memo: `TxID: ${txid}`,
                            confirmations: tx.confirmations || 0,
                            status: (tx.confirmations || 0) >= 6 ? 'confirmed' : 'pending'
                        });

                        // Update account balance
                        const currentBalance = account.balance || 0;
                        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
                            balance: currentBalance + detail.amount
                        });
                    }
                }
            }
        }

        if (!depositFound) {
            return Response.json({ 
                error: 'Transaction not found or not a deposit to your addresses',
                txDetails: tx
            }, { status: 400 });
        }

        return Response.json({
            success: true,
            amount: totalAmount,
            address: targetAddress,
            confirmations: tx.confirmations || 0
        });

    } catch (error) {
        console.error('Import deposit by hash error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});