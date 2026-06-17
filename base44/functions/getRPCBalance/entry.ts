import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs.find(c => c.name && c.name.toLowerCase().includes('duck')) || configs[0];

        if (!config) {
            return Response.json({ success: false, error: 'No active config' }, { status: 400 });
        }

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = protocol + '://' + config.host + ':' + config.port;

        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.username && config.password) {
            headers['Authorization'] = 'Basic ' + btoa(config.username + ':' + config.password);
        }

        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 1,
                method: 'getbalance',
                params: []
            }),
            signal: AbortSignal.timeout(15000)
        });

        const rpcData = await rpcResponse.json();

        if (rpcData.error) {
            return Response.json({ success: false, error: rpcData.error.message }, { status: 500 });
        }

        const balance = parseFloat(Number(rpcData.result || 0).toFixed(8));

        return Response.json({
            success: true,
            balance: balance,
            utxoCount: 'Real',
            note: 'Direct getbalance call'
        });

    } catch (error) {
        console.error('getRPCBalance error:', error);
        return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
    }
});