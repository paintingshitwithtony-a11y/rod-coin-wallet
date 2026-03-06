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

// Generates a new address via the RPC node, dumps its private key (WIF),
// then returns both to the frontend for encrypted storage.
// The key is NEVER stored on the backend — only the encrypted version goes to the DB.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { label } = await req.json();

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

        // Step 1: Generate new address via RPC node
        const address = await rpcCall(rpcUrl, rpcAuth, 'getnewaddress', [label || '']);
        console.log('Generated address:', address);

        // Step 2: Dump private key (WIF format) — returned to frontend for client-side encryption
        // The node will still hold this key internally, but it's the canonical source
        const wifKey = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [address]);
        console.log('Private key exported for address:', address);

        // Return address + WIF key to frontend
        // Frontend must encrypt the WIF key with the user's password before storing
        return Response.json({ success: true, address, wifKey });

    } catch (error) {
        console.error('Generate address error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});