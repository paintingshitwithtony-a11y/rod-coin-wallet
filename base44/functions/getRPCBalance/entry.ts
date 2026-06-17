import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs[0];

        if (!config) {
            return Response.json({ success: false, error: 'No active RPC configuration found' }, { status: 400 });
        }

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = `${protocol}://${config.host}:${config.port}`;

        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.username && config.password) {
            const auth = btoa(`${config.username}:${config.password}`);
            headers['Authorization'] = `Basic ${auth}`;
        }

        // Get address from frontend
        const url = new URL(req.url);
        const address = url.searchParams.get('address');

        if (!address) {
            return Response.json({ success: false, error: 'Address parameter is required' }, { status: 400 });
        }

        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 1,
                method: 'listunspent',
                params: [0, 9999999, [address]]
            }),
            signal: AbortSignal.timeout(15000)
        });

        if (!rpcResponse.ok) {
            throw new Error(`RPC HTTP error: ${rpcResponse.status}`);
        }

        const rpcData = await rpcResponse.json();

        if (rpcData.error) {
            console.error('RPC Error:', rpcData.error);
            return Response.json({ 
                success: false, 
                error: rpcData.error.message || 'RPC call failed' 
            }, { status: 500 });
        }

        const utxos = rpcData.result || [];
        let balance = 0;
        for (let utxo of utxos) {
            balance += parseFloat(utxo.amount || 0);
        }

        return Response.json({
            success: true,
            balance: parseFloat(balance.toFixed(8)),
            utxoCount: utxos.length,
            note: `UTXO balance for ${address}`
        });

    } catch (error) {
        console.error('getRPCBalance FULL ERROR:', error);
        return Response.json({ 
            success: false, 
            error: error.message || 'Unknown error' 
        }, { status: 500 });
    }
});