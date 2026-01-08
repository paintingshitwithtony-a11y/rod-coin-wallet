import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { startDate, endDate } = await req.json();

        if (!startDate) {
            return Response.json({ error: 'Start date required' }, { status: 400 });
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

        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date(startDate);
        end.setHours(23, 59, 59, 999);

        // Find transactions in date range
        const toDelete = allTxs.filter(tx => {
            const txDate = new Date(tx.created_date);
            return txDate >= start && txDate <= end;
        });

        console.log(`Found ${toDelete.length} transactions between ${start} and ${end}`);

        // Delete transactions
        let deleted = 0;
        for (const tx of toDelete) {
            try {
                await base44.asServiceRole.entities.Transaction.delete(tx.id);
                deleted++;
            } catch (err) {
                console.error(`Failed to delete ${tx.id}:`, err);
            }
        }

        // Recalculate balance
        const remainingTxs = await base44.entities.Transaction.filter(
            { account_id: account.id },
            '-created_date',
            10000
        );

        let newBalance = 0;
        for (const tx of remainingTxs) {
            if (tx.type === 'receive') {
                newBalance += tx.amount;
            } else if (tx.type === 'send') {
                newBalance -= Math.abs(tx.amount);
            }
        }

        // Update account balance
        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            balance: newBalance
        });

        return Response.json({
            success: true,
            deleted,
            newBalance,
            remainingTransactions: remainingTxs.length
        });

    } catch (error) {
        console.error('Delete transactions error:', error);
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});