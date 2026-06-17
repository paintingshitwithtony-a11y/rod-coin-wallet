import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== EMERGENCY CLEANUP - REMOVING ALL BAD CONFIGS ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const allConfigs = await base44.asServiceRole.entities.RPCConfiguration.list('', 1000);
        let deleted = 0;

        for (const config of allConfigs) {
            const portStr = String(config.port || '').trim();
            const host = String(config.host || '').trim();

            if (portStr === '8332' || portStr === '8333' || host.includes('64.188.22.190')) {
                console.log(`🗑️ DELETING bad config: ${config.name} (${host}:${portStr})`);
                await base44.asServiceRole.entities.RPCConfiguration.delete(config.id);
                deleted++;
            }
        }

        return Response.json({
            success: true,
            message: `🗑️ Successfully deleted ${deleted} bad Bitcoin configs`,
            deleted
        });

    } catch (error) {
        console.error('Emergency cleanup error:', error);
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});