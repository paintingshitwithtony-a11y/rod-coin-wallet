import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log("=== scanNetwork START ===");

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ROD Coin specific ports only (no Bitcoin ports)
        const commonPorts = [9766, 9767, 11999, 443];
        
        // Only scan localhost / local network
        const hostsToScan = ['127.0.0.1', 'localhost'];

        const discoveredNodes = [];

        for (const host of hostsToScan) {
            for (const port of commonPorts) {
                try {
                    const credentials = [
                        { user: 'roduser', pass: '' },           // common for ROD
                        { user: '__cookie__', pass: '' },        // cookie auth
                        { user: 'rod', pass: 'rodpassword' },
                        { user: 'rpcuser', pass: 'rpcpass' },
                    ];

                    for (const cred of credentials) {
                        try {
                            const auth = btoa(`${cred.user}:${cred.pass}`);
                            const rpcUrl = `http://${host}:${port}`;

                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 1500);

                            const response = await fetch(rpcUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Basic ${auth}`
                                },
                                body: JSON.stringify({
                                    jsonrpc: '1.0',
                                    id: 'scan',
                                    method: 'getblockchaininfo',
                                    params: []
                                }),
                                signal: controller.signal
                            });

                            clearTimeout(timeoutId);

                            if (response.ok) {
                                const data = await response.json();
                                if (data.result && data.result.chain) {
                                    discoveredNodes.push({
                                        host,
                                        port,
                                        username: cred.user,
                                        password: cred.pass,
                                        chain: data.result.chain,
                                        blocks: data.result.blocks,
                                        verified: true
                                    });
                                    console.log(`✅ Found ROD node on ${host}:${port}`);
                                    break;
                                }
                            }
                        } catch (err) {
                            continue;
                        }
                    }
                } catch (err) {
                    continue;
                }
            }
        }

        return Response.json({
            success: true,
            nodes: discoveredNodes,
            scannedHosts: hostsToScan.length,
            scannedPorts: commonPorts.length,
            message: discoveredNodes.length > 0 
                ? `Found ${discoveredNodes.length} ROD node(s)` 
                : "No local ROD nodes detected. Use DuckDNS config."
        });

    } catch (error) {
        console.error("scanNetwork error:", error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});