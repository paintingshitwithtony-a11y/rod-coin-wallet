import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== getRPCBalance v2 - ROBUST ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get address from request or fallback to account
        let body = {};
        try {
            const text = await req.text();
            if (text) body = JSON.parse(text);
        } catch (_) {}

        let address = body.address || body.walletAddress || body.addr;

        if (!address) {
            const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
            if (accounts.length > 0) {
                const acc = accounts[0];
                address = acc.wallet_address || (acc.additional_addresses && acc.additional_addresses[0]?.address);
            }
        }

        if (!address) {
            return Response.json({ success: false, error: "No address found for this account" }, { status: 400 });
        }

        // Get active RPC config
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ is_active: true });
        const config = configs[0];
        if (!config) {
            return Response.json({ success: false, error: 'No active RPC configuration' }, { status: 400 });
        }

        // FORCE CORRECT URL WITH WALLET PATH
        const protocol = config.use_ssl ? 'https' : 'http';
        let rpcUrl = `${protocol}://${config.host}`;
        if (config.port && config.port !== '443') rpcUrl += `:${config.port}`;
        rpcUrl += '/wallet/wallet.dat';

        console.log("RPC URL:", rpcUrl);
        console.log("Address:", address);

        const auth = btoa(`${config.username || 'roduser'}:${config.password}`);

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 1,
                method: 'listunspent',
                params: [0, 9999999, [address]]
            }),
            signal: AbortSignal.timeout(30000)
        });

        const text = await response.text();
        console.log("Raw Response:", text.substring(0, 500));

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            return Response.json({ success: false, error: 'Invalid response from node', raw: text }, { status: 502 });
        }

        if (data.error) {
            return Response.json({ success: false, error: data.error.message || JSON.stringify(data.error) }, { status: 500 });
        }

        const utxos = data.result || [];
        const balance = utxos.reduce((sum, u) => sum + parseFloat(u.amount || 0), 0);

        return Response.json({
            success: true,
            balance: parseFloat(balance.toFixed(8)),
            utxoCount: utxos.length,
            addressUsed: address,
            note: utxos.length === 0 ? "No UTXOs found yet (node may still be syncing)" : "Live balance"
        });

    } catch (error) {
        console.error('getRPCBalance ERROR:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});