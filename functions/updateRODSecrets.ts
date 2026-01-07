import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { host, port, username, password } = await req.json();

        if (!host || !port || !username || !password) {
            return Response.json({
                success: false,
                message: 'All fields are required (host, port, username, password)'
            }, { status: 400 });
        }

        // Note: In a real implementation, you would use the Base44 secrets API
        // For now, we'll return a message indicating this needs to be set via dashboard
        
        return Response.json({
            success: false,
            message: 'Please update ROD RPC secrets through the Base44 dashboard: Settings > Environment Variables. Set ROD_RPC_HOST, ROD_RPC_PORT, ROD_RPC_USERNAME, and ROD_RPC_PASSWORD.'
        });

    } catch (error) {
        console.error('Update ROD secrets error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});