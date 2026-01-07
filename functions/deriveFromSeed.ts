import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { seed_phrase } = await req.json();

        if (!seed_phrase || typeof seed_phrase !== 'string') {
            return Response.json({ error: 'Seed phrase is required' }, { status: 400 });
        }

        const words = seed_phrase.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
            return Response.json({ 
                error: 'Invalid seed phrase length. Must be 12 or 24 words.' 
            }, { status: 400 });
        }

        // Create a deterministic hash from the seed phrase to generate the private key
        const encoder = new TextEncoder();
        const data = encoder.encode(seed_phrase.trim().toLowerCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const privateKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Generate address from private key hash (simplified - in production use proper BIP39/BIP44 derivation)
        const addressHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(privateKey));
        const addressHashArray = Array.from(new Uint8Array(addressHashBuffer));
        
        // ROD address format: R + base58 encoded hash
        const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let address = 'R';
        for (let i = 0; i < 33; i++) {
            const byte = addressHashArray[i % addressHashArray.length];
            address += base58Chars[byte % base58Chars.length];
        }

        return Response.json({
            address,
            private_key: privateKey
        });

    } catch (error) {
        console.error('Seed derivation error:', error);
        return Response.json({ 
            error: 'Failed to derive wallet from seed phrase',
            details: error.message 
        }, { status: 500 });
    }
});