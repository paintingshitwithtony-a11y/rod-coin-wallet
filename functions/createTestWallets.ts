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

async function encryptWIF(wif, passphrase) {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveBits']);
    const derivedKey = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode('wallet_salt'), iterations: 100000 }, passphraseKey, 256);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await crypto.subtle.importKey('raw', derivedKey, { name: 'AES-GCM' }, false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoder.encode(wif));
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

        // Get RPC config
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        const account = accounts[0];

        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (rpcConfigs.length === 0) return Response.json({ error: 'No active RPC configuration' }, { status: 500 });
        
        const rpcConfig = rpcConfigs[0];
        const rpcUrl = buildRpcUrl(rpcConfig);
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        // Create two test wallets with explicit passphrases
        const testPassphrase1 = 'TestWallet1Pass2026';
        const testPassphrase2 = 'TestWallet2Pass2026';

        const wallets = [];

        for (let i = 1; i <= 2; i++) {
            // Unlock wallet
            try {
                await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [account.wallet_passphrase, 30]);
            } catch (e) {
                console.log('Wallet already unlocked');
            }

            // Generate new address
            const address = await rpcCall(rpcUrl, rpcAuth, 'getnewaddress', []);
            
            // Dumpprivkey to get WIF
            const wif = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [address]);
            
            // Encrypt WIF with test passphrase
            const testPassphrase = i === 1 ? testPassphrase1 : testPassphrase2;
            const encryptedWIF = await encryptWIF(wif, testPassphrase);

            // Create Wallet entity
            const wallet = await base44.entities.Wallet.create({
                account_id: account.id,
                name: `Test Wallet ${i}`,
                wallet_address: address,
                public_key_hash: address,
                encrypted_private_key: encryptedWIF,
                balance: 0
            });

            wallets.push({
                id: wallet.id,
                name: wallet.name,
                address: address,
                passphrase: testPassphrase,
                encryptedKey: encryptedWIF
            });
        }

        return Response.json({
            success: true,
            sender: wallets[0],
            receiver: wallets[1],
            note: 'Use the passphrases provided for sendTransaction tests'
        });

    } catch (error) {
        console.error('createTestWallets error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});