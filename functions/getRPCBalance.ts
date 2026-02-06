import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rpcHost = Deno.env.get('ROD_RPC_HOST');
        const rpcPort = Deno.env.get('ROD_RPC_PORT');
        const rpcUsername = Deno.env.get('ROD_RPC_USERNAME');
        const rpcPassword = Deno.env.get('ROD_RPC_PASSWORD');

        if (!rpcHost || !rpcPort || !rpcUsername || !rpcPassword) {
            return Response.json({ success: false, error: 'RPC not configured' }, { status: 400 });
        }

        // Get user's main wallet address
        const accounts = await base44.entities.WalletAccount.filter({ id: user.id });
        if (accounts.length === 0) {
            return Response.json({ success: false, error: 'No account found' }, { status: 404 });
        }

        const account = accounts[0];
        const address = account.wallet_address;

        const auth = btoa(`${rpcUsername}:${rpcPassword}`);
        const url = `http://${rpcHost}:${rpcPort}/`;

        const makeRPCCall = async (method, params) => {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: method,
                    params: params
                })
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message || 'RPC error');
            }
            return data.result;
        };

        const received = await makeRPCCall('getreceivedbyaddress', [address, 0]);
        const sent = await makeRPCCall('getsentbyaddress', [address]);
        
        const balance = received - sent;

        return Response.json({
            success: true,
            balance: balance > 0 ? balance : 0,
            address: address,
            received: received,
            sent: sent
        });
    } catch (error) {
        console.error('getRPCBalance error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});