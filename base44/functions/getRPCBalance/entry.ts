import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Get any active RPC config for this user
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            is_active: true
        });

        const config = configs.find(c => c.connection_status === "connected") || configs[0];

        if (!config) {
            return Response.json({ success: false, error: "No active RPC configuration found" }, { status: 400 });
        }

        const protocol = config.use_ssl ? "https" : "http";
        const rpcUrl = `${protocol}://${config.host}:${config.port}`;

        const headers = {
            "Content-Type": "application/json"
        };

        if (config.username && config.password) {
            headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
        }

        // Simple getbalance call
        const response = await fetch(rpcUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
                jsonrpc: "1.0",
                id: 1,
                method: "getbalance",
                params: []
            }),
            signal: AbortSignal.timeout(15000)
        });

        const data = await response.json();

        if (data.error) {
            return Response.json({ success: false, error: data.error.message }, { status: 500 });
        }

        return Response.json({
            success: true,
            balance: parseFloat(Number(data.result || 0).toFixed(8)),
            utxoCount: "N/A",
            source: config.name || "ROD Node"
        });

    } catch (error) {
        console.error("getRPCBalance error:", error);
        return Response.json({ 
            success: false, 
            error: error.message || "Unknown error" 
        }, { status: 500 });
    }
});