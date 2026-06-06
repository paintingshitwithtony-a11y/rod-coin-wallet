import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function deleteAll(entityApi, query) {
    const records = await entityApi.filter(query, '-created_date', 1000);
    await Promise.all(records.map((record) => entityApi.delete(record.id)));
    return records.length;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { accountId, sessionToken, confirmation } = await req.json();

        if (confirmation !== 'DELETE') {
            return Response.json({ error: 'Type DELETE to confirm account deletion' }, { status: 400 });
        }
        if (!accountId || !sessionToken) {
            return Response.json({ error: 'Missing wallet session' }, { status: 400 });
        }

        const sessions = await base44.asServiceRole.entities.UserSession.filter({
            account_id: accountId,
            session_token: sessionToken
        });
        if (sessions.length === 0) {
            return Response.json({ error: 'Wallet session expired. Please log in again.' }, { status: 401 });
        }

        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: accountId });
        if (accounts.length === 0) {
            return Response.json({ error: 'Wallet account not found' }, { status: 404 });
        }

        const deleted = {
            wallets: await deleteAll(base44.asServiceRole.entities.Wallet, { account_id: accountId }),
            transactions: await deleteAll(base44.asServiceRole.entities.Transaction, { account_id: accountId }),
            contacts: await deleteAll(base44.asServiceRole.entities.AddressBook, { account_id: accountId }),
            rpcConfigs: await deleteAll(base44.asServiceRole.entities.RPCConfiguration, { account_id: accountId }),
            sessions: await deleteAll(base44.asServiceRole.entities.UserSession, { account_id: accountId })
        };

        await base44.asServiceRole.entities.WalletAccount.delete(accountId);

        return Response.json({ success: true, deleted });
    } catch (error) {
        console.error('deleteWalletAccount error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});