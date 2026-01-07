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
                error: 'No wallet account found',
                status: 'error'
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
                error: 'No active RPC configuration found',
                status: 'error',
                config: null
            });
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

        // Measure response time
        const startTime = Date.now();

        try {
            // Fetch blockchain info
            const response = await fetch(rpcUrl, {
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

            const responseTime = Date.now() - startTime;
            const data = await response.json();

            if (data.error) {
                return Response.json({
                    error: `RPC Error: ${data.error.message}`,
                    status: 'error',
                    config: {
                        name: config.name,
                        host: config.host,
                        port: config.port,
                        connection_type: config.connection_type
                    },
                    responseTime
                });
            }

            const nodeInfo = data.result;

            // Determine status
            let status = 'connected';
            if (responseTime > 2000) {
                status = 'warning'; // Slow response
            }
            if (nodeInfo.verificationprogress < 0.99) {
                status = 'warning'; // Still syncing
            }

            return Response.json({
                status,
                responseTime,
                nodeInfo,
                config: {
                    name: config.name,
                    host: config.host,
                    port: config.port,
                    connection_type: config.connection_type
                },
                timestamp: new Date().toISOString()
            });

        } catch (fetchError) {
            return Response.json({
                error: `Connection failed: ${fetchError.message}`,
                status: 'error',
                config: {
                    name: config.name,
                    host: config.host,
                    port: config.port,
                    connection_type: config.connection_type
                },
                responseTime: Date.now() - startTime
            });
        }

    } catch (error) {
        console.error('RPC metrics error:', error);
        return Response.json({ 
            error: 'Failed to fetch RPC metrics',
            status: 'error',
            details: error.message 
        }, { status: 500 });
    }
});