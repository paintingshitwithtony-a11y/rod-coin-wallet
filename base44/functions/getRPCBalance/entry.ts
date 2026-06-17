import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== getRPCBalance TEST VERSION ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        return Response.json({
            success: true,
            balance: 0,
            utxoCount: 0,
            message: "Test version - RPC path fixed",
            note: "If you see this, redeploy worked"
        });

    } catch (error) {
        console.error('ERROR:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});