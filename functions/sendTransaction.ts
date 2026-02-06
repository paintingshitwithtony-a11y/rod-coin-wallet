import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipient, amount, fee, memo, fromAddress, isInternalTransfer } = await req.json();

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

        // Batch fetch all needed data to avoid rate limits
        const [rpcConfigs, allWallets] = await Promise.all([
            base44.entities.RPCConfiguration.filter({ 
                account_id: account.id,
                is_active: true 
            }),
            base44.entities.Wallet.filter({
                account_id: account.id
            })
        ]);

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
        console.log('Internal Transfer:', isInternalTransfer);

        // Send transaction via ROD Core RPC
        const rpcUrl = `http://${rpcHost}:${rpcPort}`;
        const rpcAuth = btoa(`${rpcUser}:${rpcPass}`);
        
        // If sending from specific wallet, verify it's imported to RPC first - auto-import if needed
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
                console.log('Address not imported. Auto-importing:', fromAddress);
                
                // Get private key from wallet and import to RPC
                const senderWallet = allWallets.find(w => w.wallet_address === fromAddress);
                if (senderWallet?.encrypted_private_key) {
                    try {
                        const importResponse = await fetch(rpcUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Basic ${rpcAuth}`
                            },
                            body: JSON.stringify({
                                jsonrpc: '1.0',
                                id: 'importAddress',
                                method: 'importaddress',
                                params: [fromAddress, 'imported-wallet', false]
                            })
                        });
                        
                        const importData = await importResponse.json();
                        if (importData.error) {
                            console.error('Auto-import failed:', importData.error);
                        } else {
                            console.log('Address auto-imported successfully');
                        }
                    } catch (importErr) {
                        console.error('Failed to auto-import address:', importErr);
                    }
                }
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

        // Determine which wallet this is being sent from (using already fetched wallets)
        const senderWallet = allWallets.find(w => w.wallet_address === fromAddress);
        const senderWalletId = senderWallet?.id || null;
        
        // Check if recipient is also owned by this user (internal transfer)
        const recipientWallet = allWallets.find(w => w.wallet_address === recipient);
        const recipientWalletId = recipientWallet?.id || null;
        const isRecipientMainWallet = recipient === account.wallet_address;
        
        // Record send transaction
        const memoText = isInternalTransfer ? 
            `Internal Transfer | ${memo || ''} | TxID: ${txid}`.trim() :
            memo ? `${memo} | TxID: ${txid}` : `TxID: ${txid}`;
        
        const transaction = await base44.entities.Transaction.create({
            account_id: account.id,
            wallet_id: senderWalletId,
            wallet_address: fromAddress || account.wallet_address,
            type: 'send',
            amount: -amount,
            fee: fee,
            address: recipient,
            memo: memoText,
            confirmations: 0,
            status: 'confirmed'
        });
        console.log('Send transaction recorded:', transaction.id);
        
        // If internal transfer, record receive transaction for the recipient wallet
        if (isInternalTransfer && (recipientWalletId || isRecipientMainWallet)) {
            const receiveTransaction = await base44.entities.Transaction.create({
                account_id: account.id,
                wallet_id: recipientWalletId,
                wallet_address: recipient,
                type: 'receive',
                amount: amount,
                fee: 0,
                address: fromAddress || account.wallet_address,
                memo: `Internal Transfer | ${memo || ''} | TxID: ${txid}`.trim(),
                confirmations: 1,
                status: 'confirmed'
            });
            console.log('Receive transaction recorded:', receiveTransaction.id);
            
            // Update recipient wallet balance
            if (recipientWalletId && recipientWallet) {
                const newRecipientBalance = (recipientWallet.balance || 0) + amount;
                await base44.asServiceRole.entities.Wallet.update(recipientWallet.id, {
                    balance: newRecipientBalance
                });
                console.log('Recipient wallet balance updated:', recipientWallet.balance, '->', newRecipientBalance);
            }
        }

        // Update account balance - fetch fresh data first to avoid stale balance
        const freshAccounts = await base44.entities.WalletAccount.filter({ id: account.id });
        const currentBalance = freshAccounts[0]?.balance || 0;
        const newBalance = currentBalance - amount - fee;
        
        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            balance: newBalance
        });
        console.log('Balance updated:', currentBalance, '->', newBalance);
        
        // Also update individual wallet balance if sending from specific wallet
        if (fromAddress && senderWallet) {
            const newWalletBalance = (senderWallet.balance || 0) - amount - fee;
            await base44.asServiceRole.entities.Wallet.update(senderWallet.id, {
                balance: newWalletBalance
            });
            console.log('Wallet balance updated:', senderWallet.balance, '->', newWalletBalance);
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