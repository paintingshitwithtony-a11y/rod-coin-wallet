import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// When an admin activates an RPC config, push it as default to all users
// who have NOT set up their own node (no active RPC config or no configs at all).
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { config_id } = await req.json();

        if (!config_id) {
            return Response.json({ error: 'config_id is required' }, { status: 400 });
        }

        // Get the source config (the admin's activated config)
        const sourceConfig = await base44.asServiceRole.entities.RPCConfiguration.filter({ id: config_id });
        if (sourceConfig.length === 0) {
            return Response.json({ error: 'Config not found' }, { status: 404 });
        }
        const src = sourceConfig[0];

        // Get all wallet accounts
        const allAccounts = await base44.asServiceRole.entities.WalletAccount.list();

        let updated = 0;
        let skipped = 0;

        for (const account of allAccounts) {
            try {
                // Check if this account has any active RPC configs of their own
                const userConfigs = await base44.asServiceRole.entities.RPCConfiguration.filter({
                    account_id: account.id
                });

                const hasOwnActiveConfig = userConfigs.some(c => c.is_active);

                if (hasOwnActiveConfig) {
                    // User has their own node set up — skip them
                    skipped++;
                    continue;
                }

                // Deactivate any existing configs for this account
                for (const c of userConfigs) {
                    if (c.is_active) {
                        await base44.asServiceRole.entities.RPCConfiguration.update(c.id, { is_active: false });
                    }
                }

                // Check if this account already has a copy of this admin config
                const existingCopy = userConfigs.find(c =>
                    c.host === src.host &&
                    c.port === src.port &&
                    c.connection_type === src.connection_type
                );

                if (existingCopy) {
                    // Just activate the existing copy
                    await base44.asServiceRole.entities.RPCConfiguration.update(existingCopy.id, { is_active: true });
                } else {
                    // Create a new config for this user based on the admin config
                    await base44.asServiceRole.entities.RPCConfiguration.create({
                        account_id: account.id,
                        name: src.name + ' (Default)',
                        connection_type: src.connection_type,
                        host: src.host,
                        port: src.port,
                        username: src.username || '',
                        password: src.password || '',
                        api_key: src.api_key || '',
                        use_ssl: src.use_ssl || false,
                        is_active: true,
                        connection_status: src.connection_status || 'untested'
                    });
                }

                updated++;
            } catch (err) {
                console.error(`Error updating account ${account.id}:`, err);
            }
        }

        return Response.json({
            success: true,
            updated,
            skipped,
            message: `Default RPC pushed to ${updated} users (${skipped} skipped — they have their own node)`
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});