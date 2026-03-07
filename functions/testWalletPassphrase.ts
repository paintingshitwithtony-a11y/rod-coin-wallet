/**
 * testWalletPassphrase — Tests the WALLET_PASSPHRASE secret against the node.
 * Also tests a user-supplied passphrase for comparison.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function rpcCall(rpcUrl, rpcAuth, method, params) {
    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${rpcAuth}`
        },
        body: JSON.stringify({ jsonrpc: '1.0', id: method, method, params }),
        signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.result;
}

function buildRpcUrl(rpcConfig) {
    const host = rpcConfig.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    const SSL_PORTS = new Set(['443', '9443', '8443']);
    const protocol = (rpcConfig.use_ssl || rpcConfig.host.startsWith('https') || SSL_PORTS.has(String(rpcConfig.port))) ? 'https' : 'http';
    return `${protocol}://${host}:${rpcConfig.port}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

        const body = await req.json().catch(() => ({}));
        const { testPassphrase } = body;

        // Load RPC config
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (!accounts.length) return Response.json({ error: 'No wallet account' }, { status: 404 });
        const account = accounts[0];

        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (!rpcConfigs.length) return Response.json({ error: 'No active RPC config' }, { status: 500 });
        const rpcConfig = rpcConfigs[0];
        const rpcUrl = buildRpcUrl(rpcConfig);
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        const results = {};

        // Test 1: WALLET_PASSPHRASE secret
        const secretPassphrase = Deno.env.get('WALLET_PASSPHRASE') || '';
        results.wallet_passphrase_secret = { value_length: secretPassphrase.length, value_preview: secretPassphrase.slice(0, 4) + '...' };
        try {
            await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [secretPassphrase, 5]);
            results.wallet_passphrase_secret.result = 'SUCCESS — this is the correct passphrase!';
        } catch (e) {
            results.wallet_passphrase_secret.result = 'FAILED: ' + e.message;
        }

        // Test 2: user-supplied passphrase
        if (testPassphrase) {
            results.test_passphrase = { value_length: testPassphrase.length };
            try {
                await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [testPassphrase, 5]);
                results.test_passphrase.result = 'SUCCESS — this is the correct passphrase!';
            } catch (e) {
                results.test_passphrase.result = 'FAILED: ' + e.message;
            }
        }

        // Test 3: check if wallet is currently locked
        try {
            const info = await rpcCall(rpcUrl, rpcAuth, 'getwalletinfo', []);
            results.wallet_info = {
                unlocked_until: info.unlocked_until,
                encrypted: info.unlocked_until !== undefined,
                currently_unlocked: info.unlocked_until !== undefined && info.unlocked_until > 0
            };
        } catch (e) {
            results.wallet_info = { error: e.message };
        }

        return Response.json({ results });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});