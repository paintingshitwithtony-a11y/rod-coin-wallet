/**
 * exportPrivateKey — Exports the WIF private key for an address from the ROD node.
 * Requires passphrase to unlock the wallet first.
 * The private key is returned to the frontend transiently and NEVER stored.
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
        signal: AbortSignal.timeout(30000)
    });
    const data = await response.json();
    if (data.error) throw new Error(`RPC ${method} failed: ${data.error.message}`);
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

        const { address, passphrase } = await req.json();

        if (!address) return Response.json({ error: 'address is required' }, { status: 400 });

        // --- Load account and verify ownership ---
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        const account = accounts[0];

        let ownsAddress = account.wallet_address === address;
        if (!ownsAddress) {
            const wallets = await base44.entities.Wallet.filter({ account_id: account.id });
            ownsAddress = wallets.some(w => w.wallet_address === address);
        }
        if (!ownsAddress) {
            return Response.json({ error: 'Address does not belong to this account' }, { status: 403 });
        }

        // --- Load active RPC config ---
        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (rpcConfigs.length === 0) return Response.json({ error: 'No active RPC configuration found' }, { status: 500 });
        const rpcConfig = rpcConfigs[0];
        const rpcUrl = buildRpcUrl(rpcConfig);
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        // --- Unlock node wallet if passphrase provided ---
        if (passphrase) {
            try {
                await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [passphrase, 30]);
            } catch (unlockErr) {
                const msg = (unlockErr.message || '').toLowerCase();
                if (!msg.includes('already unlocked') && !msg.includes('unencrypted') && !msg.includes('already been unlocked')) {
                    return Response.json({ error: 'Failed to unlock node wallet. Please check your passphrase.' }, { status: 401 });
                }
            }
        }

        // --- Export the private key ---
        const wif = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [address]);

        return Response.json({ success: true, wif });

    } catch (error) {
        console.error('exportPrivateKey error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});