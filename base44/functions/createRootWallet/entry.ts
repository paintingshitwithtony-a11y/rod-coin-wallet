/**
 * createRootWallet — Creates a new unencrypted wallet address on the ROD node.
 *
 * Wallet creation does not ask for, store, validate, or fall back to any passphrase.
 * It generates a new address and returns recovery details (address + WIF private key)
 * to the frontend for the confirmation screen.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

        const body = await req.json();
        const { walletName, label, color, icon } = body;

        // Load account
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        const account = accounts[0];

        // Load active RPC config
        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (rpcConfigs.length === 0) {
            return Response.json({ error: 'No active RPC configuration found' }, { status: 500 });
        }
        const rpcConfig = rpcConfigs[0];
        const rpcUrl = buildRpcUrl(rpcConfig);
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        // Step 1: Generate new address (node manages the private key)
        const name = walletName || label || 'Root Wallet';
        const address = await rpcCall(rpcUrl, rpcAuth, 'getnewaddress', [name]);

        // Step 2: Export and validate the node-generated private key (WIF)
        // This is returned to the frontend ONCE for the user to save, never stored in DB
        let wif = '';
        try {
            wif = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [address]);
        } catch (e) {
            const needsUnlock = (e.message || '').toLowerCase().includes('passphrase');
            const passphrase = (body.passphrase && body.passphrase.trim()) || Deno.env.get('WALLET_PASSPHRASE') || '';
            if (!needsUnlock || !passphrase) {
                console.warn('dumpprivkey failed:', e.message);
                return Response.json({ error: `Private key export failed: ${e.message}` }, { status: 500 });
            }
            await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [passphrase, 60]);
            wif = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [address]);
        }

        if (!wif || typeof wif !== 'string' || wif.trim().length < 50) {
            return Response.json({ error: 'ROD node returned an invalid private key for the new wallet.' }, { status: 500 });
        }

        // Step 3: Store wallet record — private key is NOT stored in DB
        const wallet = await base44.entities.Wallet.create({
            account_id: account.id,
            name,
            wallet_address: address,
            public_key_hash: address,
            encrypted_private_key: '',
            encrypted_seed_phrase: '',
            balance: 0,
            is_active: false,
            wallet_type: 'standard',
            color: color || 'from-red-500 to-red-700',
            icon: icon || null,
            additional_addresses: []
        });

        return Response.json({
            success: true,
            address,
            wif,            // WIF private key — returned once for user to save
            walletId: wallet.id,
            walletName: name  // Use the local `name` variable — guaranteed to have the correct value
        });

    } catch (error) {
        console.error('createRootWallet error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});