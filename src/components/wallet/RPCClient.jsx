import { base44 } from '@/api/base44Client';

/**
 * RPCClient — Local/Electron-only direct RPC client.
 *
 * SECURITY NOTICE:
 * This client is intended ONLY for trusted local Electron environments where the
 * RPC node runs on localhost and credentials never leave the machine.
 *
 * Do NOT use this client in a hosted web app to connect to a remote RPC node.
 * For hosted/web scenarios, all RPC calls go through backend functions which
 * hold credentials server-side (executeRPCCommand, sendTransaction, etc.).
 *
 * Methods intentionally excluded:
 *   - sendToAddress: NEVER used for user withdrawals. All sends go through
 *     sendTransaction backend function via UTXO-explicit raw transaction flow.
 *   - getBalance: Returns wallet-level aggregate balance, not per-address UTXO
 *     balance. Use listUnspent() and sum amounts for correct per-address balance.
 *   - dumpprivkey, importprivkey, walletpassphrase: Sensitive key-management
 *     operations handled exclusively in backend functions.
 */
export class RPCClient {
    constructor(config) {
        this.config = config;
        this.protocol = config.use_ssl ? 'https' : 'http';
        this.url = `${this.protocol}://${config.host}:${config.port}`;
    }

    async call(method, params = []) {
        const headers = { 'Content-Type': 'application/json' };

        if (this.config.connection_type === 'rpc' && this.config.username && this.config.password) {
            headers['Authorization'] = `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`;
        }

        // Try Electron local proxy first (localhost:9767 only — credentials stay local)
        try {
            const response = await fetch('http://localhost:9767', {
                method: 'POST',
                headers,
                body: JSON.stringify({ jsonrpc: '1.0', id: Date.now(), method, params }),
                signal: AbortSignal.timeout(2000)
            });
            if (response.ok) {
                const data = await response.json();
                if (!data.error) return data.result;
            }
        } catch (_) {
            // Electron proxy not available, fall through
        }

        // Try direct local connection (only safe when node is on localhost)
        if (this.config.host === 'localhost' || this.config.host === '127.0.0.1') {
            try {
                const response = await fetch(this.url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ jsonrpc: '1.0', id: Date.now(), method, params }),
                    signal: AbortSignal.timeout(5000)
                });
                if (!response.ok) throw new Error(`RPC ${response.status}`);
                const data = await response.json();
                if (data.error) throw new Error(data.error.message || 'RPC error');
                return data.result;
            } catch (directError) {
                throw new Error(`Local RPC failed: ${directError.message}`);
            }
        }

        // For remote nodes: route through backend relay (credentials stay server-side)
        const { data } = await base44.functions.invoke('executeRPCCommand', { method, params });
        if (data.error) throw new Error(data.error);
        return data.result;
    }

    // --- Safe read-only helpers ---

    async getBlockchainInfo() {
        return this.call('getblockchaininfo');
    }

    /**
     * Returns spendable UTXOs for a specific address.
     * Sum .amount fields for the correct per-address UTXO balance.
     * This is the only correct way to get a per-address balance.
     */
    async listUnspent(address, minConf = 0) {
        const utxos = await this.call('listunspent', [minConf, 9999999, [address]]);
        return (utxos || []).filter(u => u.address === address);
    }

    async listTransactions(count = 10) {
        return this.call('listtransactions', ['*', count]);
    }

    async getNewAddress(label = '') {
        return this.call('getnewaddress', [label]);
    }

    async validateAddress(address) {
        return this.call('validateaddress', [address]);
    }
}

export async function testRPCConnection(config) {
    if (config.host === 'localhost' && config.port === '9767') {
        try {
            const response = await fetch('http://localhost:9767', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '1.0', id: Date.now(), method: 'getblockchaininfo', params: [] }),
                signal: AbortSignal.timeout(3000)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error.message || 'RPC error');
            return { connected: true, nodeInfo: { blocks: data.result?.blocks, chain: data.result?.chain, version: data.result?.version } };
        } catch (err) {
            return {
                connected: false,
                error: err.name === 'AbortError'
                    ? 'Timeout: Electron proxy not responding'
                    : err.message.includes('Failed to fetch')
                    ? 'Network error: Is Electron running?'
                    : err.message
            };
        }
    }

    try {
        const client = new RPCClient(config);
        const info = await client.getBlockchainInfo();
        return { connected: true, nodeInfo: { blocks: info.blocks, chain: info.chain, version: info.version, difficulty: info.difficulty } };
    } catch (err) {
        return { connected: false, error: err.message };
    }
}