import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Get all RPC configurations with bad protocols
        const allConfigs = await base44.asServiceRole.entities.RPCConfiguration.list();
        
        let fixed = 0;
        
        for (const config of allConfigs) {
            if (config.host && config.host.match(/^https?:\/\/https?:\/\//i)) {
                // Strip the duplicate protocol
                let cleanedHost = config.host.replace(/^https?:\/\//gi, '').replace(/\/+$/, '');
                while (cleanedHost.match(/^https?:\/\//i)) {
                    cleanedHost = cleanedHost.replace(/^https?:\/\//i, '');
                }
                
                await base44.asServiceRole.entities.RPCConfiguration.update(config.id, {
                    host: cleanedHost
                });
                
                fixed++;
                console.log(`Fixed: ${config.name} from ${config.host} to ${cleanedHost}`);
            }
        }

        return Response.json({ 
            success: true,
            fixed,
            message: `Fixed ${fixed} RPC configuration(s) with duplicate protocols`
        });

    } catch (error) {
        console.error('Fix Duplicate Protocols Error:', error);
        return Response.json({ 
            error: error.message || 'Unknown error'
        }, { status: 500 });
    }
});