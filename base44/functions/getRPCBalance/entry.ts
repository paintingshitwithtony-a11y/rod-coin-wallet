import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Simple getbalance request
        const rpcRequest = {
            jsonrpc: "1.0",
            id: 1,
            method: "getbalance",
            params: []
        };

        // Call your existing rpcProxy
        const proxyResponse = await fetch(
            "https://rodcoinwallet.com/api/apps/695c1217b1d1db20f67a77f2/functions/rpcProxy",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": req.headers.get("Authorization") || ""
                },
                body: JSON.stringify(rpcRequest)
            }
        );

        const data = await proxyResponse.json();

        if (data.error) {
            return Response.json({ success: false, error: data.error }, { status: 500 });
        }

        const balance = parseFloat(Number(data.result || 0).toFixed(8));

        return Response.json({
            success: true,
            balance: balance,
            utxoCount: "Via Proxy",
            note: "Real balance from ROD node"
        });

    } catch (error) {
        console.error("getRPCBalance error:", error);
        return Response.json({ success: false, error: error.message || "Proxy failed" }, { status: 500 });
    }
});