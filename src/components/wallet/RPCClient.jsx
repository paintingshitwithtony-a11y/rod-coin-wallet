import { base44 } from '@/api/base44Client';

// Client-side RPC connection handler for Electron/local nodes
export class RPCClient {
    constructor(config) {
        this.config = config;
        this.protocol = config.use_ssl ? 'https' : 'http';
        this.url = `${this.protocol}://${config.host}:${config.port}`;
    }

    async call(method, params = []) {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add authentication if using RPC
        if (this.config.connection_type === 'rpc' && this.config.username && this.config.password) {
            headers['Authorization'] = `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`;
        }

        // Try Electron proxy first (port 9767)
        try {
            const electronProxyUrl = 'http://localhost:9767';
            const response = await fetch(electronProxyUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: Date.now(),
                    method,
                    params
                }),
                signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
                const data = await response.json();
                if (!data.error) {
                    return data.result;
                }
            }
        } catch (e) {
            // Electron proxy not available, continue to next method
        }

        // Try configured direct connection
        try {
            const response = await fetch(this.url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: Date.now(),
                    method,
                    params
                }),
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                throw new Error(`RPC call failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || 'RPC error');
            }

            return data.result;
        } catch (directError) {
            // Fall back to backend relay function
            try {
                const { data } = await base44.functions.invoke('rpcRelay', { method, params });
                if (data.error) {
                    throw new Error(data.error.message || data.error);
                }
                return data.result;
            } catch (relayError) {
                throw new Error(`Electron: unavailable | Direct: ${directError.message} | Relay: ${relayError.message}`);
            }
        }
    }

    async getBlockchainInfo() {
        return await this.call('getblockchaininfo');
    }

    async getBalance() {
        return await this.call('getbalance');
    }

    async getNewAddress(label = '') {
        return await this.call('getnewaddress', [label]);
    }

    async sendToAddress(address, amount) {
        return await this.call('sendtoaddress', [address, amount]);
    }

    async listTransactions(count = 10) {
        return await this.call('listtransactions', ['*', count]);
    }
}

export async function testRPCConnection(config) {
    // Special handling for Electron proxy (port 9767)
    if (config.host === 'localhost' && config.port === '9767') {
        try {
            const response = await fetch('http://localhost:9767', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: Date.now(),
                    method: 'getblockchaininfo',
                    params: []
                }),
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (!data.error) {
                    return {
                        connected: true,
                        nodeInfo: {
                            blocks: data.result?.blocks,
                            chain: data.result?.chain,
                            version: data.result?.version
                        }
                    };
                }
            }
            throw new Error(`Electron proxy returned ${response.status}`);
        } catch (err) {
            return {
                connected: false,
                error: 'Electron proxy not running on port 9767. Start Electron with: npm run electron:dev'
            };
        }
    }

    // Standard RPC test
    try {
        const client = new RPCClient(config);
        const info = await client.getBlockchainInfo();
        return {
            connected: true,
            nodeInfo: {
                blocks: info.blocks,
                chain: info.chain,
                version: info.version,
                difficulty: info.difficulty
            }
        };
    } catch (err) {
        return {
            connected: false,
            error: err.message
        };
    }
}