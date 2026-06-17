import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== IMPORT ALL ADDRESSES - FORCED DUCKDNS ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        let body = {};
        try { body = await req.json(); } catch (_) {}

        const rescan = body.rescan === true;

        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet not found' }, { status: 404 });

        const account = accounts[0];

        // FORCE CORRECT URL
        const rpcUrl = "https://rodcoinwallet.duckdns.org:443/wallet/wallet.dat";
        console.log("FORCED Import URL:", rpcUrl);

        const headers = { 'Content-Type': 'application/json' };
        // Use default credentials from your config
        headers['Authorization'] = `Basic ${btoa('roduser:a250b99cd8798d396087d0cbd87ab1721cb6f9ba53f6ba06adf77074e6886aff')}`;

        // Collect addresses
        const addressesToImport = [];
        if (account.wallet_address) addressesToImport.push({ address: account.wallet_address, label: 'Primary' });

        if (account.additional_addresses) {
            account.additional_addresses.forEach(addr => {
                if (addr && addr.address) addressesToImport.push({ address: addr.address, label: addr.label || 'Additional' });
            });
        }

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
                console.log(`Imported ${item.address}: ${success}`);
            } catch (err) {
                results.push({ address: item.address, success: false, error: err.message });
                console.log(`Failed ${item.address}:`, err.message);
            }
        }

        return Response.json({
            success: true,
            imported: successCount,
            total: addressesToImport.length,
            results,
            message: `Imported ${successCount}/${addressesToImport.length} addresses`
        });

    } catch (error) {
        console.error('ImportAllAddresses error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});