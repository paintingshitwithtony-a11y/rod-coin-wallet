import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get request body
        const body = await req.json();

        // Get user's active RPC configuration
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        }

        const account = accounts[0];

        // Get active RPC configuration
        const configs = await base44.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (configs.length === 0) {
            return Response.json({ 
                error: 'No active RPC configuration found. Please configure RPC connection first.' 
            }, { status: 400 });
        }

        const config = configs[0];

        // Build RPC URL
        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = `${protocol}://${config.host}:${config.port}`;

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add authentication based on connection type
        if (config.connection_type === 'api' && config.api_key) {
            headers['Authorization'] = `Bearer ${config.api_key}`;
        } else if (config.username && config.password) {
            const auth = btoa(`${config.username}:${config.password}`);
            headers['Authorization'] = `Basic ${auth}`;
        }

        // Forward the request to the RPC endpoint
        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        const responseData = await rpcResponse.json();

        return Response.json(responseData, {
            status: rpcResponse.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });

    } catch (error) {
        console.error('Proxy error:', error);
        return Response.json({ 
            error: error.message || 'Proxy request failed' 
        }, { status: 500 });
    }
});