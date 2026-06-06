import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const normalizeAddress = (address) => (address || '').trim().toLowerCase();

function buildRpcConnection(config) {
    const SSL_PORTS = new Set(['443', '9443', '8443']);
    const rawHost = (config.host || '').trim();
    const normalizedHost = rawHost.replace(/^https?:\/\//, '').replace(/^https?\/?\/?/, '').replace(/\/$/, '');
    const protocol = (config.use_ssl || rawHost.startsWith('https') || SSL_PORTS.has(String(config.port))) ? 'https' : 'http';
    const rpcUrl = !config.port || config.port === ''
        ? `${protocol}://${normalizedHost}`
        : `${protocol}://${normalizedHost}:${config.port}`;

    const headers = { 'Content-Type': 'application/json' };
    if (config.connection_type === 'api' && config.api_key) {
        headers['X-API-Key'] = config.api_key;
    } else if (config.connection_type === 'rpc' && config.username && config.password) {
        headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    }

    return { rpcUrl, headers };
}

async function rpcCall(rpcUrl, headers, method, params = [], timeoutMs = 20000) {
    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '1.0', id: method, method, params }),
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RPC ${method} failed: HTTP ${response.status} ${errorText.slice(0, 120)}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || `RPC ${method} failed`);
    return data.result;
}

function getOutputAddresses(vout) {
    const script = vout?.scriptPubKey || {};
    return [script.address, ...(script.addresses || [])].filter(Boolean);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        let body = {};
        try { body = await req.json(); } catch (_err) { body = {}; }

        const requestedAddress = (body.address || '').trim();
        const limit = Math.min(Math.max(Number(body.limit || 200), 25), 300);

        let accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) {
            accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: user.id });
        }
        if (accounts.length === 0) {
            return Response.json({ success: false, error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];
        const walletEntities = await base44.asServiceRole.entities.Wallet.filter({ account_id: account.id });
        const ownedAddresses = [
            account.wallet_address,
            ...(account.additional_addresses || []).map((addr) => addr.address),
            ...walletEntities.map((wallet) => wallet.wallet_address)
        ].filter(Boolean);
        const uniqueOwned = [...new Set(ownedAddresses.map((address) => address.trim()))];
        const selectedAddress = requestedAddress || walletEntities.find((wallet) => wallet.is_active)?.wallet_address || account.wallet_address;

        if (!uniqueOwned.some((address) => normalizeAddress(address) === normalizeAddress(selectedAddress))) {
            return Response.json({ success: false, error: 'Address does not belong to this wallet account' }, { status: 403 });
        }

        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({ account_id: account.id, is_active: true });
        if (configs.length === 0) {
            return Response.json({ success: false, error: 'No active RPC configuration' }, { status: 400 });
        }

        const { rpcUrl, headers } = buildRpcConnection(configs[0]);
        const nodeInfo = await rpcCall(rpcUrl, headers, 'getblockchaininfo', [], 15000);

        let walletTransactions = [];
        try {
            walletTransactions = await rpcCall(rpcUrl, headers, 'listtransactions', ['*', limit, 0, true], 30000);
        } catch (_err) {
            walletTransactions = await rpcCall(rpcUrl, headers, 'listtransactions', ['*', limit, 0], 30000);
        }

        const candidateTxIds = [...new Set((walletTransactions || []).map((tx) => tx.txid).filter(Boolean))];
        const transactions = [];
        const rawCache = new Map();

        async function getRawTransaction(txid) {
            if (rawCache.has(txid)) return rawCache.get(txid);
            const raw = await rpcCall(rpcUrl, headers, 'getrawtransaction', [txid, true], 30000);
            rawCache.set(txid, raw);
            return raw;
        }

        async function getInputAddresses(rawTx) {
            const addresses = new Set();
            for (const vin of rawTx.vin || []) {
                if (!vin.txid || vin.vout === undefined) continue;
                try {
                    const prevRaw = await getRawTransaction(vin.txid);
                    const prevOut = prevRaw.vout?.[vin.vout];
                    getOutputAddresses(prevOut).forEach((address) => addresses.add(normalizeAddress(address)));
                } catch (_err) {
                    // Some nodes cannot return older raw transactions unless txindex is enabled.
                }
            }
            return addresses;
        }

        for (const txid of candidateTxIds) {
            let rawTx = null;
            try {
                rawTx = await getRawTransaction(txid);
            } catch (_err) {
                const entries = walletTransactions.filter((tx) => tx.txid === txid && normalizeAddress(tx.address) === normalizeAddress(selectedAddress));
                entries.forEach((entry) => {
                    transactions.push({
                        txid,
                        type: entry.category === 'send' ? 'send' : 'receive',
                        amount: Math.abs(Number(entry.amount || 0)),
                        address: entry.address || selectedAddress,
                        time: entry.time ? new Date(entry.time * 1000).toISOString() : null,
                        confirmations: entry.confirmations || 0,
                        fee: Math.abs(Number(entry.fee || 0)),
                        source: 'node-listtransactions'
                    });
                });
                continue;
            }

            const inputAddresses = await getInputAddresses(rawTx);
            const selectedLower = normalizeAddress(selectedAddress);
            const sentFromSelected = inputAddresses.has(selectedLower);
            const receivedOutputs = (rawTx.vout || []).filter((vout) => getOutputAddresses(vout).some((address) => normalizeAddress(address) === selectedLower));
            const receivedAmount = receivedOutputs.reduce((sum, vout) => sum + Number(vout.value || 0), 0);
            const outgoingAmount = sentFromSelected
                ? (rawTx.vout || [])
                    .filter((vout) => !getOutputAddresses(vout).some((address) => normalizeAddress(address) === selectedLower))
                    .reduce((sum, vout) => sum + Number(vout.value || 0), 0)
                : 0;

            const nodeEntry = walletTransactions.find((tx) => tx.txid === txid) || {};
            if (receivedAmount > 0) {
                transactions.push({
                    txid,
                    type: 'receive',
                    amount: parseFloat(receivedAmount.toFixed(8)),
                    address: selectedAddress,
                    time: rawTx.time ? new Date(rawTx.time * 1000).toISOString() : (nodeEntry.time ? new Date(nodeEntry.time * 1000).toISOString() : null),
                    confirmations: Number(nodeEntry.confirmations || rawTx.confirmations || 0),
                    fee: 0,
                    source: 'node-rawtransaction'
                });
            }

            if (outgoingAmount > 0) {
                const firstRecipient = (rawTx.vout || []).find((vout) => !getOutputAddresses(vout).some((address) => normalizeAddress(address) === selectedLower));
                transactions.push({
                    txid,
                    type: 'send',
                    amount: parseFloat(outgoingAmount.toFixed(8)),
                    address: getOutputAddresses(firstRecipient)[0] || 'External address',
                    time: rawTx.time ? new Date(rawTx.time * 1000).toISOString() : (nodeEntry.time ? new Date(nodeEntry.time * 1000).toISOString() : null),
                    confirmations: Number(nodeEntry.confirmations || rawTx.confirmations || 0),
                    fee: Math.abs(Number(nodeEntry.fee || 0)),
                    source: 'node-rawtransaction'
                });
            }
        }

        const sortedTransactions = transactions
            .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
            .slice(0, limit);

        const summary = {
            address: selectedAddress,
            count: sortedTransactions.length,
            received: parseFloat(sortedTransactions.filter((tx) => tx.type === 'receive').reduce((sum, tx) => sum + tx.amount, 0).toFixed(8)),
            sent: parseFloat(sortedTransactions.filter((tx) => tx.type === 'send').reduce((sum, tx) => sum + tx.amount, 0).toFixed(8)),
            nodeBlocks: nodeInfo.blocks,
            chain: nodeInfo.chain,
            source: 'ROD Core RPC'
        };

        return Response.json({ success: true, summary, transactions: sortedTransactions });
    } catch (error) {
        console.error('getNodeTransactionHistory error:', error);
        return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
    }
});