import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { walletAddress } = body;

        if (!walletAddress) {
            return Response.json({ error: 'walletAddress is required' }, { status: 400 });
        }

        // Find wallet account by address
        const accounts = await base44.entities.WalletAccount.filter({ wallet_address: walletAddress });
        
        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];
        
        return Response.json({
            success: true,
            email: account.email,
            walletAddress: account.wallet_address,
            encryptedPrivateKey: account.encrypted_private_key,
            hasEncryptedKey: !!account.encrypted_private_key
        });

    } catch (error) {
        console.error('debugWallet error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});