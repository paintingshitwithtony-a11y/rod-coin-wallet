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

async function encryptWIF(wifKey, passphrase) {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveBits']);
    const derivedKey = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode('wallet_salt'), iterations: 100000 }, passphraseKey, 256);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await crypto.subtle.importKey('raw', derivedKey, { name: 'AES-GCM' }, false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoder.encode(wifKey));
    const combined = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
    return btoa(String.fromCharCode(...combined));
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

        const { label, walletName, color, icon, passphrase } = await req.json();

         // --- Validate passphrase input ---
         if (!passphrase || typeof passphrase !== 'string') {
             return Response.json({ error: 'Passphrase is required' }, { status: 400 });
         }

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

        // --- Step 1: Unlock the RPC node wallet using the NODE passphrase (from secrets) ---
        // Note: this is separate from the user's per-wallet encryption passphrase.
        // The node passphrase unlocks the node so we can call dumpprivkey.
        // The user's passphrase is used only to AES-encrypt the exported WIF key.
        const nodePassphrase = Deno.env.get('WALLET_PASSPHRASE') || '';
        try {
            await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [nodePassphrase, 30]);
        } catch (unlockErr) {
            const msg = (unlockErr.message || '').toLowerCase();
            // Only ignore if already unlocked or wallet is unencrypted — otherwise it's fatal
            if (!msg.includes('already unlocked') && !msg.includes('unencrypted') && !msg.includes('already been unlocked')) {
                return Response.json({ error: 'Failed to unlock node wallet. Please check the WALLET_PASSPHRASE secret.' }, { status: 401 });
            }
        }

        // --- Step 2: Generate new address ---
        const address = await rpcCall(rpcUrl, rpcAuth, 'getnewaddress', [label || '']);

        // --- Step 3: Export private key (WIF) — never returned to frontend, never logged ---
        const wifKey = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [address]);
        if (!wifKey || typeof wifKey !== 'string') {
            throw new Error('Failed to retrieve private key from node. Wallet not created.');
        }

        // --- Step 4: Encrypt WIF using wallet-specific passphrase ---
        const encryptedPrivateKey = await encryptWIF(wifKey, passphrase);

        // --- Step 5: Store in Wallet entity — raw WIF is discarded after this point ---
         const wallet = await base44.entities.Wallet.create({
             account_id: account.id,
             name: walletName || label || 'New Wallet',
             wallet_address: address,
             public_key_hash: address,
             encrypted_private_key: encryptedPrivateKey,
             encrypted_seed_phrase: '',
             balance: 0,
             is_active: false,
             wallet_type: 'standard',
             color: color || null,
             icon: icon || null,
             additional_addresses: []
         });

         // --- Step 6: Import address to blockchain (watch-only) ---
         try {
             const importResponse = await fetch(rpcUrl, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Basic ${rpcAuth}`
                 },
                 body: JSON.stringify({
                     jsonrpc: '1.0',
                     id: 'importAddress',
                     method: 'importaddress',
                     params: [address, label || '', false]
                 }),
                 signal: AbortSignal.timeout(10000)
             });

             const importData = await importResponse.json();
             if (importData.error && !importData.error.message?.toLowerCase().includes('already')) {
                 console.warn('importaddress warning:', importData.error.message);
             }
         } catch (importErr) {
             console.warn('importaddress error (non-fatal):', importErr.message);
         }

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