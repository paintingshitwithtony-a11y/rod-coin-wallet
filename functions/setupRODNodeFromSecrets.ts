import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's wallet account
        const accounts = await base44.entities.WalletAccount.filter({ 
            email: user.email 
        });

        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];

        // Get secrets from environment
        const host = Deno.env.get('ROD_RPC_HOST');
        const port = Deno.env.get('ROD_RPC_PORT');
        const username = Deno.env.get('ROD_RPC_USERNAME');
        const password = Deno.env.get('ROD_RPC_PASSWORD');

        if (!host || !port || !username || !password) {
            return Response.json({
                success: false,
                message: 'Missing ROD RPC secrets. Please set ROD_RPC_HOST, ROD_RPC_PORT, ROD_RPC_USERNAME, and ROD_RPC_PASSWORD.'
            });
        }

        // Check if this configuration already exists
        const existing = await base44.entities.RPCConfiguration.filter({
            account_id: account.id,
            host: host,
            port: port
        });

        if (existing.length > 0) {
            // Update existing config
            await base44.entities.RPCConfiguration.update(existing[0].id, {
                username,
                password,
                is_active: true
            });

            // Deactivate all other configs
            const allConfigs = await base44.entities.RPCConfiguration.filter({
                account_id: account.id
            });
            
            for (const cfg of allConfigs) {
                if (cfg.id !== existing[0].id && cfg.is_active) {
                    await base44.entities.RPCConfiguration.update(cfg.id, {
                        is_active: false
                    });
                }
            }

            // Update account
            await base44.entities.WalletAccount.update(account.id, {
                rpc_host: host,
                rpc_port: port,
                rpc_username: username,
                rpc_password: password
            });

            return Response.json({
                success: true,
                message: 'ROD Core configuration updated and activated'
            });
        }

        // Create new configuration
        const useSSL = port === '9443' || port === '443' || port === '8443';
        const newConfig = await base44.entities.RPCConfiguration.create({
            account_id: account.id,
            name: 'ROD Core (from secrets)',
            connection_type: 'rpc',
            host,
            port,
            username,
            password,
            api_key: '',
            curl_command: '',
            use_ssl: useSSL,
            is_active: true,
            connection_status: 'untested'
        });

        // Deactivate all other configs
        const allConfigs = await base44.entities.RPCConfiguration.filter({
            account_id: account.id
        });
        
        for (const cfg of allConfigs) {
            if (cfg.id !== newConfig.id && cfg.is_active) {
                await base44.entities.RPCConfiguration.update(cfg.id, {
                    is_active: false
                });
            }
        }

        // Update account
        await base44.entities.WalletAccount.update(account.id, {
            rpc_host: host,
            rpc_port: port,
            rpc_username: username,
            rpc_password: password
        });

        return Response.json({
            success: true,
            message: 'ROD Core node configured successfully'
        });

    } catch (error) {
        console.error('Setup ROD node from secrets error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});