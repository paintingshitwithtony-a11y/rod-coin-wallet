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
                success: true,
                message: 'Address saved (RPC not configured yet)',
                address
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

        // Check HTTP status first
        if (!importResponse.ok) {
            const errorText = await importResponse.text();
            console.error('Import HTTP error:', importResponse.status, errorText);
            
            // If method not allowed, the node doesn't support importaddress
            if (importResponse.status === 405) {
                return Response.json({
                    success: true,
                    message: 'Address saved (node does not support watch-only addresses)',
                    watchOnlyNotSupported: true,
                    address
                });
            }
            
            return Response.json({
                error: `HTTP ${importResponse.status}: ${errorText.slice(0, 200)}`,
                success: false
            }, { status: 400 });
        }

        const importData = await importResponse.json();

        if (importData.error) {
            // Some errors are acceptable (e.g., address already imported)
            if (importData.error.message && importData.error.message.toLowerCase().includes('already')) {
                return Response.json({
                    success: true,
                    alreadyImported: true,
                    message: 'Address already imported',
                    address
                });
            }
            return Response.json({
                error: `RPC Error: ${importData.error.message}`,
                success: false
            }, { status: 400 });
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