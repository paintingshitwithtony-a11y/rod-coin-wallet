import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accounts = await base44.entities.WalletAccount.filter({ 
            email: user.email 
        });

        if (accounts.length === 0) {
            return Response.json({ error: 'Account not found' }, { status: 404 });
        }

        const account = accounts[0];
        const primaryAddress = account.wallet_address;
        const additionalAddresses = account.additional_addresses || [];

        // Remove primary address from additional_addresses if it exists
        const cleanedAddresses = additionalAddresses.filter(
            addr => addr.address !== primaryAddress
        );

        const removed = additionalAddresses.length - cleanedAddresses.length;

        if (removed > 0) {
            await base44.entities.WalletAccount.update(account.id, {
                additional_addresses: cleanedAddresses
            });
        }

        return Response.json({
            success: true,
            removed,
            message: removed > 0 ? `Removed ${removed} duplicate(s)` : 'No duplicates found'
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});