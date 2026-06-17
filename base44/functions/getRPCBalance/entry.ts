import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        let address = null;
        let debug = {
            userId: user.id || user.account_id,
            email: user.email,
            sources: []
        };

        // Try frontend payload
        try {
            const body = await req.json();
            address = body.address || body.Address || body.walletAddress || body.accountAddress;
            if (address) debug.sources.push('frontend_json');
        } catch (e) {
            try {
                const text = await req.text();
                if (text && text.trim() !== '') {
                    const parsed = JSON.parse(text);
                    address = parsed.address || parsed.Address || parsed.walletAddress;
                    if (address) debug.sources.push('frontend_text');
                }
            } catch (_) {}
        }

        // Fallbacks
        if (!address) {
            const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ 
                id: user.id || user.account_id 
            });
            debug.accountsFound = accounts.length;
            if (accounts.length > 0) {
                const acc = accounts[0];
                address = acc.wallet_address;
                debug.wallet_address_from_account = address;
                debug.additional_count = acc.additional_addresses ? acc.additional_addresses.length : 0;
            }
        }

        if (!address) {
            return Response.json({ 
                success: false, 
                error: 'No address found for this account',
                debug: debug 
            }, { status: 400 });
        }

        // RPC Config
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs[0];

        if (!config) {
            return Response.json({ success: false, error: 'No active RPC configuration found' }, { status: 400 });
        }

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = protocol + '://' + config.host + ':' + config.port;

        const headers = { 'Content-Type': 'application/json' };
        if (config.username && config.password) {
            headers['Authorization'] = 'Basic ' + btoa(config.username + ':' + config.password);
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
            signal: AbortSignal.timeout(15000)
        });

        const rpcData = await rpcResponse.json();

        if (rpcData.error) {
            return Response.json({ success: false, error: rpcData.error.message, debug }, { status: 500 });
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