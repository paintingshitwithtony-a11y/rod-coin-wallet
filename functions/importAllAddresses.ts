import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's wallet account
        const accounts = await base44.entities.WalletAccount.filter({ 
            email: user.email 
        });

        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];

        // Get active RPC configuration
        const configs = await base44.entities.RPCConfiguration.filter({
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

        // Collect all addresses to import
        const addressesToImport = [
            { address: account.wallet_address, label: 'Primary Address' }
        ];

        if (account.additional_addresses) {
            account.additional_addresses.forEach(addr => {
                addressesToImport.push({
                    address: addr.address,
                    label: addr.label || 'Additional Address'
                });
            });
        }

        const results = [];

        // Import each address using the RPC proxy (which handles auth and routing correctly)
        for (const item of addressesToImport) {
            try {
                // Call rpcProxy function to handle the RPC request properly
                const proxyResponse = await base44.functions.invoke('rpcProxy', {
                    jsonrpc: '1.0',
                    id: `import-${item.address}`,
                    method: 'importaddress',
                    params: [item.address, item.label, false]
                });

                if (proxyResponse.data.error) {
                    results.push({
                        address: item.address,
                        success: false,
                        error: proxyResponse.data.error.message || proxyResponse.data.error
                    });
                } else {
                    results.push({
                        address: item.address,
                        success: true
                    });
                }
            } catch (err) {
                results.push({
                    address: item.address,
                    success: false,
                    error: err.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;

        // Log detailed results for debugging
        console.log('Import results:', JSON.stringify(results, null, 2));
        
        return Response.json({
            success: true,
            imported: successCount,
            total: addressesToImport.length,
            results,
            errors: results.filter(r => !r.success).map(r => r.error)
        });

    } catch (error) {
        console.error('Import all addresses error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});