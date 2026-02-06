import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get RPC credentials from environment
        const rpcHost = Deno.env.get('ROD_RPC_HOST');
        const rpcPort = Deno.env.get('ROD_RPC_PORT');
        const rpcUsername = Deno.env.get('ROD_RPC_USERNAME');
        const rpcPassword = Deno.env.get('ROD_RPC_PASSWORD');

        if (!rpcHost || !rpcPort || !rpcUsername || !rpcPassword) {
            return Response.json({ error: 'RPC not configured', success: false }, { status: 500 });
        }

        const rpcUrl = `http://${rpcHost}:${rpcPort}`;
        const auth = btoa(`${rpcUsername}:${rpcPassword}`);

        // Get wallet info
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: '1',
                method: 'getwalletinfo',
                params: []
            })
        });

        if (!response.ok) {
            return Response.json({ 
                error: `RPC error: ${response.statusText}`, 
                success: false 
            }, { status: 500 });
        }

        const data = await response.json();

        if (data.error) {
            return Response.json({ 
                error: data.error.message, 
                success: false 
            }, { status: 500 });
        }

        if (data.result && data.result.balance !== undefined) {
            return Response.json({ 
                success: true, 
                balance: data.result.balance 
            });
        }

        return Response.json({ 
            error: 'Invalid RPC response', 
            success: false 
        }, { status: 500 });
    } catch (error) {
        console.error('getRPCBalance error:', error);
        return Response.json({ 
            error: error.message, 
            success: false 
        }, { status: 500 });
    }
});