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
        
        // Get sessions active in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const sessions = await base44.asServiceRole.entities.UserSession.filter({});
        
        // Count unique users with recent activity
        const uniqueUsers = new Set();
        
        // Always include the current user
        if (accounts.length > 0) {
            uniqueUsers.add(accounts[0].id);
        }
        
        sessions.forEach(session => {
            if (session.last_active && new Date(session.last_active) > new Date(fiveMinutesAgo)) {
                uniqueUsers.add(session.account_id);
            }
        });

        return Response.json({
            count: uniqueUsers.size,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Get online users error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});