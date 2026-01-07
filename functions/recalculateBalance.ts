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

        // Get all transactions
        const allTxs = await base44.entities.Transaction.filter(
            { account_id: account.id },
            '-created_date',
            10000
        );

        console.log(`Total transactions found: ${allTxs.length}`);

        // Group by txid to find duplicates
        const txidMap = new Map();
        const duplicates = [];

        for (const tx of allTxs) {
            // Extract txid from memo (format: "TxID: xxx")
            const txidMatch = tx.memo?.match(/TxID:\s*([a-f0-9]+)/i);
            const txid = txidMatch ? txidMatch[1] : null;

            if (txid) {
                if (txidMap.has(txid)) {
                    // This is a duplicate
                    duplicates.push(tx.id);
                } else {
                    // First occurrence, keep it
                    txidMap.set(txid, tx);
                }
            }
        }

        console.log(`Found ${duplicates.length} duplicate transactions`);

        // Delete duplicates
        let deleted = 0;
        for (const dupId of duplicates) {
            try {
                await base44.entities.Transaction.delete(dupId);
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

        return Response.json({
            success: true,
            oldBalance: account.balance,
            newBalance,
            totalTransactions: allTxs.length,
            duplicatesRemoved: deleted,
            remainingTransactions: remainingTxs.length,
            receivedTotal,
            sentTotal,
            uniqueTxids: txidMap.size
        });

    } catch (error) {
        console.error('Recalculate balance error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});