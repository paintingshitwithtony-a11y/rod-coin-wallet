import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch ROD price from KlingeX.io API
        const response = await fetch('https://klingex.io/api/v1/ticker/24hr?symbol=ROD_USDT');
        
        if (!response.ok) {
            throw new Error(`KlingeX API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('KlingeX API response:', data);
        
        // Extract the last price from the response
        const price = parseFloat(data.lastPrice || data.last || data.price || 0);

        return Response.json({
            success: true,
            price: price,
            symbol: 'ROD/USDT',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Get ROD price error:', error);
        return Response.json({ 
            error: error.message,
            success: false,
            // Fallback to hardcoded price if API fails
            price: 0.00049952
        }, { status: 500 });
    }
});