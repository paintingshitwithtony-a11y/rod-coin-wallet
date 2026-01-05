import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get RPC credentials
        const rpcHost = Deno.env.get('ROD_RPC_HOST');
        const rpcPort = Deno.env.get('ROD_RPC_PORT');
        const rpcUser = Deno.env.get('ROD_RPC_USERNAME');
        const rpcPass = Deno.env.get('ROD_RPC_PASSWORD');

        if (!rpcHost || !rpcPort || !rpcUser || !rpcPass) {
            return Response.json({ 
                connected: false,
                error: 'RPC credentials not configured'
            });
        }

        // Test RPC connection
        const rpcUrl = `http://${rpcHost}:${rpcPort}`;
        const rpcAuth = btoa(`${rpcUser}:${rpcPass}`);
        
        try {
            const rpcResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${rpcAuth}`
                },
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'statusCheck',
                    method: 'getblockchaininfo',
                    params: []
                }),
                signal: AbortSignal.timeout(5000)
            });

            if (!rpcResponse.ok) {
                return Response.json({ 
                    connected: false,
                    error: 'RPC connection failed'
                });
            }

            const rpcData = await rpcResponse.json();
            
            if (rpcData.error) {
                return Response.json({ 
                    connected: false,
                    error: rpcData.error.message
                });
            }

            return Response.json({ 
                connected: true,
                blockHeight: rpcData.result.blocks,
                chain: rpcData.result.chain
            });

        } catch (err) {
            return Response.json({ 
                connected: false,
                error: 'RPC connection timeout or unreachable'
            });
        }

    } catch (error) {
        return Response.json({ 
            connected: false,
            error: error.message
        }, { status: 500 });
    }
});