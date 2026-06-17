import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get address
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) {
            return Response.json({ success: false, error: 'Wallet account not found' }, { status: 400 });
        }

        const address = accounts[0].wallet_address;
        if (!address) {
            return Response.json({ success: false, error: 'No wallet_address in account' }, { status: 400 });
        }

        // Get active config
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs[0];

        if (!config) {
            return Response.json({ success: false, error: 'No active RPC config' }, { status: 400 });
        }

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = `${protocol}://${config.host}:${config.port}`;

        const headers = { 'Content-Type': 'application/json' };
        if (config.username && config.password) {
            headers['Authorization'] = `Basic ${btoa(config.username + ':' + config.password)}`;
        }

        // RPC Call
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

        if (!rpcResponse.ok) {
            return Response.json({ success: false, error: `HTTP ${rpcResponse.status}` }, { status: 500 });
        }

        const rpcData = await rpcResponse.json();

        if (rpcData.error) {
            return Response.json({ success: false, error: rpcData.error.message || 'RPC error' }, { status: 500 });
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
        return Response.json({ 
            success: false, 
            error: error.message || 'Internal error' 
        }, { status: 500 });
    }
});