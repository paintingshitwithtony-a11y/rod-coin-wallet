import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Try address from frontend call first (most common)
        let address = null;
        try {
            const body = await req.json();
            address = body.address || body.Address || body.walletAddress || body.accountAddress;
        } catch (e) {
            try {
                const text = await req.text();
                if (text && text.trim() !== '') {
                    const parsed = JSON.parse(text);
                    address = parsed.address || parsed.Address || parsed.walletAddress;
                }
            } catch (_) {}
        }

        // 2. Safe fallback: Get main wallet address for THIS user only
        if (!address) {
            try {
                const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ 
                    id: user.id || user.account_id 
                });
                
                if (accounts.length > 0 && accounts[0].wallet_address) {
                    address = accounts[0].wallet_address;
                }
            } catch (fallbackErr) {
                console.error('Fallback query failed:', fallbackErr);
            }
        }

        if (!address) {
            return Response.json({ 
                success: false, 
                error: 'No address found for this account. Please generate or import an address first.' 
            }, { status: 400 });
        }

        // Load active RPC config
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs[0];

        if (!config) {
            return Response.json({ success: false, error: 'No active RPC configuration found' }, { status: 400 });
        }

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = protocol + '://' + config.host + ':' + config.port;

        const headers = { 'Content-Type': 'application/json' };
        if (config.username && config.password) {
            const auth = btoa(config.username + ':' + config.password);
            headers['Authorization'] = 'Basic ' + auth;
        }

        // Call ROD node
        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: headers,
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
            note: 'Live UTXO balance'
        });

    } catch (error) {
        console.error('getRPCBalance error:', error);
        return Response.json({ success: false, error: error.message || 'Failed to fetch balance' }, { status: 500 });
    }
});