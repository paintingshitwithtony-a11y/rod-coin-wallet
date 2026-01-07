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
                connected: false,
                error: 'Wallet not found'
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
                connected: false,
                error: 'No active RPC configuration'
            });
        }

        const config = configs[0];

        // Build RPC URL
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
        
        try {
            const rpcResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'statusCheck',
                    method: 'getblockchaininfo',
                    params: []
                }),
                signal: AbortSignal.timeout(5000)
            });

            if (!rpcResponse.ok) {
                return Response.json({ 
                    connected: false,
                    error: 'RPC connection failed'
                });
            }

            const rpcData = await rpcResponse.json();
            
            if (rpcData.error) {
                return Response.json({ 
                    connected: false,
                    error: rpcData.error.message
                });
            }

            return Response.json({ 
                connected: true,
                nodeInfo: {
                    blocks: rpcData.result.blocks,
                    chain: rpcData.result.chain,
                    version: rpcData.result.version,
                    difficulty: rpcData.result.difficulty
                }
            });

        } catch (err) {
            return Response.json({ 
                connected: false,
                error: 'RPC connection timeout or unreachable'
            });
        }

    } catch (error) {
        return Response.json({ 
            connected: false,
            error: error.message
        }, { status: 500 });
    }
});