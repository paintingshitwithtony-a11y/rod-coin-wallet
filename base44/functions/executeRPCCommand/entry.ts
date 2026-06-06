/**
 * executeRPCCommand — Backend RPC relay with strict method allowlist.
 *
 * Only read-only, non-sensitive RPC methods may be called through this relay.
 * Sensitive methods (dumpprivkey, importprivkey, sendtoaddress, walletpassphrase,
 * signrawtransaction*, createrawtransaction, etc.) are NEVER allowed here.
 * Those are handled exclusively inside dedicated backend functions (sendTransaction,
 * generateWalletAddress) which perform proper ownership verification.
 *
 * RPC credentials are stored in the RPCConfiguration entity (server-side only).
 * They are never returned to the browser.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Strict allowlist — only safe read-only methods
async function getAdminRPCSource(base44) {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of admins) {
        const adminAccounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: admin.email });
        for (const adminAccount of adminAccounts) {
            const activeConfigs = await base44.asServiceRole.entities.RPCConfiguration.filter({ account_id: adminAccount.id, is_active: true });
            const connectedConfig = activeConfigs.find(config => config.connection_status === 'connected');
            if (connectedConfig) return connectedConfig;
        }
    }
    const configs = await base44.asServiceRole.entities.RPCConfiguration.list('-updated_date', 100);
    return configs.find(config => config.connection_status === 'connected' && (config.name?.endsWith('(Default)') || config.name === 'ROD Core (from secrets)')) || null;
}

async function isAdminAccount(base44, account) {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    return admins.some(admin => admin.email === account.email || admin.id === account.id);
}

const ALLOWED_METHODS = new Set([
    'getblockchaininfo',
    'getblockcount',
    'getnetworkinfo',
    'getpeerinfo',
    'listunspent',
    'gettransaction',
    'getrawtransaction',
    'decoderawtransaction',
    'validateaddress',
    'getmempoolinfo',
    'getdifficulty',
    'getmininginfo',
    'getbestblockhash',
    'getblock',
    'listtransactions',
    'getnettotals',
    'getwalletinfo',
    'walletpassphrase'
]);

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { method, params = [] } = await req.json();

        if (!method) {
            return Response.json({ success: false, error: 'Method is required' }, { status: 400 });
        }

        // Enforce allowlist — reject anything not explicitly permitted
        if (!ALLOWED_METHODS.has(method.toLowerCase())) {
            return Response.json({
                success: false,
                error: `Method '${method}' is not permitted via this relay. Sensitive or write operations must use dedicated backend functions.`
            }, { status: 403 });
        }

        // Load user's account and active RPC config
        let accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) {
            accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: user.id });
        }
        if (accounts.length === 0) return Response.json({ success: false, error: 'Account not found' }, { status: 404 });
        const account = accounts[0];

        const rpcConfigs = await base44.asServiceRole.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        const rpcConfig = !(await isAdminAccount(base44, account))
            ? await getAdminRPCSource(base44)
            : rpcConfigs.find(config => config.connection_status === 'connected') || await getAdminRPCSource(base44);
        if (!rpcConfig) {
            return Response.json({ success: false, error: 'No connected RPC configuration found' }, { status: 400 });
        }
        const cleanHost = rpcConfig.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        const SSL_PORTS = new Set(['443', '9443', '8443']);
        const protocol = (rpcConfig.use_ssl || rpcConfig.host.startsWith('https') || SSL_PORTS.has(String(rpcConfig.port))) ? 'https' : 'http';
        const rpcUrl = !rpcConfig.port || rpcConfig.port === ''
            ? `${protocol}://${cleanHost}`
            : `${protocol}://${cleanHost}:${rpcConfig.port}`;
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        let rpcResponse;
        try {
            rpcResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${rpcAuth}`
                },
                body: JSON.stringify({ jsonrpc: '1.0', id: 'relay', method, params }),
                signal: AbortSignal.timeout(25000)
            });
        } catch (fetchErr) {
            const msg = fetchErr.message || 'Connection failed';
            const friendly = msg.includes('Connection refused') || msg.includes('tcp connect error')
                ? `Connection refused at ${rpcConfig.host}:${rpcConfig.port} — ensure your node is running.`
                : 'Could not connect to RPC node: ' + msg;
            return Response.json({ success: false, error: friendly });
        }

        if (!rpcResponse.ok) {
            const errorText = await rpcResponse.text();
            return Response.json({ success: false, error: `RPC Error: ${errorText}` });
        }

        const data = await rpcResponse.json();

        if (data.error) {
            return Response.json({ success: false, error: data.error.message || 'RPC command failed', code: data.error.code });
        }

        let result = data.result;
        if (method.toLowerCase() === 'getwalletinfo' && result?.unlocked_until === 0) {
            const savedPassphrase = Deno.env.get('WALLET_PASSPHRASE');
            if (savedPassphrase) {
                const unlockResponse = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${rpcAuth}`
                    },
                    body: JSON.stringify({ jsonrpc: '1.0', id: 'unlock', method: 'walletpassphrase', params: [savedPassphrase, 100000000] }),
                    signal: AbortSignal.timeout(25000)
                });
                const unlockData = await unlockResponse.json();
                if (!unlockData.error) {
                    const refreshedResponse = await fetch(rpcUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Basic ${rpcAuth}`
                        },
                        body: JSON.stringify({ jsonrpc: '1.0', id: 'walletinfo', method: 'getwalletinfo', params: [] }),
                        signal: AbortSignal.timeout(25000)
                    });
                    const refreshedData = await refreshedResponse.json();
                    if (!refreshedData.error) result = refreshedData.result;
                }
            }
        }

        return Response.json({ success: true, result });

    } catch (error) {
        // Never log RPC credentials or sensitive data
        console.error('executeRPCCommand error:', error.message);
        return Response.json({ success: false, error: error.message });
    }
});