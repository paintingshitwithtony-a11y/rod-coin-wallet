import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Copy, Database, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const normalizeAddress = (address) => (address || '').trim().toLowerCase();

const formatRod = (amount) => Number(amount || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 8
});

export default function RawUTXOInspector({ account, wallets = [], addresses = [], rpcConnected = true }) {
  const [utxosByAddress, setUtxosByAddress] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState(null);
  const [discoveredWallets, setDiscoveredWallets] = useState([]);
  const [discoveredAddresses, setDiscoveredAddresses] = useState([]);

  useEffect(() => {
    const loadTrackedWallets = async () => {
      if (!account || wallets.length > 0 || addresses.length > 0) return;

      const walletRecords = await base44.entities.Wallet.filter({ account_id: account.id }, '-created_date', 100);
      const deletedKeys = new Set((account.deleted_wallet_addresses || []).map(normalizeAddress));
      const accountAddresses = [
        {
          id: 'main',
          label: 'Primary Address',
          address: account.wallet_address,
          type: 'main wallet'
        },
        ...(account.additional_addresses || []).map((addr, index) => ({
          id: `account-address-${index}`,
          label: addr.label || `Address ${index + 2}`,
          address: addr.address,
          type: 'address'
        }))
      ].filter((item) => item.address && !deletedKeys.has(normalizeAddress(item.address)));

      setDiscoveredWallets(walletRecords.filter((wallet) => !deletedKeys.has(normalizeAddress(wallet.wallet_address))));
      setDiscoveredAddresses(accountAddresses);
    };

    loadTrackedWallets();
  }, [account, wallets.length, addresses.length]);

  const trackedWallets = useMemo(() => {
    const byAddress = new Map();
    const walletSource = wallets.length > 0 ? wallets : discoveredWallets;
    const addressSource = addresses.length > 0 ? addresses : discoveredAddresses;

    walletSource.forEach((wallet) => {
      const key = normalizeAddress(wallet.wallet_address);
      if (!key) return;
      byAddress.set(key, {
        id: wallet.id,
        label: wallet.name || 'Wallet',
        address: wallet.wallet_address,
        type: wallet.id === 'main-account' ? 'main wallet' : wallet.wallet_type || 'wallet'
      });
    });

    addressSource.forEach((addr) => {
      const key = normalizeAddress(addr.address);
      if (!key || byAddress.has(key)) return;
      byAddress.set(key, {
        id: addr.id,
        label: addr.label || 'Address',
        address: addr.address,
        type: 'address'
      });
    });

    return Array.from(byAddress.values());
  }, [wallets, addresses, discoveredWallets, discoveredAddresses]);

  const loadRawUtxos = async () => {
    const targetAddresses = trackedWallets.map((wallet) => wallet.address).filter(Boolean);
    if (targetAddresses.length === 0) return;

    setLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('executeRPCCommand', {
        method: 'listunspent',
        params: [0, 9999999, targetAddresses, true]
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Raw UTXO lookup failed');
      }

      const grouped = {};
      targetAddresses.forEach((address) => {
        grouped[normalizeAddress(address)] = [];
      });

      (response.data.result || []).forEach((utxo) => {
        const key = normalizeAddress(utxo.address);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(utxo);
      });

      setUtxosByAddress(grouped);
      setLastChecked(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load raw UTXOs');
    } finally {
      setLoading(false);
    }
  };

  const copyWalletJson = async (wallet, utxos) => {
    await navigator.clipboard.writeText(JSON.stringify({ wallet, utxos }, null, 2));
    toast.success('Raw UTXO JSON copied');
  };

  useEffect(() => {
    if (rpcConnected && trackedWallets.length > 0) {
      loadRawUtxos();
    }
  }, [rpcConnected, trackedWallets.length]);

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/80 border-slate-700/50">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-300" />
              Raw UTXO Inspector
            </CardTitle>
            <p className="text-sm text-slate-400 mt-2">
              Direct node listunspent data for every wallet/address, so you can verify missing coin inputs.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={loadRawUtxos}
            disabled={!rpcConnected || loading || trackedWallets.length === 0}
            className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!rpcConnected && (
            <Alert className="bg-red-500/10 border-red-500/30 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>RPC is not connected, so raw UTXO data cannot be loaded.</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert className="bg-red-500/10 border-red-500/30 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {lastChecked && (
            <p className="text-xs text-slate-500">Last checked: {lastChecked.toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      {trackedWallets.map((wallet) => {
        const utxos = utxosByAddress[normalizeAddress(wallet.address)] || [];
        const total = utxos.reduce((sum, utxo) => sum + Number(utxo.amount || 0), 0);

        return (
          <Card key={`${wallet.id}-${wallet.address}`} className="bg-slate-900/80 border-slate-700/50">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-white text-base flex items-center gap-2 flex-wrap">
                    {wallet.label}
                    <Badge className="bg-slate-800 text-slate-300 border-slate-600">{wallet.type}</Badge>
                  </CardTitle>
                  <p className="text-xs text-amber-300/80 font-mono break-all mt-2">{wallet.address}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyWalletJson(wallet, utxos)}
                  className="text-slate-400 hover:text-white shrink-0"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  JSON
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">
                  {utxos.length} UTXO{utxos.length === 1 ? '' : 's'}
                </Badge>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/40">
                  {formatRod(total)} ROD
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-slate-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading raw UTXOs...
                </div>
              ) : utxos.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No UTXOs returned by the node for this wallet/address.</p>
              ) : (
                <div className="space-y-3">
                  {utxos.map((utxo, index) => (
                    <div key={`${utxo.txid}-${utxo.vout}-${index}`} className="rounded-lg bg-slate-950/70 border border-slate-800 p-3 space-y-3">
                      <div className="grid gap-2 md:grid-cols-4 text-xs">
                        <div>
                          <p className="text-slate-500">Amount</p>
                          <p className="text-green-300 font-semibold">{formatRod(utxo.amount)} ROD</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Confirmations</p>
                          <p className="text-white">{utxo.confirmations ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">VOUT</p>
                          <p className="text-white">{utxo.vout}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Spendable / Safe</p>
                          <p className="text-white">{String(utxo.spendable)} / {String(utxo.safe)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">TXID</p>
                        <p className="text-xs text-cyan-300 font-mono break-all">{utxo.txid}</p>
                      </div>
                      <pre className="max-h-72 overflow-auto rounded-md bg-black/40 p-3 text-[11px] text-slate-300 whitespace-pre-wrap selectable-text">
                        {JSON.stringify(utxo, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}