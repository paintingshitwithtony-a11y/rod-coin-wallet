import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== rpcProxy START ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get active RPC configuration
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ 
            is_active: true 
        });
        
        const config = configs[0];
        if (!config) {
            return Response.json({ error: 'No active RPC configuration found' }, { status: 400 });
        }

        console.log("rpcProxy using config:", config.name, config.host, config.port);

        // Build RPC URL with ROD Core named wallet support
        const protocol = (config.use_ssl || config.port === '443') ? 'https' : 'http';
        let rpcUrl = `${protocol}://${config.host}`;
        
        if (config.port && config.port !== '80' && config.port !== '443') {
            rpcUrl += `:${config.port}`;
        }

        // Critical for ROD Core: use named wallet path
        if (!rpcUrl.includes('/wallet/')) {
            rpcUrl += '/wallet/wallet.dat';
        }

        console.log("Final RPC URL:", rpcUrl);

        // Read the original request body
        let body;
        try {
            const text = await req.text();
            body = JSON.parse(text);
        } catch (e) {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const rpcAuth = btoa(`${config.username || 'roduser'}:${config.password || ''}`);

        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${rpcAuth}`
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000)
        });

        const responseText = await rpcResponse.text();
        console.log("rpcProxy raw response:", responseText.substring(0, 500));

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            return Response.json({ 
                error: 'Invalid response from RPC node',
                raw: responseText 
            }, { status: 502 });
        }

        return Response.json(data);

    } catch (error) {
        console.error("rpcProxy FULL ERROR:", error);
        return Response.json({ 
            error: error.message || 'Proxy error',
            details: error.toString()
        }, { status: 500 });
    }
});