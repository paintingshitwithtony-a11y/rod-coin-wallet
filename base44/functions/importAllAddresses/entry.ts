import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== importAllAddresses START ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body = {};
        try {
            body = await req.json();
        } catch (_) {}

        const rescan = body.rescan === true;

        // Get account
        let accounts = body.accountId
            ? await base44.asServiceRole.entities.WalletAccount.filter({ id: body.accountId })
            : await base44.entities.WalletAccount.filter({ email: user.email });

        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];

        // Get active RPC config
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (configs.length === 0) {
            return Response.json({ success: true, imported: 0, total: 0, message: 'No active RPC configuration' });
        }

        const config = configs[0];

        // Build URL with wallet path (CRITICAL FIX)
        const protocol = config.use_ssl ? 'https' : 'http';
        let rpcUrl = `${protocol}://${config.host}`;
        if (config.port && config.port !== '443') rpcUrl += `:${config.port}`;
        rpcUrl += '/wallet/wallet.dat';   // ← This fixes the "Wallet file not specified" error

        console.log("Import RPC URL:", rpcUrl);

        const headers = { 'Content-Type': 'application/json' };
        if (config.username && config.password) {
            headers['Authorization'] = `Basic ${btoa(config.username + ':' + config.password)}`;
        }

        // Collect addresses
        const addressesToImport = [];
        if (account.wallet_address) addressesToImport.push({ address: account.wallet_address, label: 'Primary' });

        const deletedKeys = new Set((account.deleted_wallet_addresses || []).map(a => (a || '').trim().toLowerCase()));

        if (account.additional_addresses) {
            account.additional_addresses
                .filter(addr => !deletedKeys.has((addr.address || '').trim().toLowerCase()))
                .forEach(addr => addressesToImport.push({ address: addr.address, label: addr.label || 'Additional' }));
        }

        const wallets = await base44.asServiceRole.entities.Wallet.filter({ account_id: account.id });
        wallets.forEach(w => {
            if (w.wallet_address && !deletedKeys.has(w.wallet_address.trim().toLowerCase())) {
                if (!addressesToImport.some(a => a.address === w.wallet_address)) {
                    addressesToImport.push({ address: w.wallet_address, label: w.name || 'Wallet' });
                }
            }
        });

        let successCount = 0;
        const results = [];

        for (const item of addressesToImport) {
            try {
                const response = await fetch(rpcUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        jsonrpc: '1.0',
                        id: 1,
                        method: 'importaddress',
                        params: [item.address, item.label, rescan]
                    }),
                    signal: AbortSignal.timeout(30000)
                });

                const data = await response.json();
                const success = !data.error || (data.error && data.error.message && data.error.message.includes('already'));
                if (success) successCount++;
                results.push({ address: item.address, success });
            } catch (err) {
                results.push({ address: item.address, success: false, error: err.message });
            }
        }

        return Response.json({
            success: true,
            imported: successCount,
            total: addressesToImport.length,
            results
        });

    } catch (error) {
        console.error('ImportAllAddresses error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});