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
        
        // Multiple patterns to try
        const patterns = [
            /ROD\/USDT.*?(0\.\d{8})/s,
            /"price":\s*"?(0\.\d{8})"?/i,
            /lastPrice[":"]\s*"?(0\.\d{8})"?/i,
            /<h1[^>]*>.*?ROD\/USDT.*?(0\.\d{8})/si,
            /data-price[=:"']*\s*(0\.\d{8})/i
        ];
        
        let price = null;
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                price = parseFloat(match[1]);
                break;
            }
        }
        
        if (!price) {
            // Last resort: find any 8-decimal number that looks like a price
            const allMatches = html.match(/0\.0{4,6}\d{1,2}/g);
            if (allMatches && allMatches.length > 0) {
                // Take the first reasonable looking price
                price = parseFloat(allMatches[0]);
            }
        }

        if (!price) {
            throw new Error('Could not find price in page');
        }

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