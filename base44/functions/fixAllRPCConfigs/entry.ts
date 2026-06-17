import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== FORCE CLEAN 'From Wallet Config' ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin required' }, { status: 403 });
        }

        const allConfigs = await base44.asServiceRole.entities.RPCConfiguration.list('', 1000);
        let deleted = 0;

        for (const config of allConfigs) {
            if (config.name && config.name.includes("From Wallet Config")) {
                console.log("Deleting 'From Wallet Config' entry");
                await base44.asServiceRole.entities.RPCConfiguration.delete(config.id);
                deleted++;
            } else if (String(config.port) === '8332' || String(config.host).includes('64.188.22.190')) {
                console.log("Deleting old Bitcoin config");
                await base44.asServiceRole.entities.RPCConfiguration.delete(config.id);
                deleted++;
            }
        }

        return Response.json({
            success: true,
            message: `✅ Removed ${deleted} bad configs including 'From Wallet Config'`,
            deleted
        });

    } catch (error) {
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});