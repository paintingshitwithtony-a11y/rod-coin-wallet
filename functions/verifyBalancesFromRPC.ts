import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const makeRPCCall = async (method, params) => {
    const rpcHost = Deno.env.get('ROD_RPC_HOST');
    const rpcPort = Deno.env.get('ROD_RPC_PORT');
    const rpcUsername = Deno.env.get('ROD_RPC_USERNAME');
    const rpcPassword = Deno.env.get('ROD_RPC_PASSWORD');

    if (!rpcHost || !rpcPort || !rpcUsername || !rpcPassword) {
        throw new Error('RPC configuration missing');
    }

    const auth = btoa(`${rpcUsername}:${rpcPassword}`);
    const url = `http://${rpcHost}:${rpcPort}/`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: method,
            params: params
        })
    });

    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error.message || 'RPC error');
    }

    return data.result;
};

const getRPCBalance = async (address) => {
    try {
        const received = await makeRPCCall('getreceivedbyaddress', [address, 0]);
        const sent = await makeRPCCall('getsentbyaddress', [address]);
        
        const balance = received - sent;
        return balance > 0 ? balance : 0;
    } catch (err) {
        console.error(`RPC balance calculation error for address ${address}:`, err);
        return null;
    }
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's account
        const accounts = await base44.entities.WalletAccount.filter({ 
            email: user.email 
        });

        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        }

        const account = accounts[0];

        // Get all wallets
        const wallets = await base44.entities.Wallet.filter({ 
            account_id: account.id 
        });

        // Prepare list of wallets to check (main account + created wallets)
        const walletsToCheck = [
            {
                id: 'main-account',
                name: 'Main Wallet',
                address: account.wallet_address,
                stored_balance: account.balance || 0
            },
            ...wallets.map(w => ({
                id: w.id,
                name: w.name,
                address: w.wallet_address,
                stored_balance: w.balance || 0
            }))
        ];

        // Verify balances from RPC
        const verificationResults = [];
        for (const wallet of walletsToCheck) {
            try {
                const rpcBalance = await getRPCBalance(wallet.address);
                const discrepancy = Math.abs(rpcBalance - wallet.stored_balance);
                
                verificationResults.push({
                    id: wallet.id,
                    name: wallet.name,
                    address: wallet.address,
                    stored_balance: wallet.stored_balance,
                    rpc_balance: rpcBalance,
                    discrepancy: discrepancy,
                    matches: discrepancy < 0.00001, // Allow for floating point errors
                    status: discrepancy < 0.00001 ? 'OK' : 'MISMATCH'
                });
            } catch (err) {
                console.error(`Failed to verify ${wallet.name}:`, err);
                verificationResults.push({
                    id: wallet.id,
                    name: wallet.name,
                    address: wallet.address,
                    stored_balance: wallet.stored_balance,
                    rpc_balance: null,
                    error: err.message,
                    status: 'ERROR'
                });
            }
        }

        const mismatches = verificationResults.filter(r => r.status === 'MISMATCH');
        const errors = verificationResults.filter(r => r.status === 'ERROR');

        return Response.json({
            success: true,
            verification_results: verificationResults,
            summary: {
                total_wallets: verificationResults.length,
                verified: verificationResults.filter(r => r.status === 'OK').length,
                mismatches: mismatches.length,
                errors: errors.length
            },
            mismatches_details: mismatches
        });

    } catch (error) {
        console.error('Verification error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});