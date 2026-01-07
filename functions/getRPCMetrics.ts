import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's wallet account
        const accounts = await base44.entities.WalletAccount.filter({ id: user.id });
        if (accounts.length === 0) {
            return Response.json({ 
                success: false,
                error: 'Wallet account not found' 
            });
        }

        const account = accounts[0];

        // Get active RPC configuration
        const configs = await base44.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (configs.length === 0) {
            return Response.json({ 
                success: false,
                error: 'No active RPC configuration' 
            });
        }

        const config = configs[0];
        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = config.connection_type === 'api' && !config.port 
            ? `${protocol}://${config.host}`
            : `${protocol}://${config.host}:${config.port}`;

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.connection_type === 'api' && config.api_key) {
            headers['X-API-Key'] = config.api_key;
        } else if (config.connection_type === 'rpc') {
            headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
        }

        // Fetch blockchain info
        const blockchainResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'metrics',
                method: 'getblockchaininfo',
                params: []
            }),
            signal: AbortSignal.timeout(10000)
        });

        const blockchainData = await blockchainResponse.json();

        if (blockchainData.error) {
            return Response.json({
                success: false,
                error: blockchainData.error.message
            });
        }

        const blockchain = blockchainData.result;

        // Fetch network info
        let networkInfo = {};
        try {
            const networkResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'network',
                    method: 'getnetworkinfo',
                    params: []
                }),
                signal: AbortSignal.timeout(10000)
            });

            const networkData = await networkResponse.json();
            if (!networkData.error) {
                networkInfo = networkData.result;
            }
        } catch (e) {
            console.error('Network info fetch failed:', e);
        }

        // Fetch peer info
        let peerCount = 0;
        try {
            const peerResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'peers',
                    method: 'getpeerinfo',
                    params: []
                }),
                signal: AbortSignal.timeout(10000)
            });

            const peerData = await peerResponse.json();
            if (!peerData.error && Array.isArray(peerData.result)) {
                peerCount = peerData.result.length;
            }
        } catch (e) {
            console.error('Peer info fetch failed:', e);
        }

        // Build comprehensive metrics
        const metrics = {
            connected: true,
            configName: config.name,
            blockHeight: blockchain.blocks,
            chain: blockchain.chain,
            difficulty: blockchain.difficulty,
            bestBlockHash: blockchain.bestblockhash,
            verificationProgress: blockchain.verificationprogress,
            chainWork: blockchain.chainwork,
            sizeOnDisk: blockchain.size_on_disk,
            isSyncing: blockchain.initialblockdownload || false,
            syncProgress: blockchain.verificationprogress || 1,
            peerCount,
            protocolVersion: networkInfo.protocolversion,
            subversion: networkInfo.subversion,
            networkActive: networkInfo.networkactive,
            localServices: networkInfo.localservices,
            warnings: blockchain.warnings || networkInfo.warnings
        };

        return Response.json({
            success: true,
            metrics
        });

    } catch (error) {
        console.error('RPC metrics error:', error);
        return Response.json({
            success: false,
            error: error.message || 'Failed to fetch RPC metrics'
        });
    }
});