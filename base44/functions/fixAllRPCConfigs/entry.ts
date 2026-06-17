import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const allConfigs = await base44.asServiceRole.entities.RPCConfiguration.list('', 1000);
        let fixed = 0;

        for (const config of allConfigs) {
            let needsUpdate = false;
            const updates = {};

            const port = String(config.port || '');
            if (port === '8332' || port === '8333') {
                updates.port = '443';
                needsUpdate = true;
            }

            const isLocalhost = config.host === 'localhost' || config.host === '127.0.0.1';
            const correctUseSSL = isLocalhost ? (config.use_ssl === true) : true;

            if (config.use_ssl !== correctUseSSL) {
                updates.use_ssl = correctUseSSL;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await base44.asServiceRole.entities.RPCConfiguration.update(config.id, updates);
                fixed++;
                console.log(`Fixed config ${config.id}: port=${updates.port || config.port}, ssl=${updates.use_ssl}`);
            }
        }

        return Response.json({
            success: true,
            message: `Fixed ${fixed} RPC configurations`,
            total: allConfigs.length,
            fixed
        });
    } catch (error) {
        console.error('Fix all RPC configs error:', error);
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});