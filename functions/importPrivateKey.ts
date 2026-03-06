/**
 * importPrivateKey — Securely imports an external WIF private key.
 *
 * Flow:
 *  1. Authenticate user
 *  2. Derive the address from the WIF key using the RPC node (validateaddress / importaddress won't give us pubkey,
 *     so we use dumpprivkey-in-reverse: call createrawtransaction with a dummy to get the scriptPubKey,
 *     actually we use the simplest approach: call the node's getaddressinfo after importing temporarily,
 *     but cleanest is: encode address from WIF locally or ask node via signrawtransactionwithkey test).
 *
 *  Simplest correct approach:
 *  - Encrypt the WIF immediately
 *  - Derive the P2PKH address via RPC: import into a temp wallet, get info, then remove
 *  - Actually for ROD (Bitcoin-like): address can be derived from WIF client-side via base58check
 *    but we don't have that lib in Deno easily.
 *  - Best pragmatic approach: require user to provide address + WIF, verify they match via signrawtransactionwithkey
 *    (sign a dummy tx and check it succeeds), then store encrypted.
 *
 *  Verification strategy:
 *  - createrawtransaction with a dummy output
 *  - signrawtransactionwithkey with the provided WIF + a fake prevout scriptPubKey
 *  - If signing succeeds and the address matches validateaddress result, accept the import.
 *  - This proves the key is valid without importing it into the node.
 *
 *  Actually simpler: just encrypt and store. The proof of ownership comes at spend time via sendTransaction.
 *  For import we do: validate address format, check address not already in use, encrypt key, create Wallet record.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function encryptWIF(wif, encryptionSecret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(encryptionSecret.padEnd(32, '0').slice(0, 32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoder.encode(wif));
    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);
    return btoa(String.fromCharCode(...combined));
}

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
    if (data.error) throw new Error(`RPC ${method} failed: ${data.error.message}`);
    return data.result;
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

        const body = await req.json();
        const { address, privateKey, label, color } = body;

        if (!address) return Response.json({ error: 'address is required' }, { status: 400 });
        if (!privateKey) return Response.json({ error: 'privateKey (WIF) is required' }, { status: 400 });
        if (!label) return Response.json({ error: 'label is required' }, { status: 400 });

        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Account not found' }, { status: 404 });
        const account = accounts[0];

        // Check address not already in use
        if (account.wallet_address === address) {
            return Response.json({ error: 'This is your primary account address' }, { status: 409 });
        }

        const existingWallets = await base44.entities.Wallet.filter({ account_id: account.id });
        if (existingWallets.some(w => w.wallet_address === address)) {
            return Response.json({ error: 'This address is already imported' }, { status: 409 });
        }

        // Verify the private key is valid by attempting to sign a dummy transaction via RPC
        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (rpcConfigs.length === 0) {
            return Response.json({ error: 'No active RPC configuration — cannot verify key' }, { status: 400 });
        }
        const rpcConfig = rpcConfigs[0];
        const rpcUrl = buildRpcUrl(rpcConfig);
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        // Create a dummy raw transaction to verify signing works
        // We use a known-spendable-looking input format for signing verification
        let keyVerified = false;
        try {
            const dummyTxid = '0000000000000000000000000000000000000000000000000000000000000000';
            const rawTx = await rpcCall(rpcUrl, rpcAuth, 'createrawtransaction', [
                [{ txid: dummyTxid, vout: 0 }],
                { [address]: 0.001 }
            ]);

            // Attempt to sign with the provided key — this proves the key is valid WIF
            // We use a P2PKH scriptPubKey placeholder; full verification happens at spend time
            const signResult = await rpcCall(rpcUrl, rpcAuth, 'signrawtransactionwithkey', [
                rawTx,
                [privateKey],
                [] // no prevtxs needed for format validation
            ]);
            // If the call didn't throw, the WIF format is accepted by the node
            keyVerified = true;
        } catch (verifyErr) {
            // signrawtransactionwithkey itself failing (not signing) means bad WIF
            if (verifyErr.message.includes('Invalid private key') || verifyErr.message.includes('invalid')) {
                return Response.json({ error: 'Invalid private key (WIF format rejected by node)' }, { status: 400 });
            }
            // Other errors (e.g. node connectivity) — still allow but flag
            keyVerified = false;
        }

        // Encrypt the WIF
        const encryptionSecret = Deno.env.get('WALLET_ENCRYPTION_SECRET') || 'wallet_encryption_key';
        const encryptedPrivateKey = await encryptWIF(privateKey, encryptionSecret);

        // Store as a proper Wallet record (same model as generated wallets)
        const wallet = await base44.entities.Wallet.create({
            account_id: account.id,
            name: label,
            wallet_address: address,
            encrypted_private_key: encryptedPrivateKey,
            balance: 0,
            is_active: false,
            wallet_type: 'imported',
            color: color || 'from-blue-500 to-blue-700'
        });

        return Response.json({
            success: true,
            wallet: {
                id: wallet.id,
                name: wallet.name,
                wallet_address: wallet.wallet_address,
                wallet_type: wallet.wallet_type
            },
            keyVerified
        });

    } catch (error) {
        console.error('importPrivateKey error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});