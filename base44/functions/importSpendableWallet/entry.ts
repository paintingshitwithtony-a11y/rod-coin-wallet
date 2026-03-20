import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Encryption helpers (same scheme as generateWalletAddress) ───────────────
async function getEncryptionKey() {
    const secret = Deno.env.get('WALLET_ENCRYPTION_SECRET');
    if (!secret) throw new Error('WALLET_ENCRYPTION_SECRET is not set');
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32)),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );
    return keyMaterial;
}

async function encryptData(plaintext) {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
}

// ─── RPC helpers ─────────────────────────────────────────────────────────────
function buildRpcUrl(config) {
    const proto = config.use_ssl ? 'https' : 'http';
    return `${proto}://${config.host}:${config.port}`;
}

async function rpcCall(config, method, params = []) {
    const url = buildRpcUrl(config);
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(`${config.username}:${config.password}`)
        },
        body: JSON.stringify({ jsonrpc: '1.0', id: 'import', method, params })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    return json.result;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { private_key_wif, label } = await req.json();

        if (!private_key_wif || typeof private_key_wif !== 'string' || private_key_wif.trim().length < 50) {
            return Response.json({ error: 'A valid WIF private key is required' }, { status: 400 });
        }
        if (!label || typeof label !== 'string' || !label.trim()) {
            return Response.json({ error: 'A wallet label is required' }, { status: 400 });
        }

        // Load the user's active RPC configuration
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (!accounts.length) return Response.json({ error: 'Account not found' }, { status: 404 });
        const account = accounts[0];

        const rpcConfigs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });
        if (!rpcConfigs.length) return Response.json({ error: 'No active RPC configuration found. Please configure your node first.' }, { status: 400 });

        const rpcConfig = rpcConfigs[0];
        const rpcPassword = rpcConfig.password;

        // Verify the private key by importing it temporarily into the node and getting the address back.
        // We use `importprivkey` with rescan=false just to validate, then read the address.
        // Better: use `validateaddress` after a dummy import, but the cleanest approach is to call
        // `importprivkey` and check the result. We catch any node error as an invalid key signal.
        let derivedAddress;
        try {
            // importprivkey returns null on success; the address is accessible via `getaddressesbyaccount`
            // Safer: call dumpprivkey on a freshly imported key is not possible without knowing the address.
            // Best available approach: import the key, then call `getaddressesbyaccount` for the label.
            const importLabel = `import_${Date.now()}`;
            await rpcCall({ ...rpcConfig, password: rpcPassword }, 'importprivkey', [private_key_wif.trim(), importLabel, false]);
            // Retrieve the address that was just associated with this label
            const addresses = await rpcCall({ ...rpcConfig, password: rpcPassword }, 'getaddressesbyaccount', [importLabel]);
            if (!addresses || !addresses.length) {
                return Response.json({ error: 'Failed to derive address from private key via RPC node' }, { status: 400 });
            }
            derivedAddress = addresses[0];
        } catch (rpcErr) {
            return Response.json({ error: `RPC rejected the private key: ${rpcErr.message}` }, { status: 400 });
        }

        // Check for duplicate across account wallets and primary address
        if (account.wallet_address === derivedAddress) {
            return Response.json({ error: 'This private key belongs to your primary account address' }, { status: 409 });
        }

        const existingWallets = await base44.asServiceRole.entities.Wallet.filter({ account_id: account.id });
        const duplicate = existingWallets.find(w => w.wallet_address === derivedAddress);
        if (duplicate) {
            return Response.json({ error: 'This address is already in your wallet list' }, { status: 409 });
        }

        // Encrypt private key using the same AES-GCM scheme as generateWalletAddress
        const encryptedPrivateKey = await encryptData(private_key_wif.trim());

        // Store as a proper Wallet record
        const wallet = await base44.asServiceRole.entities.Wallet.create({
            account_id: account.id,
            name: label.trim(),
            wallet_address: derivedAddress,
            encrypted_private_key: encryptedPrivateKey,
            balance: 0,
            is_active: false,
            wallet_type: 'imported',
            color: 'from-orange-500 to-amber-600'
        });

        return Response.json({
            success: true,
            wallet_address: derivedAddress,
            wallet_id: wallet.id,
            label: label.trim(),
            wallet_type: 'imported'
        });

    } catch (error) {
        console.error('importSpendableWallet error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});