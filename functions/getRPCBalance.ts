import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's wallet account
        let accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        
        if (accounts.length === 0) {
            accounts = await base44.entities.WalletAccount.filter({ id: user.id });
        }

        if (accounts.length === 0) {
            return Response.json({ 
                success: false,
                error: 'Wallet not found'
            }, { status: 404 });
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
        
        try {
            const rpcResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'getBalance',
                    method: 'getwalletinfo',
                    params: []
                }),
                signal: AbortSignal.timeout(15000)
            });

            if (!rpcResponse.ok) {
                return Response.json({ 
                    success: false,
                    error: 'RPC connection failed'
                }, { status: 500 });
            }

            const rpcData = await rpcResponse.json();
            
            if (rpcData.error) {
                return Response.json({ 
                    success: false,
                    error: rpcData.error.message
                }, { status: 500 });
            }

            if (rpcData.result && rpcData.result.balance !== undefined) {
                return Response.json({ 
                    success: true, 
                    balance: rpcData.result.balance 
                });
            }

            return Response.json({ 
                success: false,
                error: 'Invalid RPC response'
            }, { status: 500 });

        } catch (err) {
            return Response.json({ 
                success: false,
                error: 'RPC connection timeout or unreachable'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('getRPCBalance error:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Unknown error'
        }, { status: 500 });
    }
});