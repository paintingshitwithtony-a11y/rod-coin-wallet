import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const allConfigs = await base44.asServiceRole.entities.RPCConfiguration.list('', 1000);
        let deleted = 0;
        let fixed = 0;

        for (const config of allConfigs) {
            const portStr = String(config.port || '').trim();
            const host = String(config.host || '').trim();

            // Detect and DELETE bad old Bitcoin configs
            if (portStr === '8332' || portStr === '8333' || host.includes('64.188.22.190')) {
                console.log(`🗑️ Deleting bad config: ${config.name} (${host}:${portStr})`);
                await base44.asServiceRole.entities.RPCConfiguration.delete(config.id);
                deleted++;
                continue;
            }

            // Fix good configs (force ROD settings)
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

        return Response.json({
            success: true,
            message: `✅ Cleaned ${deleted} bad configs | Fixed ${fixed} others`,
            deleted,
            fixed,
            total: allConfigs.length
        });

    } catch (error) {
        console.error('FixAllRPCConfigs error:', error);
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});