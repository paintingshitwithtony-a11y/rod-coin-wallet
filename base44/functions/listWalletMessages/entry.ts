import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        let body = {};
        try {
            body = await req.json();
        } catch (_err) {
            body = {};
        }

        const accountId = body.accountId;
        if (!accountId) {
            return Response.json({ success: false, error: 'Wallet account is required' }, { status: 400 });
        }

        const inbox = await base44.asServiceRole.entities.WalletMessage.filter({ recipient_account_id: accountId }, '-created_date', 100);
        const sent = await base44.asServiceRole.entities.WalletMessage.filter({ sender_account_id: accountId }, '-created_date', 100);

        return Response.json({ success: true, inbox, sent });
    } catch (error) {
        console.error('listWalletMessages error:', error);
        return Response.json({ success: false, error: error.message || 'Failed to load messages' }, { status: 500 });
    }
});