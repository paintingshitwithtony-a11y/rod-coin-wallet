import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== EMERGENCY RPC CLEANUP RUNNING ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const allConfigs = await base44.asServiceRole.entities.RPCConfiguration.list('', 1000);
        let deleted = 0;
        let fixed = 0;

        console.log(`Total configs found: ${allConfigs.length}`);

        for (const config of allConfigs) {
            const portStr = String(config.port || '').trim();
            const host = String(config.host || '').trim();
            const name = config.name || 'Unnamed';

            console.log(`Checking: ${name} | ${host}:${portStr}`);

            // === EMERGENCY DELETE BAD CONFIGS ===
            if (portStr === '8332' || portStr === '8333' || host.includes('64.188.22.190')) {
                console.log(`🗑️ DELETING bad Bitcoin config: ${name} (${host}:${portStr})`);
                await base44.asServiceRole.entities.RPCConfiguration.delete(config.id);
                deleted++;
                continue;
            }

            // Fix good configs
            let needsUpdate = false;
            const updates = {};

            if (['9766', '9767', '11999', ''].includes(portStr)) {
                updates.port = '443';
                needsUpdate = true;
            }

            const isLocal = host === 'localhost' || host === '127.0.0.1';
            if (config.use_ssl !== !isLocal) {
                updates.use_ssl = !isLocal;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await base44.asServiceRole.entities.RPCConfiguration.update(config.id, updates);
                fixed++;
            }
        }

        const message = `✅ Deleted ${deleted} bad configs | Fixed ${fixed} others`;

        console.log(message);
        return Response.json({
            success: true,
            message,
            deleted,
            fixed,
            total: allConfigs.length
        });

    } catch (error) {
        console.error('Emergency cleanup error:', error);
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});