/**
 * createRootWallet — Creates a new address on the ROD node.
 *
 * Flow:
 *  1. Unlock node wallet with user-supplied passphrase (or WALLET_PASSPHRASE secret)
 *  2. Generate address via getnewaddress
 *  3. Store wallet record in DB (no private key stored)
 *  4. Return address + walletId
 *
 * NOTE: encryptwallet is NOT called here — wallet encryption is a one-time node setup
 * done manually via the RPC console. Calling encryptwallet forces the node to shut down,
 * making any follow-up RPC calls fail.
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
        const { passphrase: userPassphrase, walletName, label, color, icon } = body;

        // Use user-supplied passphrase, or fall back to the WALLET_PASSPHRASE secret
        const passphrase = (userPassphrase && userPassphrase.trim()) || Deno.env.get('WALLET_PASSPHRASE') || '';

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

        // Step 1: Unlock the node wallet if a passphrase is available
        if (passphrase) {
            try {
                await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [passphrase, 60]);
            } catch (unlockErr) {
                const msg = (unlockErr.message || '').toLowerCase();
                if (!msg.includes('already unlocked') && !msg.includes('unencrypted') && !msg.includes('already been unlocked')) {
                    return Response.json({ error: 'Failed to unlock node wallet. Please check your passphrase.' }, { status: 401 });
                }
            }
        }

        // Step 2: Generate new address (node manages the private key)
        const name = walletName || label || 'Root Wallet';
        const address = await rpcCall(rpcUrl, rpcAuth, 'getnewaddress', [name]);

        // Step 3: Store wallet record — private key stays on the node, never exported here
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
            walletId: wallet.id,
            walletName: wallet.name
        });

    } catch (error) {
        console.error('createRootWallet error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});