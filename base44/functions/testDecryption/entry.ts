import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function decryptWIF(encryptedKey, passphrase) {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveBits']);
    const derivedKey = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode('wallet_salt'), iterations: 100000 }, passphraseKey, 256);
    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const cryptoKey = await crypto.subtle.importKey('raw', derivedKey, { name: 'AES-GCM' }, false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
    return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const { encryptedKey, passphrase } = body;

        if (!encryptedKey || !passphrase) {
            return Response.json({ error: 'Missing encryptedKey or passphrase' }, { status: 400 });
        }

        console.log('Encrypted key length:', encryptedKey.length);
        console.log('Base64 decoded length:', Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0)).length);
        
        const wif = await decryptWIF(encryptedKey, passphrase);
        return Response.json({ success: true, wif });

    } catch (error) {
        console.error('testDecryption error:', error.message);
        console.error('Stack:', error.stack);
        return Response.json({ error: error.message, details: String(error) }, { status: 500 });
    }
});