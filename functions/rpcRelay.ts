/**
 * rpcRelay — Backend RPC relay using environment-variable credentials.
 * Used as fallback for Electron/local setups where per-user RPC config is not set.
 *
 * Same strict allowlist as executeRPCCommand applies here.
 * Credentials come from server-side environment variables only — never from the client.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Strict allowlist — only safe read-only methods
const ALLOWED_METHODS = new Set([
    'getblockchaininfo',
    'getblockcount',
    'getnetworkinfo',
    'getpeerinfo',
    'listunspent',
    'gettransaction',
    'getrawtransaction',
    'decoderawtransaction',
    'validateaddress',
    'getmempoolinfo',
    'getdifficulty',
    'getmininginfo',
    'getbestblockhash',
    'getblock',
    'listtransactions',
    'getnettotals'
]);

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { method, params = [] } = await req.json();

        if (!method) return Response.json({ error: 'Method is required' }, { status: 400 });

        if (!ALLOWED_METHODS.has(method.toLowerCase())) {
            return Response.json({
                error: `Method '${method}' is not permitted via this relay.`
            }, { status: 403 });
        }

        const rpcHost = (Deno.env.get('ROD_RPC_HOST') || 'localhost').trim();
        const rpcPort = (Deno.env.get('ROD_RPC_PORT') || '9766').trim();
        const rpcUser = Deno.env.get('ROD_RPC_USERNAME')?.trim();
        const rpcPass = Deno.env.get('ROD_RPC_PASSWORD')?.trim();

        const rpcUrl = `http://${rpcHost}:${rpcPort}/`;
        const rpcAuth = btoa(`${rpcUser}:${rpcPass}`);

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${rpcAuth}`
            },
            body: JSON.stringify({ jsonrpc: '1.0', id: Date.now(), method, params }),
            signal: AbortSignal.timeout(25000)
        });

        if (!response.ok) {
            return Response.json({ error: `RPC server error: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();
        if (data.error) {
            return Response.json({ error: data.error.message || 'RPC error' }, { status: 400 });
        }
        return Response.json({ success: true, result: data.result });

    } catch (error) {
        console.error('rpcRelay error:', error.message);
        return Response.json({ error: error.message || 'RPC relay failed' }, { status: 500 });
    }
});