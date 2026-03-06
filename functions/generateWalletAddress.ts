/**
 * generateWalletAddress — Backend-signed wallet creation.
 *
 * Architecture: Option A (Custodial/Semi-Custodial)
 * - Generates a new address via the RPC node (getnewaddress)
 * - Dumps the private key once (dumpprivkey)
 * - Encrypts it in the backend using AES-GCM
 * - Stores the encrypted key in the Wallet entity
 * - Returns only the address to the frontend — the raw WIF key is NEVER returned or logged
 *
 * The RPC node retains its own copy of the key internally (standard node behavior),
 * but the application does not rely on the node wallet for spending. All signing
 * is done in the backend using the stored encrypted key via signrawtransactionwithkey.
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

async function encryptWIF(wifKey, encryptionSecret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(encryptionSecret.padEnd(32, '0').slice(0, 32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoder.encode(wifKey));
    const combined = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
    return btoa(String.fromCharCode(...combined));
}

function buildRpcUrl(rpcConfig) {
    const host = rpcConfig.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    const protocol = (rpcConfig.port === '443' || rpcConfig.port === 443) ? 'https' : 'http';
    return `${protocol}://${host}:${rpcConfig.port}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { label, walletName, color, icon } = await req.json();

        // --- Load account ---
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        const account = accounts[0];

        // --- Load active RPC config ---
        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (rpcConfigs.length === 0) {
            return Response.json({ error: 'No active RPC configuration found' }, { status: 500 });
        }
        const rpcConfig = rpcConfigs[0];
        const rpcUrl = buildRpcUrl(rpcConfig);
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        // --- Step 1: Generate new address ---
        const address = await rpcCall(rpcUrl, rpcAuth, 'getnewaddress', [label || '']);

        // --- Step 2: Export private key (WIF) — never returned to frontend, never logged ---
        const wifKey = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [address]);

        // --- Step 3: Encrypt WIF in backend memory ---
        const encryptionSecret = Deno.env.get('WALLET_ENCRYPTION_SECRET') || 'wallet_encryption_key';
        const encryptedPrivateKey = await encryptWIF(wifKey, encryptionSecret);

        // --- Step 4: Store in Wallet entity — raw WIF is discarded after this point ---
        const wallet = await base44.entities.Wallet.create({
            account_id: account.id,
            name: walletName || label || 'New Wallet',
            wallet_address: address,
            encrypted_private_key: encryptedPrivateKey,
            balance: 0,
            is_active: false,
            wallet_type: 'standard',
            color: color || null,
            icon: icon || null
        });

        // Return only the address — key stays on the backend
        return Response.json({
            success: true,
            address,
            walletId: wallet.id,
            walletName: wallet.name
        });

    } catch (error) {
        // Never log sensitive data
        console.error('generateWalletAddress error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});