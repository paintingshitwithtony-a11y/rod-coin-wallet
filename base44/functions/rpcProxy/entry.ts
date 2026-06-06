import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function getAdminRPCSource(base44) {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of admins) {
        const adminAccounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: admin.email });
        for (const adminAccount of adminAccounts) {
            const activeConfigs = await base44.asServiceRole.entities.RPCConfiguration.filter({ account_id: adminAccount.id, is_active: true });
            const connectedConfig = activeConfigs.find(config => config.connection_status === 'connected');
            if (connectedConfig) return connectedConfig;
        }
    }
    const configs = await base44.asServiceRole.entities.RPCConfiguration.list('-updated_date', 100);
    return configs.find(config => config.connection_status === 'connected' && (config.name?.endsWith('(Default)') || config.name === 'ROD Core (from secrets)')) || null;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the RPC request payload
        const rpcRequest = await req.json();

        // Get this user's wallet account to find their own active RPC config
        let accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) {
            accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: user.id });
        }
        if (accounts.length === 0) {
            return Response.json({ 
                error: 'Wallet account not found' 
            }, { status: 404 });
        }

        const account = accounts[0];

        // Get active RPC configuration
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        const config = configs.find(c => c.connection_status === 'connected') || await getAdminRPCSource(base44);

        if (!config) {
            return Response.json({ 
                error: 'No connected RPC configuration found' 
            }, { status: 404 });
        }

        // Build RPC URL
        const protocol = config.use_ssl ? 'https' : 'http';
        // For API connections or when port is empty, omit the port
        const rpcUrl = !config.port || config.port === ''
            ? `${protocol}://${config.host}`
            : `${protocol}://${config.host}:${config.port}`;

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