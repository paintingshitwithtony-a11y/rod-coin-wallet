import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const rpcHost = Deno.env.get('ROD_RPC_HOST');
        const rpcPort = Deno.env.get('ROD_RPC_PORT');
        const rpcUsername = Deno.env.get('ROD_RPC_USERNAME');
        const rpcPassword = Deno.env.get('ROD_RPC_PASSWORD');

        if (!rpcHost || !rpcPort || !rpcUsername || !rpcPassword) {
            return Response.json({ success: false, error: 'RPC not configured' }, { status: 400 });
        }

        const accounts = await base44.entities.WalletAccount.filter({ id: user.id });
        if (accounts.length === 0) {
            return Response.json({ success: false, error: 'No account found' }, { status: 404 });
        }

        const account = accounts[0];
        const address = account.wallet_address;
        const auth = btoa(`${rpcUsername}:${rpcPassword}`);
        const url = `http://${rpcHost}:${rpcPort}/`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getbalance',
                    params: []
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'RPC error');
            }

            const balance = parseFloat(data.result) || 0;

            return Response.json({
                success: true,
                balance: Math.max(0, balance),
                address: address
            });
        } catch (fetchError) {
            clearTimeout(timeout);
            throw fetchError;
        }
    } catch (error) {
        console.error('getRPCBalance error:', error.message);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});