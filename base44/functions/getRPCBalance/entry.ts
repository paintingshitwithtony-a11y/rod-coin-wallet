import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        let address = null;
        let debug = { userId: user.id, sources: [] };

        // Try frontend payload
        try {
            const body = await req.json();
            address = body.address || body.Address || body.walletAddress;
            if (address) debug.sources.push('frontend_json');
        } catch (e) {
            try {
                const text = await req.text();
                if (text) {
                    const parsed = JSON.parse(text);
                    address = parsed.address || parsed.Address || parsed.walletAddress;
                    if (address) debug.sources.push('frontend_text');
                }
            } catch (_) {}
        }

        // Fallback - read user's main address
        if (!address) {
            const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: user.id || user.account_id });
            if (accounts.length > 0) {
                address = accounts[0].wallet_address;
                debug.used_account = true;
                debug.account_data = { has_wallet_address: !!accounts[0].wallet_address };
            }
        }

        if (!address) {
            return Response.json({ 
                success: false, 
                error: 'No address found',
                debug: debug 
            }, { status: 400 });
        }

        // RPC Config & Call
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs[0];

        if (!config) {
            return Response.json({ success: false, error: 'No active RPC config' }, { status: 400 });
        }

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = protocol + '://' + config.host + ':' + config.port;

        const headers = { 'Content-Type': 'application/json' };
        if (config.username && config.password) {
            headers['Authorization'] = 'Basic ' + btoa(config.username + ':' + config.password);
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

        const rpcData = await rpcResponse.json();

        if (rpcData.error) {
            return Response.json({ success: false, error: rpcData.error.message }, { status: 500 });
        }

        const utxos = rpcData.result || [];
        let balance = 0;
        for (let i = 0; i < utxos.length; i++) {
            balance += parseFloat(utxos[i].amount || 0);
        }

        return Response.json({
            success: true,
            balance: parseFloat(balance.toFixed(8)),
            utxoCount: utxos.length,
            addressUsed: address,
            debug: debug
        });

    } catch (error) {
        console.error('getRPCBalance error:', error);
        return Response.json({ success: false, error: error.message || 'Failed' }, { status: 500 });
    }
});