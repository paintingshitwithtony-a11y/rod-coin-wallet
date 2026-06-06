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
        } catch (_err) {
            body = {};
        }
        const requestedAddress = (body.address || '').trim();

        // Get user's wallet account with service role after authenticating the user
        let accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        
        if (accounts.length === 0) {
            accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: user.id });
        }

        if (accounts.length === 0) {
            return Response.json({ 
                success: false,
                error: 'Wallet not found'
            }, { status: 404 });
        }

        const account = accounts[0];
        const accountAddresses = [
            account.wallet_address,
            ...(account.additional_addresses || []).map(addr => addr.address)
        ].filter(Boolean);
        const wallets = await base44.asServiceRole.entities.Wallet.filter({ account_id: account.id });
        wallets.forEach(wallet => accountAddresses.push(wallet.wallet_address));
        const uniqueAddresses = [...new Set(accountAddresses.map(address => address?.trim()).filter(Boolean))];
        const queryAddresses = requestedAddress ? [requestedAddress] : uniqueAddresses;

        if (requestedAddress && !uniqueAddresses.some(address => address?.toLowerCase() === requestedAddress.toLowerCase())) {
            return Response.json({
                success: false,
                error: 'Address does not belong to this wallet account'
            }, { status: 403 });
        }

        // Get active RPC configuration
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (configs.length === 0) {
            return Response.json({ 
                success: false,
                error: 'No active RPC configuration'
            }, { status: 400 });
        }

        const config = configs[0];

        // Build RPC URL
        const SSL_PORTS = new Set(['443', '9443', '8443']);
        const rawHost = (config.host || '').trim();
        const normalizedHost = rawHost.replace(/^https?:\/\//, '').replace(/^https?\/?\/?/, '').replace(/\/$/, '');
        const protocol = (config.use_ssl || rawHost.startsWith('https') || SSL_PORTS.has(String(config.port))) ? 'https' : 'http';
        const rpcUrl = !config.port || config.port === ''
            ? `${protocol}://${normalizedHost}`
            : `${protocol}://${normalizedHost}:${config.port}`;

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.connection_type === 'api' && config.api_key) {
            headers['X-API-Key'] = config.api_key;
        } else if (config.connection_type === 'rpc' && config.username && config.password) {
            headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
        }
        
        try {
            const rpcResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'getBalance',
                    method: 'listunspent',
                    params: [0, 9999999, queryAddresses]
                }),
                signal: AbortSignal.timeout(15000)
            });

            if (!rpcResponse.ok) {
                return Response.json({ 
                    success: false,
                    error: 'RPC connection failed'
                }, { status: 500 });
            }

            const rpcData = await rpcResponse.json();
            
            if (rpcData.error) {
                return Response.json({ 
                    success: false,
                    error: rpcData.error.message
                }, { status: 500 });
            }

            if (Array.isArray(rpcData.result)) {
                const querySet = new Set(queryAddresses.map(address => address.toLowerCase()));
                const matchingUtxos = rpcData.result.filter(utxo => querySet.has((utxo.address || '').toLowerCase()));
                const balance = parseFloat(matchingUtxos
                    .reduce((sum, utxo) => sum + Number(utxo.amount || 0), 0)
                    .toFixed(8));

                return Response.json({ 
                    success: true,
                    address: requestedAddress || 'all-account-addresses',
                    addresses: queryAddresses,
                    balance,
                    utxoCount: matchingUtxos.length
                });
            }

            return Response.json({ 
                success: false,
                error: 'Invalid RPC response'
            }, { status: 500 });

        } catch (err) {
            return Response.json({ 
                success: false,
                error: 'RPC connection timeout or unreachable'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('getRPCBalance error:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Unknown error'
        }, { status: 500 });
    }
});