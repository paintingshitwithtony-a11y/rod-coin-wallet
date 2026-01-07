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

        for (let attempt = 0; attempt < maxRetries; attempt++) {
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
                    signal: AbortSignal.timeout(10000)
                });

                if (!rpcResponse.ok) {
                    const errorDetail = rpcResponse.status === 401 
                        ? 'Authentication failed - check username/password or API key'
                        : rpcResponse.status === 403
                        ? 'Access forbidden - check RPC permissions'
                        : rpcResponse.status === 404
                        ? 'RPC endpoint not found - verify host and port'
                        : `HTTP ${rpcResponse.status} error`;

                    lastError = errorDetail;

                    if (rpcResponse.status === 401 || rpcResponse.status === 403) {
                        // Don't retry auth errors
                        return Response.json({ 
                            connected: false,
                            error: errorDetail,
                            errorType: 'auth'
                        });
                    }

                    // Wait before retry with exponential backoff
                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                        continue;
                    }

                    return Response.json({ 
                        connected: false,
                        error: errorDetail,
                        errorType: 'http'
                    });
                }

                const rpcData = await rpcResponse.json();

                if (rpcData.error) {
                    const errorMsg = rpcData.error.message || 'Unknown RPC error';
                    const userFriendlyMsg = errorMsg.includes('Method not found')
                        ? 'RPC method not supported by node - ensure ROD Core is running'
                        : errorMsg.includes('Loading')
                        ? 'Node is loading blockchain data - please wait'
                        : errorMsg.includes('Rewinding')
                        ? 'Node is syncing blockchain - please wait'
                        : `RPC error: ${errorMsg}`;

                    return Response.json({ 
                        connected: false,
                        error: userFriendlyMsg,
                        errorType: 'rpc',
                        rawError: errorMsg
                    });
                }

                // Success!
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
                lastError = err.name === 'TimeoutError' || err.message.includes('timeout')
                    ? 'Connection timeout - node may be slow or unreachable'
                    : err.message.includes('fetch')
                    ? 'Network error - check internet connection and firewall'
                    : err.message.includes('DNS')
                    ? 'DNS resolution failed - check hostname'
                    : `Connection failed: ${err.message}`;

                // Wait before retry with exponential backoff
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    continue;
                }
            }
        }

        // All retries failed
        return Response.json({ 
            connected: false,
            error: lastError || 'Connection failed after multiple attempts',
            errorType: 'network',
            retriesAttempted: maxRetries
        });

    } catch (error) {
        return Response.json({ 
            connected: false,
            error: error.message
        }, { status: 500 });
    }
});