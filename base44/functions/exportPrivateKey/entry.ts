import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { address, passphrase = "" } = await req.json();

        if (!address) return Response.json({ error: 'Address is required' }, { status: 400 });

        // Find the wallet
        const wallets = await base44.asServiceRole.entities.Wallet.filter({ wallet_address: address });
        if (wallets.length === 0) return Response.json({ error: 'Wallet not found' }, { status: 404 });

        const wallet = wallets[0];

        // For now, return encrypted key (we can add decryption later if needed)
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