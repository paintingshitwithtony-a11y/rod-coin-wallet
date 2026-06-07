import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { accountId, messageId } = body;

        if (!accountId || !messageId) {
            return Response.json({ success: false, error: 'Message and wallet account are required' }, { status: 400 });
        }

        const messages = await base44.asServiceRole.entities.WalletMessage.filter({ id: messageId });
        if (messages.length === 0) {
            return Response.json({ success: false, error: 'Message not found' }, { status: 404 });
        }

        const message = messages[0];
        if (message.recipient_account_id !== accountId) {
            return Response.json({ success: false, error: 'This message does not belong to your inbox' }, { status: 403 });
        }

        await base44.asServiceRole.entities.WalletMessage.update(messageId, { read_by_recipient: true });
        return Response.json({ success: true });
    } catch (error) {
        console.error('markWalletMessageRead error:', error);
        return Response.json({ success: false, error: error.message || 'Failed to update message' }, { status: 500 });
    }
});