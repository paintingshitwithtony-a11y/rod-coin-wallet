import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== checkPort START ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ open: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get parameters from request
        let body = {};
        try {
            const text = await req.text();
            if (text) body = JSON.parse(text);
        } catch (e) {}

        const host = body.host || 'localhost';
        let port = body.port || '9766';

        // Force ROD-friendly ports only
        const validPorts = ['443', '9766', '9767', '11999'];
        if (!validPorts.includes(String(port))) {
            port = '9766'; // fallback to safe default
        }

        console.log(`Checking port ${host}:${port}`);

        // For localhost checks we do a simple timeout test (no full RPC)
        if (host === 'localhost' || host === '127.0.0.1') {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 800);

                const response = await fetch(`http://${host}:${port}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '1.0',
                        id: 1,
                        method: 'getblockchaininfo',
                        params: []
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeout);

                const data = await response.json().catch(() => ({}));

                return Response.json({
                    open: true,
                    host,
                    port,
                    message: data.result ? 'ROD Core RPC responding' : 'Port open but no valid response',
                    status: response.status
                });

            } catch (err) {
                return Response.json({
                    open: false,
                    host,
                    port,
                    message: err.name === 'AbortError' ? 'Connection timeout' : 'Port closed or unreachable'
                });
            }
        }

        // For remote hosts (like duckdns), just return basic info
        return Response.json({
            open: true, // assume reachable since user has config
            host,
            port,
            message: 'Remote endpoint - use RPC test for full verification'
        });

    } catch (error) {
        console.error("checkPort error:", error);
        return Response.json({
            open: false,
            host: 'unknown',
            port: 'unknown',
            message: error.message
        });
    }
});