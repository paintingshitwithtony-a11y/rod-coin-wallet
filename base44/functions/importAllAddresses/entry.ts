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
        let rpcUrl = !config.port || config.port === ''
            ? `${protocol}://${config.host}`
            : `${protocol}://${config.host}:${config.port}`;

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.connection_type === 'rpc') {
            if (config.username && config.password) {
                headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
            }
        } else if (config.connection_type === 'api' && config.api_key) {
            headers['X-API-Key'] = config.api_key;
        }

        // Collect all addresses to import (from account + all wallets)
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
        
        // Also get addresses from all Wallet entities
        const wallets = await base44.entities.Wallet.filter({ account_id: account.id });
        wallets.forEach(wallet => {
            const alreadyIncluded = addressesToImport.some(a => a.address === wallet.wallet_address);
            if (!alreadyIncluded) {
                addressesToImport.push({
                    address: wallet.wallet_address,
                    label: wallet.name || 'Wallet Address'
                });
            }
        });

        const results = [];

        // Import each address with retry logic
        for (const item of addressesToImport) {
            let success = false;
            let lastError = '';
            
            // Try up to 2 times with delay
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    if (attempt > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                    }
                    
                    const importResponse = await fetch(rpcUrl, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            jsonrpc: '1.0',
                            id: `import-${item.address}`,
                            method: 'importaddress',
                            params: [item.address, item.label, false]
                        }),
                        signal: AbortSignal.timeout(15000) // Increased timeout
                    });

                    if (!importResponse.ok) {
                        const errorText = await importResponse.text();
                        lastError = `HTTP ${importResponse.status}: ${errorText.slice(0, 100)}`;
                        
                        // Don't retry on 503 if it's consistent
                        if (importResponse.status === 503 && attempt === 0) {
                            continue; // Retry once for 503
                        }
                        break; // Don't retry other errors
                    }

                    const importData = await importResponse.json();

                    if (importData.error) {
                        // Check if already imported (not actually an error)
                        if (importData.error.message && importData.error.message.includes('already')) {
                            success = true;
                            break;
                        }
                        lastError = importData.error.message;
                        break;
                    } else {
                        success = true;
                        break;
                    }
                } catch (err) {
                    lastError = err.message;
                    if (attempt === 0) continue; // Retry once
                }
            }
            
            results.push({
                address: item.address,
                success,
                error: success ? null : lastError
            });
        }

        const successCount = results.filter(r => r.success).length;
        const failedResults = results.filter(r => !r.success);

        // Log detailed results for debugging
        console.log('Import Summary:', {
            total: addressesToImport.length,
            imported: successCount,
            failed: failedResults.length
        });
        
        if (failedResults.length > 0) {
            console.log('Failed imports:');
            failedResults.forEach(r => {
                console.log(`  ${r.address}: ${r.error}`);
            });
        }
        
        return Response.json({
            success: successCount > 0 || addressesToImport.length === 0,
            imported: successCount,
            total: addressesToImport.length,
            results,
            message: successCount === 0 && failedResults.length > 0 
                ? `Import failed: ${failedResults[0].error}` 
                : null
        });

    } catch (error) {
        console.error('Import all addresses error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});