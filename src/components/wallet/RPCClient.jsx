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

        const response = await fetch(this.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: Date.now(),
                method,
                params
            }),
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
            throw new Error(`RPC call failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'RPC error');
        }

        return data.result;
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