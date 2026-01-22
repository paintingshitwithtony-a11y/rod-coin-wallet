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
        
        // Find the price element - look for the ROD/USDT price display
        let price = 0;
        
        // Try to find price in the heading or price display area
        $('h1, .text-2xl, .text-3xl, .text-4xl').each((i, elem) => {
            const text = $(elem).text();
            if (text.includes('ROD/USDT')) {
                const priceMatch = text.match(/0\.\d+/);
                if (priceMatch) {
                    price = parseFloat(priceMatch[0]);
                }
            }
        });
        
        // If not found, try table data
        if (price === 0) {
            $('table tr').each((i, elem) => {
                const text = $(elem).text();
                if (text.includes('ROD/USDT')) {
                    const priceMatch = text.match(/0\.\d+/);
                    if (priceMatch) {
                        price = parseFloat(priceMatch[0]);
                    }
                }
            });
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
            // Fallback to hardcoded price if API fails
            price: 0.000058
        }, { status: 500 });
    }
});