import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { address, label } = await req.json();

        if (!address) {
            return Response.json({ error: 'Address is required' }, { status: 400 });
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
                error: 'No active RPC configuration',
                success: false
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

        // Import address into node (rescan=false for faster import, label optional)
        const importResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'importAddress',
                method: 'importaddress',
                params: [address, label || '', false]
            }),
            signal: AbortSignal.timeout(10000)
        });

        const importData = await importResponse.json();

        if (importData.error) {
            return Response.json({
                error: `RPC Error: ${importData.error.message}`,
                success: false
            }, { status: 500 });
        }

        return Response.json({
            success: true,
            message: 'Address imported successfully',
            address
        });

    } catch (error) {
        console.error('Import address error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});