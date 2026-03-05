import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { method, params = [] } = await req.json();

        if (!method) {
            return Response.json({ 
                success: false, 
                error: 'Method is required' 
            }, { status: 400 });
        }

        // Get user's account and RPC configuration
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ 
            email: user.email 
        });

        if (accounts.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'Account not found' 
            }, { status: 404 });
        }

        const account = accounts[0];

        // Get active RPC configuration
        const rpcConfigs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (rpcConfigs.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'No active RPC configuration. Please configure RPC connection first.' 
            }, { status: 400 });
        }

        const rpcConfig = rpcConfigs[0];

        // Build RPC URL
        const protocol = rpcConfig.use_ssl ? 'https' : 'http';
        const auth = `${rpcConfig.username}:${rpcConfig.password}`;
        const rpcUrl = `${protocol}://${auth}@${rpcConfig.host}:${rpcConfig.port}`;

        // Execute RPC command
        let rpcResponse;
        try {
            rpcResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'rpc_console',
                    method: method,
                    params: params
                }),
                signal: AbortSignal.timeout(8000)
            });
        } catch (fetchErr) {
            // Network-level error (connection reset, timeout, unreachable, etc.)
            return Response.json({ 
                success: false, 
                error: 'Could not connect to RPC node: ' + (fetchErr.message || 'Connection failed')
            });
        }

        if (!rpcResponse.ok) {
            const errorText = await rpcResponse.text();
            return Response.json({ 
                success: false, 
                error: `RPC Error: ${errorText}` 
            });
        }

        const data = await rpcResponse.json();

        if (data.error) {
            return Response.json({ 
                success: false, 
                error: data.error.message || 'RPC command failed',
                code: data.error.code
            });
        }

        return Response.json({ 
            success: true, 
            result: data.result 
        });

    } catch (error) {
        console.error('RPC Command Error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        });
    }
});