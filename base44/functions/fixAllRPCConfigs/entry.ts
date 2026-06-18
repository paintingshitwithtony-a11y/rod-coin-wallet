import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Get ALL RPC configurations across all accounts
        const allConfigs = await base44.asServiceRole.entities.RPCConfiguration.list('', 1000);
        
        let fixed = 0;
        
        for (const config of allConfigs) {
            const port = config.port ? String(config.port) : '';
            const isLocalhost = config.host === 'localhost' || config.host === '127.0.0.1';
            
            // For localhost: only use ssl if explicitly set. For VPS: always use https
            const correctUseSSL = isLocalhost 
                ? config.use_ssl === true 
                : true;
            
            // Only update if use_ssl needs to be changed
            if (config.use_ssl !== correctUseSSL) {
                await base44.asServiceRole.entities.RPCConfiguration.update(config.id, {
                    use_ssl: correctUseSSL
                });
                fixed++;
                console.log(`Fixed config ${config.id}: use_ssl=${correctUseSSL} (host=${config.host}, port=${port})`);
            }
        }

        return Response.json({
            success: true,
            message: `Fixed ${fixed} RPC configurations across all accounts`,
            total: allConfigs.length,
            fixed
        });

    } catch (error) {
        console.error('Fix all RPC configs error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});