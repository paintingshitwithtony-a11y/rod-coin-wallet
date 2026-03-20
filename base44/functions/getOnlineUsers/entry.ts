import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the current user's account
        const accounts = await base44.entities.WalletAccount.filter({ 
            email: user.email 
        });

        const now = new Date().toISOString();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        // Update or create a session for the current user to mark them as active
        if (accounts.length > 0) {
            const accountId = accounts[0].id;
            const existingSessions = await base44.asServiceRole.entities.UserSession.filter({
                account_id: accountId,
                is_current: true
            });

            if (existingSessions.length > 0) {
                await base44.asServiceRole.entities.UserSession.update(existingSessions[0].id, {
                    last_active: now
                });
            } else {
                await base44.asServiceRole.entities.UserSession.create({
                    account_id: accountId,
                    session_token: crypto.randomUUID(),
                    is_current: true,
                    last_active: now
                });
            }
        }

        // Count unique users with activity in the last 5 minutes
        const sessions = await base44.asServiceRole.entities.UserSession.filter({});
        const uniqueUsers = new Set();

        sessions.forEach(session => {
            if (session.last_active && new Date(session.last_active) > new Date(fiveMinutesAgo)) {
                uniqueUsers.add(session.account_id);
            }
        });

        return Response.json({
            count: uniqueUsers.size,
            timestamp: now
        });

    } catch (error) {
        console.error('Get online users error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});