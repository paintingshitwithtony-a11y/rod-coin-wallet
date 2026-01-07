import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the RPC request payload
        const rpcRequest = await req.json();

        // Get user's wallet account to find active RPC config
        const accounts = await base44.entities.WalletAccount.filter({ id: user.id });
        if (accounts.length === 0) {
            return Response.json({ 
                error: 'Wallet account not found' 
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
                error: 'No active RPC configuration found' 
            }, { status: 404 });
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
            headers['X-API-Key'] = config.api_key;
        } else if (config.connection_type === 'rpc') {
            const auth = btoa(`${config.username}:${config.password}`);
            headers['Authorization'] = `Basic ${auth}`;
        } else if (config.connection_type === 'curl' && config.curl_command) {
            // Parse headers from cURL command
            const headerMatches = config.curl_command.matchAll(/-H\s+['"]([^'"]+)['"]/g);
            for (const match of headerMatches) {
                const [key, value] = match[1].split(':').map(s => s.trim());
                if (key && value) headers[key] = value;
            }
        }

        // Forward the request to the actual RPC endpoint
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(rpcRequest),
            signal: AbortSignal.timeout(30000)
        });

        const data = await response.json();

        // Return the RPC response
        return Response.json(data);

    } catch (error) {
        console.error('RPC proxy error:', error);
        return Response.json({ 
            error: error.message || 'RPC proxy failed',
            jsonrpc: '1.0',
            id: null
        }, { status: 500 });
    }
});