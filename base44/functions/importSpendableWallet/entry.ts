import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─── Encryption helpers ─────────────────────────────────────────────────────
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

// ─── RPC helpers with wallet path fix ───────────────────────────────────────
function buildRpcUrl(config) {
    const proto = config.use_ssl ? 'https' : 'http';
    let url = `${proto}://${config.host}`;
    if (config.port && config.port !== '443') url += `:${config.port}`;
    url += '/wallet/wallet.dat';   // ← CRITICAL FIX
    return url;
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

// ─── Main handler ───────────────────────────────────────────────────────────
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

        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (!accounts.length) return Response.json({ error: 'Account not found' }, { status: 404 });

        const account = accounts[0];
        const rpcConfigs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (!rpcConfigs.length) return Response.json({ error: 'No active RPC configuration found' }, { status: 400 });

        const rpcConfig = rpcConfigs[0];

        // Verify and import private key
        let derivedAddress;
        try {
            const importLabel = `import_${Date.now()}`;
            await rpcCall({ ...rpcConfig, password: rpcConfig.password }, 'importprivkey', [private_key_wif.trim(), importLabel, false]);

            const addresses = await rpcCall({ ...rpcConfig, password: rpcConfig.password }, 'getaddressesbyaccount', [importLabel]);
            if (!addresses || !addresses.length) {
                return Response.json({ error: 'Failed to derive address' }, { status: 400 });
            }
            derivedAddress = addresses[0];
        } catch (rpcErr) {
            return Response.json({ error: `RPC rejected the private key: ${rpcErr.message}` }, { status: 400 });
        }

        // Check for duplicates...
        if (account.wallet_address === derivedAddress) {
            return Response.json({ error: 'This private key belongs to your primary address' }, { status: 409 });
        }

        const existingWallets = await base44.asServiceRole.entities.Wallet.filter({ account_id: account.id });
        const duplicate = existingWallets.find(w => w.wallet_address === derivedAddress);
        if (duplicate) {
            return Response.json({ error: 'This address is already in your wallet' }, { status: 409 });
        }

        const encryptedPrivateKey = await encryptData(private_key_wif.trim());

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