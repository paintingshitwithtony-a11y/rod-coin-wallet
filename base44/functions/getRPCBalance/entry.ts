import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log('=== getRPCBalance called ===');
    console.log('Full Request URL:', req.url);

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

        // Try to get address from query params
        const url = new URL(req.url);
        let address = url.searchParams.get('address');

        // Fallback: Try to get it from body (in case frontend sends POST)
        if (!address) {
            try {
                const body = await req.json();
                address = body.address || body.Address;
            } catch (e) {}
        }

        console.log('Address used:', address);

        if (!address) {
            return Response.json({ 
                success: false, 
                error: 'Address parameter is required' 
            }, { status: 400 });
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
            signal: AbortSignal.timeout(20000)
        });

        console.log('RPC Status:', rpcResponse.status);

        const rpcData = await rpcResponse.json();
        console.log('RPC Response:', JSON.stringify(rpcData));

        if (rpcData.error) {
            return Response.json({ 
                success: false, 
                error: rpcData.error.message 
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