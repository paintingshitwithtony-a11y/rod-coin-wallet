import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log('=== getRPCBalance START ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Content-Length:', req.headers.get('Content-Length'));

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs[0];

        if (!config) {
            return Response.json({ success: false, error: 'No active RPC config' }, { status: 400 });
        }

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = `${protocol}://${config.host}:${config.port}`;

        const headers = { 'Content-Type': 'application/json' };
        if (config.username && config.password) {
            const auth = btoa(`${config.username}:${config.password}`);
            headers['Authorization'] = `Basic ${auth}`;
        }

        // === ROBUST ADDRESS EXTRACTION ===
        let address = null;

        // 1. From query params
        const url = new URL(req.url);
        address = url.searchParams.get('address');

        // 2. From body (most likely)
        if (!address) {
            try {
                const bodyText = await req.text();
                console.log('📦 Raw body received:', bodyText);

                if (bodyText && bodyText.trim() !== '') {
                    const body = JSON.parse(bodyText);
                    console.log('📦 Parsed body:', body);
                    
                    address = body.address || body.Address || body.walletAddress || body.accountAddress;
                }
            } catch (parseErr) {
                console.log('Body parse error:', parseErr.message);
            }
        }

        console.log('Final address used:', address);

        if (!address) {
            return Response.json({ 
                success: false, 
                error: 'Address parameter is required' 
            }, { status: 400 });
        }

        // === RPC CALL ===
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

        console.log('RPC HTTP Status:', rpcResponse.status);

        const rpcData = await rpcResponse.json();
        console.log('RPC Data:', JSON.stringify(rpcData));

        if (rpcData.error) {
            return Response.json({ success: false, error: rpcData.error.message }, { status: 500 });
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
        console.error('💥 FULL ERROR:', error);
        return Response.json({ 
            success: false, 
            error: error.message || 'Unknown error' 
        }, { status: 500 });
    }
});