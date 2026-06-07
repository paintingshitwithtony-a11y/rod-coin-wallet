import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet not found', newDeposits: [] }, { status: 404 });
        }

        const account = accounts[0];
        const configs = await base44.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (configs.length === 0) {
            return Response.json({ error: 'No active RPC configuration', newDeposits: [] });
        }

        const config = configs[0];
        const wallets = await base44.entities.Wallet.filter({ account_id: account.id });
        const walletByAddress = new Map(wallets.map((wallet) => [wallet.wallet_address, wallet]));
        const addresses = Array.from(new Set([
            account.wallet_address,
            ...(account.additional_addresses || []).map((addr) => addr.address),
            ...wallets.map((wallet) => wallet.wallet_address)
        ].filter(Boolean)));

        const SSL_PORTS = new Set(['443', '9443', '8443']);
        const rawHost = (config.host || '').trim();
        const normalizedHost = rawHost.replace(/^https?:\/\//, '').replace(/^https?\/?\/?/, '').replace(/\/$/, '');
        const protocol = (config.use_ssl || rawHost.startsWith('https') || SSL_PORTS.has(String(config.port))) ? 'https' : 'http';
        const rpcUrl = !config.port || config.port === '' ? `${protocol}://${normalizedHost}` : `${protocol}://${normalizedHost}:${config.port}`;

        const headers = { 'Content-Type': 'application/json' };
        if (config.connection_type === 'api' && config.api_key) {
            headers['X-API-Key'] = config.api_key;
        } else if (config.connection_type === 'rpc' && config.username && config.password) {
            headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
        }

        const rpcResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'checkDeposits',
                method: 'listtransactions',
                params: ['*', 100, 0, true]
            })
        });

        if (!rpcResponse.ok) {
            return Response.json({ success: false, error: 'RPC request failed', newDeposits: [], addressesMonitored: addresses.length });
        }

        const rpcData = await rpcResponse.json();
        const addressSet = new Set(addresses);
        const receiveTxs = (rpcData.result || []).filter((tx) =>
            tx.category === 'receive' &&
            addressSet.has(tx.address) &&
            tx.confirmations >= 1 &&
            tx.txid
        );

        if (receiveTxs.length === 0) {
            return Response.json({ success: true, newDeposits: [], addressesMonitored: addresses.length });
        }

        const existingTransactions = await base44.entities.Transaction.filter(
            { account_id: account.id, type: 'receive' },
            '-created_date',
            9999
        );
        const existingTxids = new Set(existingTransactions.map((tx) => {
            const match = String(tx.memo || '').match(/TxID:\s*([^\s]+)/);
            return match ? match[1] : null;
        }).filter(Boolean));

        const seenInRun = new Set();
        const newTransactions = [];
        const newDeposits = [];
        const walletBalanceUpdates = new Map();
        let accountBalanceIncrease = 0;

        for (const tx of receiveTxs.slice(0, 25)) {
            if (existingTxids.has(tx.txid) || seenInRun.has(tx.txid)) continue;
            seenInRun.add(tx.txid);

            const wallet = walletByAddress.get(tx.address);
            newTransactions.push({
                account_id: account.id,
                wallet_id: wallet?.id || null,
                wallet_address: tx.address,
                type: 'receive',
                amount: tx.amount,
                fee: 0,
                address: tx.address,
                memo: `TxID: ${tx.txid}`,
                confirmations: tx.confirmations,
                status: tx.confirmations >= 6 ? 'confirmed' : 'pending'
            });

            newDeposits.push({
                amount: tx.amount,
                address: tx.address,
                confirmations: tx.confirmations,
                txid: tx.txid
            });

            accountBalanceIncrease += Number(tx.amount || 0);
            if (wallet) {
                walletBalanceUpdates.set(wallet.id, (walletBalanceUpdates.get(wallet.id) || 0) + Number(tx.amount || 0));
            }
        }

        if (newTransactions.length > 0) {
            await base44.asServiceRole.entities.Transaction.bulkCreate(newTransactions);
            await base44.asServiceRole.entities.WalletAccount.update(account.id, {
                balance: Number(account.balance || 0) + accountBalanceIncrease
            });

            for (const [walletId, increase] of walletBalanceUpdates.entries()) {
                const wallet = wallets.find((item) => item.id === walletId);
                if (wallet) {
                    await base44.asServiceRole.entities.Wallet.update(walletId, {
                        balance: Number(wallet.balance || 0) + increase
                    });
                }
            }
        }

        return Response.json({
            success: true,
            newDeposits,
            addressesMonitored: addresses.length
        });
    } catch (error) {
        console.error('Check deposits error:', error);
        const isRateLimit = String(error.message || '').toLowerCase().includes('rate limit') || error.status === 429;
        return Response.json({
            error: isRateLimit ? 'Sync is temporarily limited. Please wait a moment and try again.' : error.message,
            newDeposits: []
        }, { status: isRateLimit ? 429 : 500 });
    }
});