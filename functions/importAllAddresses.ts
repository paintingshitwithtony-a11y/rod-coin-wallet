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

        const config = configs[0];

        // Build RPC URL
        const protocol = config.use_ssl ? 'https' : 'http';
        const rpcUrl = !config.port || config.port === ''
            ? `${protocol}://${config.host}`
            : `${protocol}://${config.host}:${config.port}`;

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.connection_type === 'api' && config.api_key) {
            headers['X-API-Key'] = config.api_key;
        } else if (config.connection_type === 'rpc' && config.username && config.password) {
            headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
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

        // Import each address
        for (const item of addressesToImport) {
            try {
                const importResponse = await fetch(rpcUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        jsonrpc: '1.0',
                        id: `import-${item.address}`,
                        method: 'importaddress',
                        params: [item.address, item.label, false]
                    }),
                    signal: AbortSignal.timeout(10000)
                });

                // Check if response is OK
                if (!importResponse.ok) {
                    const errorText = await importResponse.text();
                    results.push({
                        address: item.address,
                        success: false,
                        error: `HTTP ${importResponse.status}: ${errorText}`
                    });
                    continue;
                }

                const importData = await importResponse.json();

                if (importData.error) {
                    results.push({
                        address: item.address,
                        success: false,
                        error: importData.error.message
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