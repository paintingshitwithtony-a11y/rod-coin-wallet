import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const normalizeAddress = (address) => (address || '').trim().toLowerCase();

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const accountId = body.accountId;
        const partnerAccountId = body.partnerAccountId;
        const partnerAddress = (body.partnerAddress || '').trim();

        if (!accountId || !partnerAccountId || !partnerAddress) {
            return Response.json({ success: false, error: 'Conversation details are required' }, { status: 400 });
        }

        let accounts = [];
        try {
            accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: accountId });
        } catch (_err) {
            accounts = [];
        }
        if (accounts.length === 0 || accounts[0].email !== user.email) {
            return Response.json({ success: false, error: 'Wallet account not found' }, { status: 404 });
        }

        const targetAddress = normalizeAddress(partnerAddress);
        const inbox = await base44.asServiceRole.entities.WalletMessage.filter({ recipient_account_id: accountId }, '-created_date', 200);
        const sent = await base44.asServiceRole.entities.WalletMessage.filter({ sender_account_id: accountId }, '-created_date', 200);

        const inboxMatches = inbox.filter((message) =>
            message.sender_account_id === partnerAccountId &&
            normalizeAddress(message.sender_wallet_address) === targetAddress &&
            !message.deleted_by_recipient
        );
        const sentMatches = sent.filter((message) =>
            message.recipient_account_id === partnerAccountId &&
            normalizeAddress(message.recipient_wallet_address) === targetAddress &&
            !message.deleted_by_sender
        );

        await Promise.all([
            ...inboxMatches.map((message) => base44.asServiceRole.entities.WalletMessage.update(message.id, { deleted_by_recipient: true, read_by_recipient: true })),
            ...sentMatches.map((message) => base44.asServiceRole.entities.WalletMessage.update(message.id, { deleted_by_sender: true }))
        ]);

        return Response.json({ success: true, deleted: inboxMatches.length + sentMatches.length });
    } catch (error) {
        console.error('deleteWalletConversation error:', error);
        return Response.json({ success: false, error: error.message || 'Failed to delete conversation' }, { status: 500 });
    }
});