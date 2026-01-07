import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { host, port } = await req.json();

        if (!host || !port) {
            return Response.json({ 
                error: 'Host and port are required' 
            }, { status: 400 });
        }

        try {
            // Attempt to connect to the port
            const conn = await Deno.connect({ 
                hostname: host, 
                port: parseInt(port),
                transport: "tcp"
            });
            
            conn.close();
            
            return Response.json({ 
                open: true,
                host,
                port,
                message: 'Port is open and accepting connections'
            });

        } catch (err) {
            return Response.json({ 
                open: false,
                host,
                port,
                message: err.message.includes('ECONNREFUSED') 
                    ? 'Port is closed or no service is listening'
                    : err.message.includes('timeout')
                    ? 'Connection timeout - port may be filtered'
                    : `Connection failed: ${err.message}`
            });
        }

    } catch (error) {
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});