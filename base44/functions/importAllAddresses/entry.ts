import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
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
            return Response.json({
                success: true,
                imported: 0,
                total: 0,
                message: 'No active RPC configuration'
            });
        }

        const config = configs[0];

        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = `${protocol}://${config.host}:${config.port}`;

        const headers = { 'Content-Type': 'application/json' };
        if (config.username && config.password) {
            headers['Authorization'] = `Basic ${btoa(config.username + ':' + config.password)}`;
        }

        // Collect addresses
        const addressesToImport = [];
        if (account.wallet_address) {
            addressesToImport.push({ address: account.wallet_address, label: 'Primary Address' });
        }

        const deletedKeys = new Set((account.deleted_wallet_addresses || []).map(a => (a || '').trim().toLowerCase()));

        if (account.additional_addresses) {
            account.additional_addresses
                .filter(addr => !deletedKeys.has((addr.address || '').trim().toLowerCase()))
                .forEach(addr => {
                    addressesToImport.push({
                        address: addr.address,
                        label: addr.label || 'Additional Address'
                    });
                });
        }

        // Also get from Wallet table
        const wallets = await base44.asServiceRole.entities.Wallet.filter({ account_id: account.id });
        wallets.forEach(wallet => {
            if (wallet.wallet_address && !deletedKeys.has(wallet.wallet_address.trim().toLowerCase())) {
                const alreadyAdded = addressesToImport.some(a => a.address === wallet.wallet_address);
                if (!alreadyAdded) {
                    addressesToImport.push({
                        address: wallet.wallet_address,
                        label: wallet.name || 'Wallet'
                    });
                }
            }
        });

        const results = [];
        for (const item of addressesToImport) {
            let success = false;
            let lastError = '';

            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    if (attempt > 0) await new Promise(r => setTimeout(r, 2000));

                    const importResponse = await fetch(rpcUrl, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            jsonrpc: '1.0',
                            id: `import-${Date.now()}`,
                            method: 'importaddress',
                            params: [item.address, item.label, rescan]
                        }),
                        signal: AbortSignal.timeout(rescan ? 120000 : 30000)
                    });

                    const importData = await importResponse.json();

                    if (importData.error) {
                        if (importData.error.message?.includes('already')) {
                            success = true;
                            break;
                        }
                        lastError = importData.error.message;
                    } else {
                        success = true;
                        break;
                    }
                } catch (err) {
                    lastError = err.message;
                }
            }

            results.push({ address: item.address, success, error: success ? null : lastError });
        }

        const successCount = results.filter(r => r.success).length;

        return Response.json({
            success: true,
            imported: successCount,
            total: addressesToImport.length,
            results
        });

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});