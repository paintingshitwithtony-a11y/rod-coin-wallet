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

async function rpcCall(rpcUrl, headers, method, params = [], timeoutMs = 15000) {
    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            jsonrpc: '1.0',
            id: method,
            method,
            params
        }),
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RPC ${method} failed: HTTP ${response.status} ${errorText.slice(0, 120)}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message || `RPC ${method} failed`);
    }

    return data.result;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body = {};
        try {
            body = await req.json();
        } catch (_err) {
            body = {};
        }

        let accounts = body.accountId
            ? await base44.asServiceRole.entities.WalletAccount.filter({ id: body.accountId })
            : await base44.asServiceRole.entities.WalletAccount.filter({ email: user.email });
        if (accounts.length === 0) {
            accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: user.id });
        }

        if (accounts.length === 0) {
            return Response.json({ success: false, error: 'Wallet not found' }, { status: 404 });
        }

        const account = accounts[0];
        const configs = await base44.asServiceRole.entities.RPCConfiguration.filter({
            account_id: account.id,
            is_active: true
        });

        if (configs.length === 0) {
            return Response.json({ success: false, error: 'No active RPC configuration' }, { status: 400 });
        }

        const deletedWalletAddressKeys = new Set((account.deleted_wallet_addresses || []).map(normalizeAddress));
        const addresses = [
            { address: account.wallet_address, label: 'Primary Address', source: 'account' },
            ...(account.additional_addresses || [])
                .filter((addr) => !deletedWalletAddressKeys.has(normalizeAddress(addr.address)))
                .map((addr) => ({
                    address: addr.address,
                    label: addr.label || 'Additional Address',
                    source: 'additional'
                }))
        ];

        const wallets = await base44.asServiceRole.entities.Wallet.filter({ account_id: account.id });
        wallets
            .filter((wallet) => !deletedWalletAddressKeys.has(normalizeAddress(wallet.wallet_address)))
            .forEach((wallet) => {
                addresses.push({
                    address: wallet.wallet_address,
                    label: wallet.name || 'Wallet Address',
                    source: 'wallet'
                });
            });

        const uniqueAddresses = [];
        const seen = new Set();
        addresses.forEach((item) => {
            const key = normalizeAddress(item.address);
            if (!key || seen.has(key)) return;
            seen.add(key);
            uniqueAddresses.push(item);
        });

        const { rpcUrl, headers } = buildRpcConnection(configs[0]);
        let nodeInfo = null;
        try {
            nodeInfo = await rpcCall(rpcUrl, headers, 'getblockchaininfo', [], 15000);
        } catch (_err) {
            nodeInfo = null;
        }

        const results = [];
        for (const item of uniqueAddresses) {
            let walletInfo = null;
            let infoError = null;
            try {
                walletInfo = await rpcCall(rpcUrl, headers, 'getaddressinfo', [item.address], 15000);
            } catch (err) {
                try {
                    walletInfo = await rpcCall(rpcUrl, headers, 'validateaddress', [item.address], 15000);
                } catch (fallbackErr) {
                    infoError = fallbackErr.message || err.message;
                }
            }

            let utxos = [];
            let balanceError = null;
            try {
                utxos = await rpcCall(rpcUrl, headers, 'listunspent', [0, 9999999, [item.address], true], 15000);
            } catch (err) {
                balanceError = err.message;
            }

            const balance = parseFloat((Array.isArray(utxos) ? utxos : [])
                .filter((utxo) => normalizeAddress(utxo.address) === normalizeAddress(item.address))
                .reduce((sum, utxo) => sum + Number(utxo.amount || 0), 0)
                .toFixed(8));

            const isImported = !!(walletInfo?.ismine || walletInfo?.iswatchonly || walletInfo?.solvable || walletInfo?.label || (Array.isArray(walletInfo?.labels) && walletInfo.labels.length > 0));
            const status = infoError || balanceError
                ? 'error'
                : isImported
                    ? 'imported'
                    : 'missing';

            results.push({
                address: item.address,
                label: item.label,
                source: item.source,
                status,
                imported: isImported,
                balance,
                utxoCount: Array.isArray(utxos) ? utxos.length : 0,
                isMine: !!walletInfo?.ismine,
                isWatchOnly: !!walletInfo?.iswatchonly,
                solvable: !!walletInfo?.solvable,
                error: infoError || balanceError || null
            });
        }

        const summary = {
            total: results.length,
            imported: results.filter((result) => result.status === 'imported').length,
            missing: results.filter((result) => result.status === 'missing').length,
            errors: results.filter((result) => result.status === 'error').length,
            totalBalance: parseFloat(results.reduce((sum, result) => sum + Number(result.balance || 0), 0).toFixed(8)),
            nodeBlocks: nodeInfo?.blocks,
            chain: nodeInfo?.chain,
            verificationTime: new Date().toISOString()
        };

        return Response.json({ success: true, summary, results });
    } catch (error) {
        console.error('diagnoseAddressImports error:', error);
        return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
    }
});