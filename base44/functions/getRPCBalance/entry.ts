import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's primary address
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) {
            return Response.json({ success: false, error: 'Wallet account not found' }, { status: 400 });
        }
        const address = accounts[0].wallet_address;

        if (!address) {
            return Response.json({ success: false, error: 'No primary address found' }, { status: 400 });
        }

        // Get active RPC config
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs[0];

        if (!config) {
            return Response.json({ success: false, error: 'No active RPC configuration' }, { status: 400 });
        }

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = `${protocol}://${config.host}:${config.port}`;

        const headers = { 'Content-Type': 'application/json' };
        if (config.username && config.password) {
            headers['Authorization'] = `Basic ${btoa(config.username + ':' + config.password)}`;
        }

        console.log('Calling RPC:', rpcUrl, 'for address:', address);

        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 1,
                method: 'listunspent',
                params: [0, 9999999, [address]]
            }),
            signal: AbortSignal.timeout(30000)
        });

        const responseText = await rpcResponse.text();
        console.log('RPC Raw Response:', responseText);

        let rpcData;
        try {
            rpcData = JSON.parse(responseText);
        } catch (parseErr) {
            return Response.json({ 
                success: false, 
                error: 'Invalid JSON from RPC node. Check your tunnel/config.' 
            }, { status: 500 });
        }

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
            utxoCount: utxos.length
        });

    } catch (error) {
        console.error('getRPCBalance FULL ERROR:', error);
        return Response.json({ success: false, error: error.message || 'Failed' }, { status: 500 });
    }
});