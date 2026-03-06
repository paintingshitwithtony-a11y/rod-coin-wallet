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

async function decryptPrivateKey(encryptedKey, password) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(password.padEnd(32, '0').slice(0, 32));
    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const key = await crypto.subtle.importKey(
        'raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { recipient, amount, fee, memo, fromAddress, wifKey } = await req.json();

        if (!recipient || !amount || amount <= 0) {
            return Response.json({ error: 'Invalid transaction parameters' }, { status: 400 });
        }
        if (!wifKey) {
            return Response.json({ error: 'Private key (WIF) is required to sign the transaction' }, { status: 400 });
        }

        // Get wallet account
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        const account = accounts[0];

        // Get active RPC config
        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (rpcConfigs.length === 0) {
            return Response.json({ error: 'No active RPC configuration found' }, { status: 500 });
        }

        const rpcConfig = rpcConfigs[0];
        let rpcHost = rpcConfig.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        const protocol = rpcConfig.port === '443' || rpcConfig.port === 443 ? 'https' : 'http';
        const rpcUrl = `${protocol}://${rpcHost}:${rpcConfig.port}`;
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        const senderAddress = fromAddress || account.wallet_address;
        const feeAmount = parseFloat(fee) || 0.0001;
        const sendAmount = parseFloat(amount);
        const totalNeeded = sendAmount + feeAmount;

        console.log('=== RAW TRANSACTION SEND ===');
        console.log('From:', senderAddress);
        console.log('To:', recipient);
        console.log('Amount:', sendAmount, 'Fee:', feeAmount);

        // Step 1: Get UTXOs for the sender address only
        const utxos = await rpcCall(rpcUrl, rpcAuth, 'listunspent', [0, 9999999, [senderAddress]]);
        console.log('UTXOs found:', utxos.length);

        if (!utxos || utxos.length === 0) {
            return Response.json({ error: `No unspent outputs found for address ${senderAddress}` }, { status: 400 });
        }

        // Step 2: Select UTXOs to cover amount + fee
        const selectedUtxos = [];
        let inputTotal = 0;
        for (const utxo of utxos) {
            selectedUtxos.push(utxo);
            inputTotal += utxo.amount;
            if (inputTotal >= totalNeeded) break;
        }

        if (inputTotal < totalNeeded) {
            return Response.json({
                error: 'Insufficient funds',
                available: inputTotal,
                required: totalNeeded
            }, { status: 400 });
        }

        const change = parseFloat((inputTotal - totalNeeded).toFixed(8));

        // Step 3: Build inputs and outputs
        const inputs = selectedUtxos.map(u => ({ txid: u.txid, vout: u.vout }));
        const outputs = { [recipient]: sendAmount };
        if (change > 0.00000001) {
            outputs[senderAddress] = change;
        }

        console.log('Inputs:', inputs.length, 'Change:', change);

        // Step 4: Create raw transaction
        const rawTx = await rpcCall(rpcUrl, rpcAuth, 'createrawtransaction', [inputs, outputs]);
        console.log('Raw TX created');

        // Step 5: Sign with provided WIF key (key is NOT imported into node wallet)
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
        console.log('Sign result complete:', signResult.complete);

        if (!signResult.complete) {
            return Response.json({ error: 'Transaction signing incomplete', details: signResult.errors }, { status: 500 });
        }

        // Step 6: Broadcast
        const txid = await rpcCall(rpcUrl, rpcAuth, 'sendrawtransaction', [signResult.hex]);
        console.log('Broadcasted TxID:', txid);

        // Record transaction in DB
        const allWallets = await base44.entities.Wallet.filter({ account_id: account.id });
        const senderWallet = allWallets.find(w => w.wallet_address === senderAddress);
        const recipientWallet = allWallets.find(w => w.wallet_address === recipient);
        const isInternal = recipient === account.wallet_address || !!recipientWallet;

        const memoText = memo ? `${memo} | TxID: ${txid}` : `TxID: ${txid}`;

        await base44.entities.Transaction.create({
            account_id: account.id,
            wallet_id: senderWallet?.id || null,
            wallet_address: senderAddress,
            type: 'send',
            amount: -sendAmount,
            fee: feeAmount,
            address: recipient,
            memo: memoText,
            confirmations: 0,
            status: 'pending'
        });

        if (isInternal && recipientWallet) {
            await base44.entities.Transaction.create({
                account_id: account.id,
                wallet_id: recipientWallet.id,
                wallet_address: recipient,
                type: 'receive',
                amount: sendAmount,
                fee: 0,
                address: senderAddress,
                memo: `Internal Transfer | TxID: ${txid}`,
                confirmations: 0,
                status: 'pending'
            });
        }

        return Response.json({ success: true, txid, change });

    } catch (error) {
        console.error('Send transaction error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});