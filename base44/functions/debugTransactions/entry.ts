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

        // Group and analyze transactions
        const receives = allTxs.filter(tx => tx.type === 'receive');
        const sends = allTxs.filter(tx => tx.type === 'send');

        const receivedTotal = receives.reduce((sum, tx) => sum + tx.amount, 0);
        const sentTotal = sends.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const calculatedBalance = receivedTotal - sentTotal;

        // Get top 50 transactions by amount
        const topTransactions = [...allTxs]
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 50)
            .map(tx => ({
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                address: tx.address,
                memo: tx.memo,
                confirmations: tx.confirmations,
                created_date: tx.created_date
            }));

        return Response.json({
            totalTransactions: allTxs.length,
            receiveCount: receives.length,
            sendCount: sends.length,
            receivedTotal,
            sentTotal,
            calculatedBalance,
            currentStoredBalance: account.balance,
            difference: Math.abs(calculatedBalance - account.balance),
            topTransactions
        });

    } catch (error) {
        console.error('Debug transactions error:', error);
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});