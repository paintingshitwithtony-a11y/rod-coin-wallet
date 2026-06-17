import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== getRPCBalance START ===");
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get request body (support both JSON and form data)
        let body = {};
        try {
            const bodyText = await req.text();
            if (bodyText) {
                body = JSON.parse(bodyText);
            }
        } catch (e) {
            console.log("Body parse failed, using empty body");
        }

        console.log("Request body:", body);

        // 1. Try address from frontend request
        let address = body.address || body.Address || body.walletAddress || body.accountAddress || body.addr;

        // 2. Fallback: Get user's WalletAccount
        if (!address) {
            const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ 
                email: user.email 
            });
            
            if (accounts.length > 0) {
                const account = accounts[0];
                address = account.wallet_address || 
                         (account.additional_addresses && account.additional_addresses[0]?.address);
                
                console.log("Found address from WalletAccount:", address);
            }
        }

        if (!address) {
            return Response.json({ 
                success: false, 
                error: "No address found for this account. Please generate or import an address first." 
            }, { status: 400 });
        }

        console.log("Using address:", address);

        // Get active RPC configuration
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ 
            is_active: true 
        });

        const config = configs[0];
        if (!config) {
            return Response.json({ success: false, error: 'No active RPC configuration' }, { status: 400 });
        }

        console.log("Using RPC config:", {
            name: config.name,
            host: config.host,
            port: config.port,
            use_ssl: config.use_ssl
        });

        // Build RPC URL - Force DuckDNS + correct port for your setup
        const protocol = config.use_ssl || config.port === '443' ? 'https' : 'http';
        let rpcUrl = `${protocol}://${config.host}`;
        
        if (config.port && config.port !== '443' && config.port !== '80') {
            rpcUrl += `:${config.port}`;
        }

        // Force correct endpoint for ROD Core (named wallet support)
        if (!rpcUrl.includes('/wallet/')) {
            rpcUrl += '/wallet/wallet.dat';
        }

        console.log("Final RPC URL:", rpcUrl);

        const rpcAuth = btoa(`${config.username || 'roduser'}:${config.password}`);

        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${rpcAuth}`
            },
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'balance',
                method: 'listunspent',
                params: [0, 9999999, [address]]
            }),
            signal: AbortSignal.timeout(15000)
        });

        const responseText = await rpcResponse.text();
        console.log("RPC Raw Response:", responseText);

        let rpcData;
        try {
            rpcData = JSON.parse(responseText);
        } catch (e) {
            return Response.json({ 
                success: false, 
                error: 'Invalid RPC response from node',
                raw: responseText 
            }, { status: 500 });
        }

        if (rpcData.error) {
            return Response.json({ 
                success: false, 
                error: rpcData.error.message || rpcData.error 
            }, { status: 500 });
        }

        // Calculate balance from UTXOs
        const utxos = rpcData.result || [];
        let balance = 0;
        
        utxos.forEach(utxo => {
            balance += parseFloat(utxo.amount || 0);
        });

        const finalBalance = parseFloat(balance.toFixed(8));

        console.log(`Balance for ${address}: ${finalBalance} ROD (${utxos.length} UTXOs)`);

        return Response.json({
            success: true,
            balance: finalBalance,
            utxoCount: utxos.length,
            addressUsed: address,
            note: 'Live RPC balance'
        });

    } catch (error) {
        console.error('getRPCBalance FULL ERROR:', error);
        return Response.json({ 
            success: false, 
            error: error.message || 'Unknown error' 
        }, { status: 500 });
    }
});