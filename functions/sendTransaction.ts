import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipient, amount, fee, memo } = await req.json();

        // Validate inputs
        if (!recipient || !amount || amount <= 0) {
            return Response.json({ error: 'Invalid transaction parameters' }, { status: 400 });
        }

        // Get user's wallet account
        const accounts = await base44.entities.WalletAccount.filter({ 
            email: user.email 
        });

        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];

        // Get RPC credentials from user account (fallback to env)
        const rpcHost = account.rpc_host || Deno.env.get('ROD_RPC_HOST');
        const rpcPort = account.rpc_port || Deno.env.get('ROD_RPC_PORT');
        const rpcUser = account.rpc_username || Deno.env.get('ROD_RPC_USERNAME');
        const rpcPass = account.rpc_password || Deno.env.get('ROD_RPC_PASSWORD');

        if (!rpcHost || !rpcPort || !rpcUser || !rpcPass) {
            return Response.json({ 
                error: 'RPC credentials not configured. Please set up ROD Core RPC connection.'
            }, { status: 500 });
        }

        // Check balance
        if (account.balance < (amount + fee)) {
            return Response.json({ 
                error: 'Insufficient balance',
                required: amount + fee,
                available: account.balance
            }, { status: 400 });
        }

        // Send transaction via ROD Core RPC
        const rpcUrl = `http://${rpcHost}:${rpcPort}`;
        const rpcAuth = btoa(`${rpcUser}:${rpcPass}`);
        
        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${rpcAuth}`
            },
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'sendTransaction',
                method: 'sendtoaddress',
                params: [
                    recipient,
                    amount,
                    memo || '',
                    '',
                    false
                ]
            })
        });

        if (!rpcResponse.ok) {
            const errorText = await rpcResponse.text();
            return Response.json({ 
                error: 'Failed to broadcast transaction',
                details: errorText
            }, { status: 500 });
        }

        const rpcData = await rpcResponse.json();
        
        if (rpcData.error) {
            return Response.json({ 
                error: 'Transaction failed',
                details: rpcData.error.message
            }, { status: 500 });
        }

        const txid = rpcData.result;

        // Record transaction in database
        const transaction = await base44.entities.Transaction.create({
            account_id: account.id,
            type: 'send',
            amount: -amount,
            fee: fee,
            address: recipient,
            memo: memo ? `${memo} | TxID: ${txid}` : `TxID: ${txid}`,
            confirmations: 0,
            status: 'pending'
        });

        // Update account balance
        const newBalance = account.balance - amount - fee;
        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            balance: newBalance
        });

        return Response.json({ 
            success: true,
            txid,
            transaction,
            newBalance
        });

    } catch (error) {
        console.error('Send transaction error:', error);
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});