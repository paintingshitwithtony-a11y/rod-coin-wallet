import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Send restart signal to Electron proxy on localhost:9767
        // This checks if proxy is running and responds with status
        const restartResponse = await fetch('http://localhost:9767/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restart' })
        }).catch(err => ({
            error: err.message,
            proxyRunning: false
        }));

        // If proxy responds, it's running
        if (restartResponse.error) {
            return Response.json({
                success: false,
                message: 'Proxy not responding. Make sure Electron app is running.',
                error: restartResponse.error
            }, { status: 503 });
        }

        // Give proxy a moment to restart
        await new Promise(resolve => setTimeout(resolve, 2000));

        return Response.json({
            success: true,
            message: 'Proxy restart initiated successfully'
        });
    } catch (error) {
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});