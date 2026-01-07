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

        // Retry logic with exponential backoff
        const maxRetries = 3;
        let lastError = null;
        let responseTime = 0;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const startTime = Date.now();

            try {
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

                responseTime = Date.now() - startTime;

                if (!response.ok) {
                    const errorDetail = response.status === 401 
                        ? 'Authentication failed - invalid credentials'
                        : response.status === 403
                        ? 'Access denied - check RPC permissions'
                        : response.status === 404
                        ? 'RPC endpoint not found'
                        : `HTTP ${response.status} error`;

                    lastError = errorDetail;

                    if (response.status === 401 || response.status === 403) {
                        return Response.json({
                            error: errorDetail,
                            status: 'error',
                            errorType: 'auth',
                            config: {
                                name: config.name,
                                host: config.host,
                                port: config.port,
                                connection_type: config.connection_type
                            },
                            responseTime
                        });
                    }

                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                        continue;
                    }

                    return Response.json({
                        error: errorDetail,
                        status: 'error',
                        errorType: 'http',
                        config: {
                            name: config.name,
                            host: config.host,
                            port: config.port,
                            connection_type: config.connection_type
                        },
                        responseTime
                    });
                }

                const data = await response.json();

                if (data.error) {
                    const errorMsg = data.error.message || 'Unknown RPC error';
                    const userFriendlyMsg = errorMsg.includes('Method not found')
                        ? 'RPC method not supported'
                        : errorMsg.includes('Loading')
                        ? 'Node loading blockchain data'
                        : errorMsg.includes('Rewinding')
                        ? 'Node syncing blockchain'
                        : errorMsg;

                    return Response.json({
                        error: userFriendlyMsg,
                        status: 'error',
                        errorType: 'rpc',
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
                let warnings = [];

                if (responseTime > 5000) {
                    status = 'warning';
                    warnings.push('Very slow response time');
                } else if (responseTime > 2000) {
                    status = 'warning';
                    warnings.push('Slow response time');
                }

                if (nodeInfo.verificationprogress && nodeInfo.verificationprogress < 0.99) {
                    status = 'warning';
                    warnings.push(`Syncing blockchain: ${(nodeInfo.verificationprogress * 100).toFixed(2)}%`);
                }

                return Response.json({
                    status,
                    responseTime,
                    nodeInfo,
                    warnings: warnings.length > 0 ? warnings : undefined,
                    config: {
                        name: config.name,
                        host: config.host,
                        port: config.port,
                        connection_type: config.connection_type
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (fetchError) {
                responseTime = Date.now() - startTime;
                lastError = fetchError.name === 'TimeoutError' || fetchError.message.includes('timeout')
                    ? 'Connection timeout - node unreachable or too slow'
                    : fetchError.message.includes('fetch')
                    ? 'Network error - check connection'
                    : fetchError.message.includes('DNS')
                    ? 'DNS resolution failed'
                    : fetchError.message;

                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    continue;
                }
            }
        }

        // All retries failed
        return Response.json({
            error: lastError || 'Connection failed after multiple retries',
            status: 'error',
            errorType: 'network',
            retriesAttempted: maxRetries,
            config: {
                name: config.name,
                host: config.host,
                port: config.port,
                connection_type: config.connection_type
            },
            responseTime
        });

    } catch (error) {
        console.error('RPC metrics error:', error);
        return Response.json({ 
            error: 'Failed to fetch RPC metrics',
            status: 'error',
            details: error.message 
        }, { status: 500 });
    }
});