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

        // Get all wallets
        const wallets = await base44.entities.Wallet.filter({ account_id: account.id });

        // STEP 1: Reset all balances to 0
        for (const wallet of wallets) {
            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                balance: 0
            });
        }
        
        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            balance: 0
        });

        // STEP 2: Fetch all transactions
        const transactions = await base44.entities.Transaction.filter(
            { account_id: account.id },
            '-created_date',
            10000
        );

        // STEP 3: Build wallet address map
        const walletAddressMap = {};
        for (const wallet of wallets) {
            walletAddressMap[wallet.wallet_address] = wallet.id;
            
            // Include additional addresses
            if (wallet.additional_addresses && Array.isArray(wallet.additional_addresses)) {
                for (const addr of wallet.additional_addresses) {
                    walletAddressMap[addr.address] = wallet.id;
                }
            }
        }
        
        // Main account addresses
        walletAddressMap[account.wallet_address] = 'main-account';
        if (account.additional_addresses && Array.isArray(account.additional_addresses)) {
            for (const addr of account.additional_addresses) {
                walletAddressMap[addr.address] = 'main-account';
            }
        }

        // STEP 4: Calculate balances from transactions
        const walletBalances = {};
        for (const wallet of wallets) {
            walletBalances[wallet.id] = 0;
        }
        let mainWalletBalance = 0;

        for (const tx of transactions) {
            let targetWalletId = tx.wallet_id;
            
            // If no wallet_id, try to determine from wallet_address
            if (!targetWalletId && tx.wallet_address) {
                targetWalletId = walletAddressMap[tx.wallet_address];
            }

            if (targetWalletId && targetWalletId !== 'main-account' && walletBalances.hasOwnProperty(targetWalletId)) {
                // Transaction belongs to a specific wallet
                if (tx.type === 'receive') {
                    walletBalances[targetWalletId] += tx.amount;
                } else if (tx.type === 'send') {
                    walletBalances[targetWalletId] -= Math.abs(tx.amount);
                }
            } else {
                // Transaction belongs to main wallet
                if (tx.type === 'receive') {
                    mainWalletBalance += tx.amount;
                } else if (tx.type === 'send') {
                    mainWalletBalance -= Math.abs(tx.amount);
                }
            }
        }

        // STEP 5: Update all wallet balances
        for (const wallet of wallets) {
            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                balance: walletBalances[wallet.id]
            });
        }
        
        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            balance: mainWalletBalance
        });

        return Response.json({
            success: true,
            mainWalletBalance,
            walletsUpdated: wallets.length,
            transactionsProcessed: transactions.length,
            walletBalances
        });

    } catch (error) {
        console.error('Reset and recalculate error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});