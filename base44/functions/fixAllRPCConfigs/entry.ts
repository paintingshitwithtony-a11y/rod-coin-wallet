import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== SAFE RPC CLEANUP ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        let deleted = 0;
        let fixed = 0;

        // 1. Clean bad RPCConfiguration entries
        const allConfigs = await base44.asServiceRole.entities.RPCConfiguration.list('', 1000);
        for (const config of allConfigs) {
            const portStr = String(config.port || '').trim();
            const host = String(config.host || '').trim();

            if (portStr === '8332' || portStr === '8333' || host.includes('64.188.22.190')) {
                console.log(`🗑️ Deleting bad config: ${config.name || 'Unnamed'} (${host}:${portStr})`);
                await base44.asServiceRole.entities.RPCConfiguration.delete(config.id);
                deleted++;
            }
        }

        // 2. Fix WalletAccount RPC fields (does NOT delete wallets)
        const allAccounts = await base44.asServiceRole.entities.WalletAccount.list('', 1000);
        for (const account of allAccounts) {
            const rpcPort = String(account.rpc_port || '').trim();
            const rpcHost = String(account.rpc_host || '').trim();

            if (rpcPort === '8332' || rpcHost.includes('64.188.22.190')) {
                console.log(`Fixing WalletAccount ${account.id}`);
                await base44.asServiceRole.entities.WalletAccount.update(account.id, {
                    rpc_host: 'rodcoinwallet.duckdns.org',
                    rpc_port: '443',
                    rpc_username: 'roduser'
                });
                fixed++;
            }
        }

        return Response.json({
            success: true,
            message: `✅ Deleted ${deleted} bad RPC configs | Fixed ${fixed} WalletAccount records`,
            deleted,
            fixed
        });

    } catch (error) {
        console.error('Safe cleanup error:', error);
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});