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
    const sslPorts = new Set(['443', '9443', '8443']);
    const protocol = (rpcConfig.use_ssl || rpcConfig.host.startsWith('https') || sslPorts.has(String(rpcConfig.port))) ? 'https' : 'http';
    return `${protocol}://${host}:${rpcConfig.port}`;
}

function toBase64(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

async function encryptPrivateKey(wif, passphrase) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(wif)
    );

    return JSON.stringify({
        version: 'app-passphrase-v1',
        algorithm: 'AES-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: 250000,
        salt: toBase64(salt),
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(encrypted))
    });
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { walletId, appPassphrase, nodePassphrase } = await req.json();
        if (!walletId) return Response.json({ error: 'walletId is required' }, { status: 400 });
        if (!appPassphrase || String(appPassphrase).length < 8) {
            return Response.json({ error: 'Use an app encryption passphrase with at least 8 characters.' }, { status: 400 });
        }

        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        const account = accounts[0];

        const wallets = await base44.entities.Wallet.filter({ id: walletId, account_id: account.id });
        if (wallets.length === 0) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        const wallet = wallets[0];

        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (rpcConfigs.length === 0) return Response.json({ error: 'No active RPC configuration found' }, { status: 500 });
        const rpcConfig = rpcConfigs[0];
        const rpcUrl = buildRpcUrl(rpcConfig);
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        if (nodePassphrase && String(nodePassphrase).trim()) {
            try {
                await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [String(nodePassphrase).trim(), 60]);
            } catch (unlockErr) {
                const msg = (unlockErr.message || '').toLowerCase();
                if (!msg.includes('already unlocked') && !msg.includes('unencrypted') && !msg.includes('not encrypted')) {
                    return Response.json({ error: 'Failed to unlock node wallet. Check the node passphrase.' }, { status: 401 });
                }
            }
        }

        const wif = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [wallet.wallet_address]);
        if (!wif || typeof wif !== 'string' || wif.length < 50) {
            return Response.json({ error: 'ROD node returned an invalid private key.' }, { status: 500 });
        }

        const encryptedPayload = await encryptPrivateKey(wif, String(appPassphrase));
        const encryptedAt = new Date().toISOString();
        await base44.entities.Wallet.update(wallet.id, {
            encrypted_private_key: encryptedPayload,
            app_encryption_enabled: true,
            encrypted_at: encryptedAt,
            encryption_version: 'app-passphrase-v1'
        });

        return Response.json({
            success: true,
            walletId: wallet.id,
            encrypted_at: encryptedAt
        });
    } catch (error) {
        console.error('encryptWalletRecord error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});