/**
 * sendTransaction — UTXO-based node-signed transaction function.
 *
 * Architecture: Node-Custodial (Option 1)
 * The node manages all private keys internally.
 * The backend unlocks the node wallet server-side using WALLET_PASSPHRASE secret,
 * then uses signrawtransactionwithwallet — no key export or storage needed.
 *
 * Flow:
 *  1. Authenticate user
 *  2. Verify ownership of fromAddress
 *  3. listunspent filtered to fromAddress only
 *  4. Largest-first UTXO selection to cover amount + fee
 *  5. Calculate change → back to fromAddress (or absorbed if dust)
 *  6. createrawtransaction with explicit inputs and outputs
 *  7. Unlock node wallet with WALLET_PASSPHRASE (server-side secret)
 *  8. signrawtransactionwithwallet (node signs internally)
 *  9. sendrawtransaction
 * 10. Store tx record, return txid + metadata
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DUST_THRESHOLD = 0.00000546; // outputs below this are absorbed into fee

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

// Convert a raw 32-byte hex private key to WIF (Wallet Import Format)
// Uses version byte 0x80 (mainnet). ROD is Bitcoin-derived so this applies.
function hexToWIF(hexKey) {
    const versionByte = 0x80;
    const compressionFlag = 0x01; // compressed public key

    // Decode hex to bytes
    const keyBytes = new Uint8Array(hexKey.match(/.{1,2}/g).map(b => parseInt(b, 16)));

    // Payload: version + key + compression flag
    const payload = new Uint8Array(1 + 32 + 1);
    payload[0] = versionByte;
    payload.set(keyBytes, 1);
    payload[33] = compressionFlag;

    // Double SHA-256 checksum
    const checksum = doubleSha256(payload).slice(0, 4);

    // Final: payload + checksum
    const wifBytes = new Uint8Array(payload.length + 4);
    wifBytes.set(payload);
    wifBytes.set(checksum, payload.length);

    return base58Encode(wifBytes);
}

function doubleSha256(data) {
    // Synchronous SHA-256 using a simple JS implementation
    return sha256(sha256(data));
}

// Minimal SHA-256 implementation (no external deps)
function sha256(data) {
    const K = [
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const msg = Array.from(data);
    const len = msg.length * 8;
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    for (let i = 7; i >= 0; i--) msg.push((len / Math.pow(2, i * 8)) & 0xff);
    const w = new Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let i = 0; i < msg.length; i += 64) {
        for (let j = 0; j < 16; j++) w[j] = (msg[i+j*4]<<24)|(msg[i+j*4+1]<<16)|(msg[i+j*4+2]<<8)|msg[i+j*4+3];
        for (let j = 16; j < 64; j++) {
            const s0 = rotr(w[j-15],7)^rotr(w[j-15],18)^(w[j-15]>>>3);
            const s1 = rotr(w[j-2],17)^rotr(w[j-2],19)^(w[j-2]>>>10);
            w[j] = (w[j-16]+s0+w[j-7]+s1)|0;
        }
        let [a,b,c,d,e,f,g,h] = H;
        for (let j = 0; j < 64; j++) {
            const S1 = rotr(e,6)^rotr(e,11)^rotr(e,25);
            const ch = (e&f)^(~e&g);
            const temp1 = (h+S1+ch+K[j]+w[j])|0;
            const S0 = rotr(a,2)^rotr(a,13)^rotr(a,22);
            const maj = (a&b)^(a&c)^(b&c);
            const temp2 = (S0+maj)|0;
            h=g; g=f; f=e; e=(d+temp1)|0; d=c; c=b; b=a; a=(temp1+temp2)|0;
        }
        H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0;
        H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
    }
    return new Uint8Array(H.flatMap(n => [(n>>>24)&0xff,(n>>>16)&0xff,(n>>>8)&0xff,n&0xff]));
}

function base58Encode(bytes) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join(''));
    let result = '';
    const base = BigInt(58);
    while (num > 0n) {
        result = ALPHABET[Number(num % base)] + result;
        num = num / base;
    }
    for (const byte of bytes) {
        if (byte === 0) result = '1' + result;
        else break;
    }
    return result;
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
        const { fromAddress, recipient, amount, fee, memo, passphrase, privateKey } = body;

        // --- Input validation ---
        if (!fromAddress) return Response.json({ error: 'fromAddress is required' }, { status: 400 });
        if (!recipient) return Response.json({ error: 'recipient is required' }, { status: 400 });
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return Response.json({ error: 'amount must be a positive number' }, { status: 400 });
        }
        if (fee === undefined || fee === null || isNaN(parseFloat(fee)) || parseFloat(fee) < 0) {
            return Response.json({ error: 'fee must be a non-negative number' }, { status: 400 });
        }


        const sendAmount = parseFloat((+amount).toFixed(8));
        const feeAmount = parseFloat((+fee).toFixed(8));
        const totalNeeded = parseFloat((sendAmount + feeAmount).toFixed(8));

        // --- Load account ---
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        const account = accounts[0];

        // --- Verify ownership of fromAddress ---
        let ownsAddress = account.wallet_address === fromAddress;
        if (!ownsAddress) {
            const wallets = await base44.entities.Wallet.filter({ account_id: account.id });
            ownsAddress = wallets.some(w => w.wallet_address === fromAddress);
        }
        if (!ownsAddress) {
            return Response.json({ error: 'fromAddress does not belong to this account' }, { status: 403 });
        }

        // --- Load active RPC config ---
        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (rpcConfigs.length === 0) {
            return Response.json({ error: 'No active RPC configuration found' }, { status: 500 });
        }
        const rpcConfig = rpcConfigs[0];
        const rpcUrl = buildRpcUrl(rpcConfig);
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        // --- Step 4: Load UTXOs, filter to fromAddress only ---
        const allUtxos = await rpcCall(rpcUrl, rpcAuth, 'listunspent', [0, 9999999, [fromAddress]]);
        const utxos = allUtxos.filter(u => u.address === fromAddress);

        if (!utxos || utxos.length === 0) {
            return Response.json({
                error: `No spendable UTXOs found for address ${fromAddress}`
            }, { status: 400 });
        }

        // --- Step 5: Spendable balance from UTXOs ---
        const spendableBalance = parseFloat(utxos.reduce((sum, u) => sum + u.amount, 0).toFixed(8));
        if (spendableBalance < totalNeeded) {
            return Response.json({
                error: 'Insufficient funds',
                spendableBalance,
                required: totalNeeded
            }, { status: 400 });
        }

        // --- Step 6: Largest-first coin selection ---
        const sortedUtxos = [...utxos].sort((a, b) => b.amount - a.amount);
        const selectedUtxos = [];
        let selectedTotal = 0;
        for (const utxo of sortedUtxos) {
            selectedUtxos.push(utxo);
            selectedTotal += utxo.amount;
            if (selectedTotal >= totalNeeded) break;
        }
        selectedTotal = parseFloat(selectedTotal.toFixed(8));

        // --- Step 7: Calculate change ---
        let change = parseFloat((selectedTotal - totalNeeded).toFixed(8));
        let effectiveFee = feeAmount;
        if (change > 0 && change <= DUST_THRESHOLD) {
            // Absorb dust change into fee
            effectiveFee = parseFloat((feeAmount + change).toFixed(8));
            change = 0;
        }

        // --- Step 8: Build inputs and outputs ---
        const inputs = selectedUtxos.map(u => ({ txid: u.txid, vout: u.vout }));
        const outputs = { [recipient]: sendAmount };
        if (change > DUST_THRESHOLD) {
            outputs[fromAddress] = change;
        }

        // --- Step 6: Create raw transaction ---
        const rawTx = await rpcCall(rpcUrl, rpcAuth, 'createrawtransaction', [inputs, outputs]);

        // --- Step 7: Unlock node wallet or sign with private key ---
        let signResult;
        if (privateKey) {
            // Convert hex private key to WIF if needed (WIF starts with 5, K, L for mainnet or c for testnet)
            let wifKey = privateKey.trim();
            const isHex = /^[0-9a-fA-F]{64}$/.test(wifKey);
            if (isHex) {
                wifKey = hexToWIF(wifKey);
            }
            // Sign directly with WIF private key — no node wallet unlock needed
            signResult = await rpcCall(rpcUrl, rpcAuth, 'signrawtransactionwithkey', [rawTx, [wifKey]]);
        } else {
            // Unlock the encrypted node wallet with passphrase, then sign
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
            signResult = await rpcCall(rpcUrl, rpcAuth, 'signrawtransactionwithwallet', [rawTx]);
        }

        if (!signResult.complete) {
            return Response.json({
                error: 'Transaction signing incomplete — ensure the address belongs to the node wallet',
                details: signResult.errors
            }, { status: 500 });
        }

        // --- Step 13: Broadcast ---
        const txid = await rpcCall(rpcUrl, rpcAuth, 'sendrawtransaction', [signResult.hex]);

        // --- Step 14: Record in database ---
        const selectedInputs = selectedUtxos.map(u => ({ txid: u.txid, vout: u.vout, amount: u.amount }));
        const memoText = memo ? `${memo} | TxID: ${txid}` : `TxID: ${txid}`;

        // Find wallet entity for this address (for wallet_id reference)
        const allWallets = await base44.entities.Wallet.filter({ account_id: account.id });
        const senderWallet = allWallets.find(w => w.wallet_address === fromAddress);

        await base44.entities.Transaction.create({
            account_id: account.id,
            wallet_id: senderWallet?.id || null,
            wallet_address: fromAddress,
            type: 'send',
            amount: -sendAmount,
            fee: effectiveFee,
            address: recipient,
            memo: memoText,
            confirmations: 0,
            status: 'pending'
        });

        return Response.json({
            success: true,
            txid,
            fromAddress,
            recipient,
            amount: sendAmount,
            fee: effectiveFee,
            change,
            selectedInputs,
            spendableBalance
        });

    } catch (error) {
        // Never log sensitive data — only log the error message
        console.error('sendTransaction error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});