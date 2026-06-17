import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get primary address from user's WalletAccount
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ 
            id: user.id || user.account_id 
        });

        if (accounts.length === 0) {
            return Response.json({ success: false, error: 'Wallet account not found' }, { status: 400 });
        }

        const address = accounts[0].wallet_address;

        if (!address) {
            return Response.json({ success: false, error: 'No primary wallet address found' }, { status: 400 });
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

        // Call ROD node
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

        const rpcData = await rpcResponse.json();

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
            addressUsed: address
        });

    } catch (error) {
        console.error('getRPCBalance error:', error);
        return Response.json({ success: false, error: error.message || 'Failed to fetch balance' }, { status: 500 });
    }
});