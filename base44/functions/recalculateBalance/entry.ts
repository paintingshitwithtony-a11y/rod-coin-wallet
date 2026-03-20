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

        // Get all wallets first to map addresses to wallet IDs
        const allWallets = await base44.entities.Wallet.filter({ account_id: account.id });
        const addressToWalletMap = new Map();
        
        // Build address to wallet mapping
        for (const wallet of allWallets) {
            addressToWalletMap.set(wallet.wallet_address, wallet.id);
            if (wallet.additional_addresses) {
                for (const addr of wallet.additional_addresses) {
                    addressToWalletMap.set(addr.address, wallet.id);
                }
            }
        }
        
        // Get all transactions
        const allTxs = await base44.entities.Transaction.filter(
            { account_id: account.id },
            '-created_date',
            10000
        );

        console.log(`Total transactions found: ${allTxs.length}`);
        console.log(`Total wallets found: ${allWallets.length}`);
        
        // Update old transactions that don't have wallet_id/wallet_address set
        let migratedCount = 0;
        for (const tx of allTxs) {
            if (!tx.wallet_id && !tx.wallet_address) {
                // For receive transactions, the 'address' field is where the coins were received
                const walletId = addressToWalletMap.get(tx.address);
                
                await base44.asServiceRole.entities.Transaction.update(tx.id, {
                    wallet_id: walletId || null,
                    wallet_address: tx.address
                });
                
                // Update in-memory object for balance calculation
                tx.wallet_id = walletId || null;
                tx.wallet_address = tx.address;
                migratedCount++;
            }
        }
        
        console.log(`Migrated ${migratedCount} old transactions`);

        // Group by multiple criteria to find duplicates
        const txMap = new Map();
        const duplicates = [];

        for (const tx of allTxs) {
            // Extract txid from memo (format: "TxID: xxx")
            const txidMatch = tx.memo?.match(/TxID:\s*([a-f0-9]+)/i);
            const txid = txidMatch ? txidMatch[1] : null;

            // Create unique key: type+amount+address+txid (or timestamp if no txid)
            const key = txid 
                ? `${tx.type}-${tx.amount}-${tx.address}-${txid}`
                : `${tx.type}-${tx.amount}-${tx.address}-${new Date(tx.created_date).getTime()}`;

            if (txMap.has(key)) {
                // This is a duplicate - keep the older one
                const existing = txMap.get(key);
                if (new Date(tx.created_date) > new Date(existing.created_date)) {
                    // Current tx is newer, mark it as duplicate
                    duplicates.push(tx.id);
                } else {
                    // Existing is newer, mark it as duplicate and replace
                    duplicates.push(existing.id);
                    txMap.set(key, tx);
                }
            } else {
                // First occurrence, keep it
                txMap.set(key, tx);
            }
        }

        console.log(`Found ${duplicates.length} duplicate transactions`);

        // Delete duplicates
        let deleted = 0;
        for (const dupId of duplicates) {
            try {
                await base44.asServiceRole.entities.Transaction.delete(dupId);
                deleted++;
            } catch (err) {
                console.error(`Failed to delete ${dupId}:`, err);
            }
        }

        // Recalculate balance from remaining transactions
        const remainingTxs = await base44.entities.Transaction.filter(
            { account_id: account.id },
            '-created_date',
            10000
        );

        let newBalance = 0;
        let receivedTotal = 0;
        let sentTotal = 0;

        for (const tx of remainingTxs) {
            if (tx.type === 'receive') {
                newBalance += tx.amount;
                receivedTotal += tx.amount;
            } else if (tx.type === 'send') {
                newBalance -= Math.abs(tx.amount);
                sentTotal += Math.abs(tx.amount);
            }
        }

        // Update account balance
        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            balance: newBalance
        });

        // Recalculate individual wallet balances
        const wallets = await base44.entities.Wallet.filter({ account_id: account.id });
        const walletBalances = {};
        
        for (const wallet of wallets) {
            walletBalances[wallet.id] = 0;
        }
        
        // Also track main wallet balance (transactions without wallet_id)
        let mainWalletBalance = 0;

        // Sum transactions by wallet_id and wallet_address
        for (const tx of remainingTxs) {
            if (tx.wallet_id && walletBalances.hasOwnProperty(tx.wallet_id)) {
                // Transaction belongs to a specific wallet
                if (tx.type === 'receive') {
                    walletBalances[tx.wallet_id] += tx.amount;
                } else if (tx.type === 'send') {
                    walletBalances[tx.wallet_id] -= Math.abs(tx.amount);
                }
            } else if (!tx.wallet_id || tx.wallet_address === account.wallet_address) {
                // Transaction belongs to main wallet (no wallet_id or matches main address)
                if (tx.type === 'receive') {
                    mainWalletBalance += tx.amount;
                } else if (tx.type === 'send') {
                    mainWalletBalance -= Math.abs(tx.amount);
                }
            }
        }

        // Update wallet balances
        for (const wallet of wallets) {
            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                balance: walletBalances[wallet.id]
            });
        }
        
        // Update main account wallet balance
        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            balance: mainWalletBalance
        });

        // Get sample transactions for debugging
        const sampleTxs = remainingTxs.slice(0, 10).map(tx => ({
            type: tx.type,
            amount: tx.amount,
            address: tx.address,
            memo: tx.memo,
            created: tx.created_date
        }));

        return Response.json({
            success: true,
            oldBalance: account.balance,
            newBalance,
            totalTransactions: allTxs.length,
            duplicatesRemoved: deleted,
            remainingTransactions: remainingTxs.length,
            receivedTotal,
            sentTotal,
            uniqueTxids: txMap.size,
            sampleTransactions: sampleTxs,
            receiveCount: remainingTxs.filter(tx => tx.type === 'receive').length,
            sendCount: remainingTxs.filter(tx => tx.type === 'send').length,
            walletsUpdated: wallets.length,
            transactionsMigrated: migratedCount
        });

    } catch (error) {
        console.error('Recalculate balance error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});