/**
 * createRootWallet — Creates and encrypts a new root wallet at the node level.
 * Returns the address, passphrase, and private key for user backup.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function rpcCall(rpcUrl, rpcAuth, method, params) {
    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${rpcAuth}`
        },
        body: JSON.stringify({ jsonrpc: '1.0', id: method, method, params }),
        signal: AbortSignal.timeout(30000)
    });
    const data = await response.json();
    if (data.error) throw new Error(`RPC ${method} failed: ${data.error.message}`);
    return data.result;
}

function buildRpcUrl(rpcConfig) {
    const host = rpcConfig.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    const SSL_PORTS = new Set(['443', '9443', '8443']);
    const protocol = (rpcConfig.use_ssl || rpcConfig.host.startsWith('https') || SSL_PORTS.has(String(rpcConfig.port))) ? 'https' : 'http';
    return `${protocol}://${host}:${rpcConfig.port}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { passphrase } = await req.json();
        if (!passphrase || passphrase.trim().length === 0) {
            return Response.json({ error: 'Passphrase is required' }, { status: 400 });
        }

        // Load account
        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        const account = accounts[0];

        // Load active RPC config
        const rpcConfigs = await base44.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (rpcConfigs.length === 0) {
            return Response.json({ error: 'No active RPC configuration found' }, { status: 500 });
        }
        const rpcConfig = rpcConfigs[0];
        const rpcUrl = buildRpcUrl(rpcConfig);
        const rpcAuth = btoa(`${rpcConfig.username}:${rpcConfig.password}`);

        // Step 1: Generate new address
         const address = await rpcCall(rpcUrl, rpcAuth, 'getnewaddress', ['Root Wallet']);

         // Step 2: Encrypt the wallet with the provided passphrase (skip if already encrypted)
         const walletIsEncrypted = await new Promise(async (resolve) => {
             try {
                 await rpcCall(rpcUrl, rpcAuth, 'getinfo', []);
                 resolve(false);
             } catch (e) {
                 // If getinfo fails, wallet might be encrypted
                 resolve(true);
             }
         });

         if (!walletIsEncrypted) {
             try {
                 await rpcCall(rpcUrl, rpcAuth, 'encryptwallet', [passphrase]);
             } catch (e) {
                 const msg = (e.message || '').toLowerCase();
                 if (!msg.includes('already encrypted')) {
                     return Response.json({ error: `Failed to encrypt wallet: ${e.message}` }, { status: 500 });
                 }
             }
         }

        // Step 3: Get the private key for this address
         let privateKey = '';

         // If wallet is encrypted, unlock it temporarily
         if (walletIsEncrypted) {
             try {
                 await rpcCall(rpcUrl, rpcAuth, 'walletpassphrase', [passphrase, 30]);
             } catch (unlockError) {
                 console.warn('Could not unlock wallet:', unlockError.message);
             }
         }

         try {
             privateKey = await rpcCall(rpcUrl, rpcAuth, 'dumpprivkey', [address]);
         } catch (e) {
             // dumpprivkey might not be available on all node types
             // Log but continue - user can export via other methods
             console.warn('Could not retrieve private key via dumpprivkey:', e.message);
             // Try alternative export methods if available
             try {
                 const result = await rpcCall(rpcUrl, rpcAuth, 'exportprivkey', [address, passphrase]);
                 privateKey = result;
             } catch (altError) {
                 console.warn('Alternative export also failed:', altError.message);
             }
         }

        // Step 4: Create wallet record in database
        const wallet = await base44.entities.Wallet.create({
            account_id: account.id,
            name: 'Root Wallet',
            wallet_address: address,
            public_key_hash: address,
            encrypted_private_key: privateKey,
            encrypted_seed_phrase: '',
            balance: 0,
            is_active: false,
            wallet_type: 'standard',
            color: 'from-red-500 to-red-700',
            icon: null,
            additional_addresses: []
        });

        return Response.json({
            success: true,
            address,
            privateKey,
            passphrase,
            walletId: wallet.id,
            walletName: wallet.name
        });

    } catch (error) {
        console.error('createRootWallet error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});