import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the trading page
        const response = await fetch('https://klingex.io/trade/ROD-USDT');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.status}`);
        }

        const html = await response.text();
        
        // Use regex to find the price in the HTML
        // Looking for pattern: ROD/USDT followed by the price
        const pricePattern = /ROD\/USDT[^\d]*(0\.\d{8})/i;
        const match = html.match(pricePattern);
        
        if (!match || !match[1]) {
            throw new Error('Could not find price in page');
        }
        
        const price = parseFloat(match[1]);

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
            price: 0.000058
        }, { status: 500 });
    }
});