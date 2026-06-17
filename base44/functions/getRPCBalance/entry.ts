import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log('=== getRPCBalance called ===');
    console.log('Request URL:', req.url);

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        console.log('User authenticated:', !!user);

        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs[0];
        console.log('Active config found:', !!config);
        console.log('Config host/port:', config?.host, config?.port);

        if (!config) {
            return Response.json({ success: false, error: 'No active RPC configuration found' }, { status: 400 });
        }

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = `${protocol}://${config.host}:${config.port}`;
        console.log('Target RPC URL:', rpcUrl);

        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.username && config.password) {
            const auth = btoa(`${config.username}:${config.password}`);
            headers['Authorization'] = `Basic ${auth}`;
            console.log('Basic Auth header added');
        }

        const url = new URL(req.url);
        const address = url.searchParams.get('address');
        console.log('Address from query:', address);

        if (!address) {
            return Response.json({ success: false, error: 'Address parameter is required' }, { status: 400 });
        }

        const body = JSON.stringify({
            jsonrpc: '1.0',
            id: 1,
            method: 'listunspent',
            params: [0, 9999999, [address]]
        });
        console.log('RPC Request body:', body);

        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body,
            signal: AbortSignal.timeout(20000)
        });

        console.log('RPC HTTP status:', rpcResponse.status, rpcResponse.statusText);

        const rpcData = await rpcResponse.json();
        console.log('RPC Response:', JSON.stringify(rpcData, null, 2));

        if (rpcData.error) {
            console.error('RPC Error from node:', rpcData.error);
            return Response.json({ 
                success: false, 
                error: rpcData.error.message || 'RPC error' 
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