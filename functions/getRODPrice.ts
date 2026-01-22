import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as cheerio from 'npm:cheerio@1.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Scrape ROD price from KlingeX.io trading page
        const response = await fetch('https://klingex.io/trade/ROD-USDT');
        
        if (!response.ok) {
            throw new Error(`KlingeX page returned ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Find the price - it's in an h1 tag next to the ROD logo
        let price = 0;
        
        // Look for h1 tags that contain the price pattern
        $('h1').each((i, elem) => {
            const text = $(elem).text().trim();
            // Match pattern like "ROD/USDT" followed by price
            const match = text.match(/ROD\/USDT\s*(0\.\d+)/i);
            if (match) {
                price = parseFloat(match[1]);
            }
        });
        
        // Alternative: look for any element containing ROD/USDT followed by a price
        if (price === 0) {
            const bodyText = $('body').text();
            const match = bodyText.match(/ROD\/USDT[^\d]*(0\.\d{8})/);
            if (match) {
                price = parseFloat(match[1]);
            }
        }

        if (price === 0) {
            throw new Error('Could not extract price from page');
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