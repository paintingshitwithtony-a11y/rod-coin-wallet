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

function buildRpcUrl() {
    const host = (Deno.env.get('ROD_RPC_HOST') || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    const port = Deno.env.get('ROD_RPC_PORT') || '11999';
    if (!host) throw new Error('ROD RPC host is not configured');

    const sslPorts = new Set(['443', '9443', '8443']);
    const protocol = sslPorts.has(String(port)) ? 'https' : 'http';
    return `${protocol}://${host}:${port}`;
}

Deno.serve(async (req) => {
    try {
        createClientFromRequest(req);
        const body = await req.json();
        const label = body.label || 'Primary Wallet';

        const username = Deno.env.get('ROD_RPC_USERNAME');
        const password = Deno.env.get('ROD_RPC_PASSWORD');
        if (!username || !password) throw new Error('ROD RPC credentials are not configured');

        const rpcUrl = buildRpcUrl();
        const rpcAuth = btoa(`${username}:${password}`);
        const passphrase = (body.passphrase && body.passphrase.trim()) || '';

        const walletInfo = await rpcCall(rpcUrl, rpcAuth, 'getwalletinfo', []);
        if (walletInfo && walletInfo.unlocked_until === 0 && !passphrase) {
            throw new Error('ROD Core wallet is locked. Enter the node wallet passphrase to export the WIF private key.');
        }
        if (walletInfo && walletInfo.unlocked_until === 0 && passphrase) {
            await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [passphrase, 60]);
        }

        const address = await rpcCall(rpcUrl, rpcAuth, 'getnewaddress', [label]);
        const wif = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [address]);

        if (!wif || typeof wif !== 'string' || wif.trim().length < 50) {
            throw new Error('ROD Core returned an invalid WIF private key');
        }

        return Response.json({ success: true, address, wif });
    } catch (error) {
        console.error('createSpendableSignupWallet error:', error.message);
        const message = error.message || 'Failed to create spendable wallet';
        const status = message.toLowerCase().includes('passphrase') ? 400 : 500;
        return Response.json({ error: message }, { status });
    }
});