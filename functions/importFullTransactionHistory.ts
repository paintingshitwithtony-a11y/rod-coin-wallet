import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
                error: 'No active RPC configuration'
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
        
        const wallets = await base44.entities.Wallet.filter({ account_id: account.id });
        wallets.forEach(wallet => {
            if (!addresses.includes(wallet.wallet_address)) {
                addresses.push(wallet.wallet_address);
            }
        });

        // Build RPC URL
        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = !config.port || config.port === ''
            ? `${protocol}://${config.host}`
            : `${protocol}://${config.host}:${config.port}`;
        
        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.connection_type === 'api' && config.api_key) {
            headers['X-API-Key'] = config.api_key;
        } else if (config.connection_type === 'rpc' && config.username && config.password) {
            headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
        }

        let imported = 0;
        let skipped = 0;

        // Import ALL transactions (10000 limit)
        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'importFullHistory',
                method: 'listtransactions',
                params: ['*', 10000, 0, true]
            })
        });

        if (!rpcResponse.ok) {
            return Response.json({ 
                error: 'RPC request failed',
                status: rpcResponse.status
            }, { status: 500 });
        }

        const rpcData = await rpcResponse.json();
        
        if (!rpcData.result) {
            return Response.json({ 
                error: 'No transactions found'
            });
        }

        // Filter for receive transactions to our addresses
        const receiveTxs = rpcData.result.filter(tx => 
            tx.category === 'receive' && 
            addresses.includes(tx.address)
        );

        // Process each transaction
        for (const tx of receiveTxs) {
            // Check if already exists by txid in memo
            const existing = await base44.entities.Transaction.filter({
                account_id: account.id,
                address: tx.address,
                amount: tx.amount
            });

            const alreadyExists = existing.some(existingTx => 
                existingTx.memo?.includes(tx.txid)
            );

            if (alreadyExists) {
                skipped++;
                continue;
            }

            // Find which wallet this belongs to
            const wallets = await base44.entities.Wallet.filter({
                account_id: account.id,
                wallet_address: tx.address
            });
            const walletId = wallets.length > 0 ? wallets[0].id : null;
            
            await base44.entities.Transaction.create({
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

            imported++;
        }

        return Response.json({ 
            success: true,
            imported,
            skipped,
            totalFound: receiveTxs.length,
            addressesScanned: addresses.length
        });

    } catch (error) {
        console.error('Import full history error:', error);
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});