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
         const { fromAddress, recipient, amount, fee, memo, passphrase } = body;

        // --- Input validation ---
        if (!fromAddress) return Response.json({ error: 'fromAddress is required' }, { status: 400 });
        if (!recipient) return Response.json({ error: 'recipient is required' }, { status: 400 });
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return Response.json({ error: 'amount must be a positive number' }, { status: 400 });
        }
        if (fee === undefined || fee === null || isNaN(parseFloat(fee)) || parseFloat(fee) < 0) {
            return Response.json({ error: 'fee must be a non-negative number' }, { status: 400 });
        }
        // passphrase is optional — if wallet is already unlocked, it's not needed

        const sendAmount = parseFloat((+amount).toFixed(8));
        const feeAmount = parseFloat((+fee).toFixed(8));
        const totalNeeded = parseFloat((sendAmount + feeAmount).toFixed(8));

        // --- Load account ---
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        const account = accounts[0];

        // --- Verify ownership of fromAddress ---
        // Check main account address
        let encryptedPrivateKey = null;
        if (account.wallet_address === fromAddress) {
            encryptedPrivateKey = account.encrypted_private_key || null;
        }

        // Check Wallet entities belonging to this account
        if (!encryptedPrivateKey) {
            const wallets = await base44.entities.Wallet.filter({ account_id: account.id });
            const matchingWallet = wallets.find(w => w.wallet_address === fromAddress);
            if (matchingWallet) {
                encryptedPrivateKey = matchingWallet.encrypted_private_key || null;
            }
        }

        if (!encryptedPrivateKey) {
            return Response.json({
                error: 'fromAddress does not belong to this account, or no private key is stored for it'
            }, { status: 403 });
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

        // --- Step 9: Create raw transaction ---
        const rawTx = await rpcCall(rpcUrl, rpcAuth, 'createrawtransaction', [inputs, outputs]);

        // --- Step 10: Attempt to unlock node wallet if encrypted (best-effort, non-fatal) ---
        // We do NOT encrypt the node wallet here — that is a destructive, irreversible operation
        // that could lock the user out. Signing is done with our stored encrypted key instead.
        try {
            const walletInfo = await rpcCall(rpcUrl, rpcAuth, 'getwalletinfo', []);
            const isEncrypted = walletInfo.unlocked_until !== undefined;
            if (isEncrypted) {
                const isLocked = walletInfo.unlocked_until <= Math.floor(Date.now() / 1000);
                if (isLocked && passphrase) {
                    await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [passphrase, 60]);
                }
            }
        } catch (unlockErr) {
            console.log('Wallet unlock note (non-fatal):', unlockErr.message);
        }

        // --- Step 11: Decrypt WIF using provided passphrase ---
        if (!passphrase || typeof passphrase !== 'string' || passphrase.trim() === '') {
            return Response.json({ error: 'Passphrase is required to sign the transaction.' }, { status: 400 });
        }
        const wifKey = await decryptWIF(encryptedPrivateKey, passphrase);

        // --- Step 12: Sign with key — key is NOT imported into node wallet ---
        const prevTxs = selectedUtxos.map(u => ({
            txid: u.txid,
            vout: u.vout,
            scriptPubKey: u.scriptPubKey,
            amount: u.amount
        }));

        const signResult = await rpcCall(rpcUrl, rpcAuth, 'signrawtransactionwithkey', [
            rawTx,
            [wifKey],
            prevTxs
        ]);

        // Clear WIF from local scope reference (best-effort in JS)
        // wifKey = null; // (would cause const error, but GC will collect it)

        if (!signResult.complete) {
            return Response.json({
                error: 'Transaction signing incomplete — check that the correct private key is stored for this address',
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