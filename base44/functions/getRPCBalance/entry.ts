import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const rpcRequest = {
            jsonrpc: "1.0",
            id: 1,
            method: "getbalance",
            params: []
        };

        const relayResponse = await fetch(
            "https://rodcoinwallet.com/api/apps/695c1217b1d1db20f67a77f2/functions/rpcRelay",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": req.headers.get("Authorization") || req.headers.get("authorization") || ""
                },
                body: JSON.stringify(rpcRequest)
            }
        );

        if (!relayResponse.ok) {
            return Response.json({ 
                success: false, 
                error: `Relay HTTP error: ${relayResponse.status}` 
            }, { status: 500 });
        }

        const data = await relayResponse.json();

        if (data.error) {
            return Response.json({ success: false, error: data.error }, { status: 500 });
        }

        const balance = parseFloat(Number(data.result || 0).toFixed(8));

        return Response.json({
            success: true,
            balance: balance,
            utxoCount: "Via rpcRelay",
            note: "Real balance from ROD node"
        });

    } catch (error) {
        console.error("getRPCBalance error:", error);
        return Response.json({ 
            success: false, 
            error: error.message || "Unknown error" 
        }, { status: 500 });
    }
});