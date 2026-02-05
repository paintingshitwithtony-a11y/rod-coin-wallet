import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the trading page with headers to avoid blocking
        const response = await fetch('https://klingex.io/trade/ROD-USDT', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.status}`);
        }

        const html = await response.text();
        
        // Try to extract from script tags containing price data
        const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
        let price = null;
        
        if (scriptMatches) {
            for (const script of scriptMatches) {
                // Look for price in various JSON formats
                const jsonPricePatterns = [
                    /"lastPrice":\s*"?([\d.]+)"?/i,
                    /"price":\s*"?([\d.]+)"?/i,
                    /lastPrice:\s*"?([\d.]+)"?/i,
                    /"last":\s*"?([\d.]+)"?/i
                ];
                
                for (const pattern of jsonPricePatterns) {
                    const match = script.match(pattern);
                    if (match && match[1]) {
                        const candidate = parseFloat(match[1]);
                        if (candidate > 0 && candidate < 1) {
                            price = candidate;
                            break;
                        }
                    }
                }
                if (price) break;
            }
        }
        
        // Fallback patterns in HTML
        if (!price) {
            const patterns = [
                /class="price[^"]*"[^>]*>([\d.]+)<\/[^>]+>/i,
                /ROD\/USDT.*?(0\.\d{4,8})/s,
                /"price":\s*"?(0\.\d{4,8})"?/i,
                /data-price[=:"']*\s*(0\.\d{4,8})/i
            ];
            
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    const candidate = parseFloat(match[1]);
                    if (candidate > 0 && candidate < 1) {
                        price = candidate;
                        break;
                    }
                }
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