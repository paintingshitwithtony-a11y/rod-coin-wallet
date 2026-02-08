import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { method, params = [] } = await req.json();

        if (!method) {
            return Response.json({ error: 'Method is required' }, { status: 400 });
        }

        const rpcHost = Deno.env.get('ROD_RPC_HOST') || 'localhost';
        const rpcPort = Deno.env.get('ROD_RPC_PORT') || '9766';
        const rpcUser = Deno.env.get('ROD_RPC_USERNAME');
        const rpcPass = Deno.env.get('ROD_RPC_PASSWORD');

        const auth = btoa(`${rpcUser}:${rpcPass}`);
        const rpcUrl = `http://${rpcHost}:${rpcPort}/`;

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: Date.now(),
                method,
                params
            })
        });

        if (!response.ok) {
            return Response.json(
                { error: `RPC server error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('RPC relay error:', error);
        return Response.json(
            { error: error.message || 'RPC relay failed' },
            { status: 500 }
        );
    }
});