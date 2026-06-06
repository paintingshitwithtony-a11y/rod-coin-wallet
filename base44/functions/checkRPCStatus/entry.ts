import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json().catch(() => ({}));
        let user = null;
        try {
            user = await base44.auth.me();
        } catch (_error) {
            user = null;
        }

        let accounts = [];
        if (payload.account_id && payload.session_token) {
            const sessions = await base44.asServiceRole.entities.UserSession.filter({
                account_id: payload.account_id,
                session_token: payload.session_token
            });
            if (sessions.length > 0) {
                const lastActive = sessions[0].last_active ? new Date(sessions[0].last_active).getTime() : 0;
                if (lastActive && Date.now() - lastActive <= 604800000) {
                    accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: payload.account_id });
                }
            }
        }

        if (accounts.length === 0 && user) {
            accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
            if (accounts.length === 0) {
                accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: user.id });
            }
        }

        if (accounts.length === 0) {
            return Response.json({ 
                connected: false,
                error: 'Unauthorized wallet session'
            });
        }

        const account = accounts[0];

        let configs;
        if (payload.config_id) {
            configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ id: payload.config_id });
            configs = configs.filter(config => config.account_id === account.id);
        } else {
            configs = await base44.asServiceRole.entities.RPCConfiguration.filter({
                account_id: account.id,
                is_active: true
            });
        }

        if (configs.length === 0) {
            return Response.json({ 
                connected: false,
                error: payload.config_id ? 'RPC configuration not found' : 'No active RPC configuration'
            });
        }

        const config = configs[0];

        // Build RPC URL — strip any protocol prefix the user may have included in host (including nested protocols)
         let cleanHost = config.host.replace(/^https?:\/\//gi, '').replace(/\/+$/, '');
         // Handle cases like "http://https://example.com"
         while (cleanHost.match(/^https?:\/\//i)) {
             cleanHost = cleanHost.replace(/^https?:\/\//i, '');
         }

         // Determine protocol: for VPS (non-localhost) always use https, for localhost respect use_ssl setting
         const isLocalhost = cleanHost === 'localhost' || cleanHost === '127.0.0.1';
         const protocol = isLocalhost ? (config.use_ssl ? 'https' : 'http') : 'https';

         const rpcUrl = !config.port || config.port === ''
             ? `${protocol}://${cleanHost}`
             : `${protocol}://${cleanHost}:${config.port}`;

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.connection_type === 'api' && config.api_key) {
            headers['X-API-Key'] = config.api_key;
        } else if (config.connection_type === 'rpc' && config.username && config.password) {
            headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
        }
        
        try {
            const rpcResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'statusCheck',
                    method: 'getblockchaininfo',
                    params: []
                }),
                signal: AbortSignal.timeout(25000)
            });

            if (!rpcResponse.ok) {
                return Response.json({ 
                    connected: false,
                    error: 'RPC connection failed'
                });
            }

            const rpcData = await rpcResponse.json();
            
            if (rpcData.error) {
                return Response.json({ 
                    connected: false,
                    error: rpcData.error.message
                });
            }

            return Response.json({ 
                connected: true,
                nodeInfo: {
                    blocks: rpcData.result.blocks,
                    chain: rpcData.result.chain,
                    version: rpcData.result.version,
                    difficulty: rpcData.result.difficulty
                }
            });

        } catch (err) {
            return Response.json({ 
                connected: false,
                error: 'RPC connection timeout or unreachable'
            });
        }

        } catch (error) {
        console.error('RPC Status Check Error:', error);
        return Response.json({ 
            connected: false,
            error: error.message || 'Unknown error'
        });
        }
        });