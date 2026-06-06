import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const editableFields = [
    'name',
    'connection_type',
    'host',
    'port',
    'username',
    'password',
    'api_key',
    'curl_command',
    'use_ssl',
    'is_active',
    'connection_status',
    'last_connected',
    'node_info'
];

function pickConfigFields(data) {
    const picked = {};
    for (const field of editableFields) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            picked[field] = data[field];
        }
    }
    return picked;
}

function isProtectedDefault(config) {
    return config.name?.endsWith('(Default)') || config.name === 'ROD Core (from secrets)';
}

async function getAccount(base44, user) {
    let accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
    if (accounts.length === 0) {
        accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: user.id });
    }
    return accounts[0] || null;
}

async function getAccountFromSession(base44, payload) {
    if (!payload.account_id || !payload.session_token) {
        return null;
    }

    const sessions = await base44.asServiceRole.entities.UserSession.filter({
        account_id: payload.account_id,
        session_token: payload.session_token
    });

    if (sessions.length === 0) {
        return null;
    }

    const session = sessions[0];
    const lastActive = session.last_active ? new Date(session.last_active).getTime() : 0;
    if (!lastActive || Date.now() - lastActive > 604800000) {
        return null;
    }

    const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: payload.account_id });
    return accounts[0] || null;
}

async function getOwnedConfig(base44, account, configId) {
    const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ id: configId });
    const config = configs[0];
    if (!config || config.account_id !== account.id) {
        return null;
    }
    return config;
}

async function updateAccountRPC(base44, accountId, config) {
    await base44.asServiceRole.entities.WalletAccount.update(accountId, {
        rpc_host: config.host || '',
        rpc_port: config.port || '',
        rpc_username: config.username || '',
        rpc_password: config.password || ''
    });
}

async function activateConfig(base44, account, configId) {
    const config = await getOwnedConfig(base44, account, configId);
    if (!config) {
        return { error: 'RPC configuration not found', status: 404 };
    }

    const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ account_id: account.id });
    for (const cfg of configs) {
        if (cfg.is_active && cfg.id !== config.id) {
            await base44.asServiceRole.entities.RPCConfiguration.update(cfg.id, { is_active: false });
        }
    }

    const updated = await base44.asServiceRole.entities.RPCConfiguration.update(config.id, { is_active: true });
    await updateAccountRPC(base44, account.id, { ...config, is_active: true });
    return { config: updated || { ...config, is_active: true } };
}

async function getAdminRPCSource(base44) {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminAccountIds = [];

    for (const admin of admins) {
        const adminAccounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: admin.email });
        for (const adminAccount of adminAccounts) {
            adminAccountIds.push(adminAccount.id);
        }
    }

    for (const accountId of adminAccountIds) {
        const activeConfigs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            account_id: accountId,
            is_active: true
        });
        const connectedConfig = activeConfigs.find(config => config.connection_status === 'connected');
        if (connectedConfig) {
            return connectedConfig;
        }
    }

    const allConfigs = await base44.asServiceRole.entities.RPCConfiguration.list('-updated_date', 100);
    return allConfigs.find(config => config.connection_status === 'connected' && isProtectedDefault(config)) || null;
}

async function cloneAdminRPCToAccount(base44, account, sourceConfig, existingConfigs) {
    for (const cfg of existingConfigs) {
        if (cfg.is_active) {
            await base44.asServiceRole.entities.RPCConfiguration.update(cfg.id, { is_active: false });
        }
    }

    const existingCopy = existingConfigs.find(cfg =>
        cfg.host === sourceConfig.host &&
        cfg.port === sourceConfig.port &&
        cfg.connection_type === sourceConfig.connection_type &&
        cfg.username === (sourceConfig.username || '')
    );

    if (existingCopy) {
        const updated = await base44.asServiceRole.entities.RPCConfiguration.update(existingCopy.id, {
            is_active: true,
            connection_status: sourceConfig.connection_status || existingCopy.connection_status || 'untested',
            node_info: sourceConfig.node_info || existingCopy.node_info || {}
        });
        const activeConfig = { ...existingCopy, is_active: true };
        await updateAccountRPC(base44, account.id, activeConfig);
        return updated || activeConfig;
    }

    const copied = await base44.asServiceRole.entities.RPCConfiguration.create({
        account_id: account.id,
        name: sourceConfig.name?.includes('(Default)') ? sourceConfig.name : `${sourceConfig.name || 'Admin RPC'} (Default)`,
        connection_type: sourceConfig.connection_type || 'rpc',
        host: sourceConfig.host,
        port: sourceConfig.port || '',
        username: sourceConfig.username || '',
        password: sourceConfig.password || '',
        api_key: sourceConfig.api_key || '',
        curl_command: sourceConfig.curl_command || '',
        use_ssl: sourceConfig.use_ssl || false,
        is_active: true,
        connection_status: sourceConfig.connection_status || 'untested',
        node_info: sourceConfig.node_info || {}
    });

    await updateAccountRPC(base44, account.id, copied);
    return copied;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        let user = null;
        try {
            user = await base44.auth.me();
        } catch (_error) {
            user = null;
        }

        let account = await getAccountFromSession(base44, payload);
        if (!account && user) {
            account = await getAccount(base44, user);
        }
        if (!account) {
            return Response.json({ error: 'Unauthorized wallet session' }, { status: 401 });
        }

        const action = payload.action;

        if (action === 'list') {
            let configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ account_id: account.id }, '-created_date');
            const hasConnectedActive = configs.some(config => config.is_active && config.connection_status === 'connected');

            if (!hasConnectedActive) {
                const adminRPC = await getAdminRPCSource(base44);
                if (adminRPC && adminRPC.account_id !== account.id) {
                    await cloneAdminRPCToAccount(base44, account, adminRPC, configs);
                    configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ account_id: account.id }, '-created_date');
                }
            }

            return Response.json({ success: true, configs });
        }

        if (action === 'create') {
            const existing = await base44.asServiceRole.entities.RPCConfiguration.filter({ account_id: account.id });
            const data = pickConfigFields(payload.config || {});
            const config = await base44.asServiceRole.entities.RPCConfiguration.create({
                ...data,
                account_id: account.id,
                is_active: existing.length === 0 || data.is_active === true,
                connection_status: data.connection_status || 'untested'
            });

            if (config.is_active) {
                await updateAccountRPC(base44, account.id, config);
            }

            return Response.json({ success: true, config });
        }

        if (action === 'update') {
            const config = await getOwnedConfig(base44, account, payload.config_id);
            if (!config) {
                return Response.json({ error: 'RPC configuration not found' }, { status: 404 });
            }

            const data = pickConfigFields(payload.config || {});
            await base44.asServiceRole.entities.RPCConfiguration.update(config.id, data);
            const updated = { ...config, ...data };

            if (updated.is_active) {
                await updateAccountRPC(base44, account.id, updated);
            }

            return Response.json({ success: true, config: updated });
        }

        if (action === 'delete') {
            const config = await getOwnedConfig(base44, account, payload.config_id);
            if (!config) {
                return Response.json({ error: 'RPC configuration not found' }, { status: 404 });
            }
            if (config.is_active) {
                return Response.json({ error: 'Active configuration cannot be deleted' }, { status: 400 });
            }
            if (isProtectedDefault(config)) {
                return Response.json({ error: 'This configuration is managed and cannot be deleted' }, { status: 403 });
            }

            await base44.asServiceRole.entities.RPCConfiguration.delete(config.id);
            return Response.json({ success: true });
        }

        if (action === 'activate') {
            const result = await activateConfig(base44, account, payload.config_id);
            if (result.error) {
                return Response.json({ error: result.error }, { status: result.status });
            }
            return Response.json({ success: true, config: result.config });
        }

        if (action === 'useDefault') {
            const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ account_id: account.id }, '-created_date');
            const ownDefaultConfig = configs.find(c => c.name && c.name.includes('(Default)'));

            if (ownDefaultConfig) {
                const result = await activateConfig(base44, account, ownDefaultConfig.id);
                if (result.error) {
                    return Response.json({ error: result.error }, { status: result.status });
                }
                return Response.json({ success: true, config: result.config });
            }

            const adminRPC = await getAdminRPCSource(base44);
            if (!adminRPC) {
                return Response.json({ error: 'No admin RPC configuration is available yet.' }, { status: 404 });
            }

            const config = await cloneAdminRPCToAccount(base44, account, adminRPC, configs);
            return Response.json({ success: true, config });
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('manageRPCConfig error:', error.message);
        return Response.json({ error: error.message || 'Failed to manage RPC configuration' }, { status: 500 });
    }
});