import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { address, passphrase = "" } = await req.json();
        if (!address) return Response.json({ error: 'Address is required' }, { status: 400 });

        // Use service role to read wallet data
        const wallets = await base44.asServiceRole.entities.Wallet.filter({ wallet_address: address });
        if (wallets.length === 0) {
            return Response.json({ error: 'Wallet not found or access denied' }, { status: 404 });
        }

        const wallet = wallets[0];

        // Basic ownership check
        if (wallet.account_id) {
            const account = await base44.asServiceRole.entities.WalletAccount.get(wallet.account_id);
            if (account.email !== user.email) {
                return Response.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        return Response.json({
            success: true,
            wallet_address: wallet.wallet_address,
            encrypted_private_key: wallet.encrypted_private_key,
            note: "Private key is encrypted. Use passphrase to decrypt if needed."
        });

    } catch (error) {
        console.error('exportPrivateKey error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});