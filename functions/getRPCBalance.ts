import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

let lastBalance = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Return cached balance if still fresh
        const now = Date.now();
        if (lastBalance !== null && (now - lastFetchTime) < CACHE_DURATION) {
            return Response.json({
                success: true,
                balance: lastBalance,
                cached: true
            });
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
        
        const balance = Math.max(0, received - sent);

        // Cache the balance
        lastBalance = balance;
        lastFetchTime = now;

        return Response.json({
            success: true,
            balance: balance,
            address: address,
            received: received,
            sent: sent
        });
    } catch (error) {
        console.error('getRPCBalance error:', error);
        // Return cached balance if fetch fails
        if (lastBalance !== null) {
            return Response.json({
                success: true,
                balance: lastBalance,
                cached: true,
                error: 'Using cached balance: ' + error.message
            });
        }
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});