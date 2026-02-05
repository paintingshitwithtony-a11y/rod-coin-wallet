import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipient, amount, fee, memo, fromAddress } = await req.json();

        // Validate inputs
        if (!recipient || !amount || amount <= 0) {
            return Response.json({ error: 'Invalid transaction parameters' }, { status: 400 });
        }

        // Get user's wallet account - use session ID from localStorage
        const savedSession = req.headers.get('cookie');
        let accountId = null;
        
        // Try to parse account ID from session
        try {
            const sessionMatch = savedSession?.match(/rod_wallet_session=([^;]+)/);
            if (sessionMatch) {
                const sessionData = JSON.parse(decodeURIComponent(sessionMatch[1]));
                accountId = sessionData.id;
            }
        } catch (e) {
            // Fallback to user email
        }

        let accounts;
        if (accountId) {
            accounts = await base44.entities.WalletAccount.filter({ id: accountId });
        } else {
            accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        }

        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];

        // Get active RPC configuration
        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ 
            account_id: account.id,
            is_active: true 
        });

        if (rpcConfigs.length === 0) {
            return Response.json({ 
                error: 'No active RPC configuration found. Please configure an RPC connection in Admin panel.'
            }, { status: 500 });
        }

        const rpcConfig = rpcConfigs[0];
        const rpcHost = rpcConfig.host;
        const rpcPort = rpcConfig.port;
        const rpcUser = rpcConfig.username;
        const rpcPass = rpcConfig.password;

        if (!rpcHost || !rpcPort || !rpcUser || !rpcPass) {
            return Response.json({ 
                error: 'RPC credentials incomplete. Please check your RPC configuration.'
            }, { status: 500 });
        }

        // Check balance
        if (account.balance < (amount + fee)) {
            return Response.json({ 
                error: 'Insufficient balance',
                required: amount + fee,
                available: account.balance
            }, { status: 400 });
        }

        console.log('=== SEND TRANSACTION DEBUG ===');
        console.log('Account ID:', account.id);
        console.log('From Address:', fromAddress || 'default');
        console.log('To Address:', recipient);
        console.log('Amount:', amount);
        console.log('Fee:', fee);
        console.log('Current Balance:', account.balance);

        // Send transaction via ROD Core RPC
        const rpcUrl = `http://${rpcHost}:${rpcPort}`;
        const rpcAuth = btoa(`${rpcUser}:${rpcPass}`);
        
        // If sending from specific wallet, verify it's imported to RPC first
        if (fromAddress) {
            console.log('Verifying address is imported:', fromAddress);
            
            const validateResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${rpcAuth}`
                },
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'validateAddress',
                    method: 'validateaddress',
                    params: [fromAddress]
                })
            });
            
            const validateData = await validateResponse.json();
            console.log('Address validation:', validateData.result);
            
            if (!validateData.result?.ismine) {
                return Response.json({ 
                    error: 'Address not imported to RPC node. Please import it first using "Import to Chain" button.'
                }, { status: 400 });
            }
        }
        
        // Always use sendtoaddress (sendfrom is deprecated and doesn't work properly)
        const rpcMethod = 'sendtoaddress';
        const rpcParams = [recipient, amount, memo || '', '', false];
        
        console.log('RPC Method:', rpcMethod);
        console.log('RPC Params:', rpcParams);
        
        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${rpcAuth}`
            },
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'sendTransaction',
                method: rpcMethod,
                params: rpcParams
            })
        });

        if (!rpcResponse.ok) {
            const errorText = await rpcResponse.text();
            return Response.json({ 
                error: 'Failed to broadcast transaction',
                details: errorText
            }, { status: 500 });
        }

        const rpcData = await rpcResponse.json();
        
        if (rpcData.error) {
            return Response.json({ 
                error: 'Transaction failed',
                details: rpcData.error.message
            }, { status: 500 });
        }

        const txid = rpcData.result;
        console.log('Transaction broadcasted. TxID:', txid);

        // Record transaction in database
        const transaction = await base44.entities.Transaction.create({
            account_id: account.id,
            type: 'send',
            amount: -amount,
            fee: fee,
            address: recipient,
            memo: memo ? `${memo} | TxID: ${txid}` : `TxID: ${txid}`,
            confirmations: 0,
            status: 'pending'
        });
        console.log('Transaction recorded in DB:', transaction.id);

        // Update account balance - fetch fresh data first to avoid stale balance
        const freshAccounts = await base44.entities.WalletAccount.filter({ id: account.id });
        const currentBalance = freshAccounts[0]?.balance || 0;
        const newBalance = currentBalance - amount - fee;
        
        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            balance: newBalance
        });
        console.log('Balance updated:', currentBalance, '->', newBalance);
        
        // Also update individual wallet balance if sending from specific wallet
        if (fromAddress) {
            const wallets = await base44.entities.Wallet.filter({
                account_id: account.id,
                wallet_address: fromAddress
            });
            
            if (wallets.length > 0) {
                const wallet = wallets[0];
                const newWalletBalance = (wallet.balance || 0) - amount - fee;
                await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                    balance: newWalletBalance
                });
                console.log('Wallet balance updated:', wallet.balance, '->', newWalletBalance);
            }
        }

        return Response.json({ 
            success: true,
            txid,
            transaction,
            newBalance
        });

    } catch (error) {
        console.error('=== SEND TRANSACTION ERROR ===');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});