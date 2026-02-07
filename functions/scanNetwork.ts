import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Common ROD Core ports to scan
        const commonPorts = [9766, 9767, 8332, 8333];
        
        // IP ranges to scan (localhost and common local networks)
        const hostsToScan = [
            '127.0.0.1',
            'localhost',
        ];

        const discoveredNodes = [];

        // Scan each host/port combination
        for (const host of hostsToScan) {
            for (const port of commonPorts) {
                try {
                    // Try to connect with common default credentials
                    const credentials = [
                        { user: 'roduser', pass: 'rodpass' },
                        { user: 'rpcuser', pass: 'rpcpass' },
                        { user: 'rod', pass: 'rod123' },
                        { user: 'admin', pass: 'admin' },
                    ];

                    for (const cred of credentials) {
                        try {
                            const auth = btoa(`${cred.user}:${cred.pass}`);
                            const rpcUrl = `http://${host}:${port}`;
                            
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 2000);

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
                                        version: data.result.version,
                                        verified: true
                                    });
                                    break; // Found working credentials, move to next host/port
                                }
                            }
                        } catch (err) {
                            // Connection failed, try next credential
                            continue;
                        }
                    }
                } catch (err) {
                    // Host/port not reachable, continue scanning
                    continue;
                }
            }
        }

        return Response.json({
            success: true,
            nodes: discoveredNodes,
            scannedHosts: hostsToScan.length,
            scannedPorts: commonPorts.length
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});