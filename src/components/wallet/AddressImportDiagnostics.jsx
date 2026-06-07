import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Search, Wrench, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const shortAddress = (address) => `${address.slice(0, 8)}...${address.slice(-6)}`;

export default function AddressImportDiagnostics({ account, rpcConnected, onImportRescan }) {
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('diagnoseAddressImports', { accountId: account?.id });
      if (response.data.success) {
        setDiagnostics(response.data);
        const { missing, errors, totalBalance } = response.data.summary;
        if (missing || errors) {
          toast.warning(`${missing + errors} address(es) need attention`);
        } else {
          toast.success(`All addresses imported. Live balance: ${totalBalance} ROD`);
        }
      } else {
        toast.error(response.data.error || 'Diagnostic failed');
      }
    } catch (err) {
      toast.error('Diagnostic failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const repairAndRerun = async () => {
    setRepairing(true);
    try {
      await onImportRescan?.();
      await runDiagnostic();
    } finally {
      setRepairing(false);
    }
  };

  const summary = diagnostics?.summary;
  const needsAttention = summary && (summary.missing > 0 || summary.errors > 0);

  return (
    <Card className="bg-slate-900/80 border-slate-700/50 mb-6">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            Address Import Diagnostic
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">Checks whether your wallet addresses are imported into ROD Core and visible to listunspent.</p>
        </div>
        <Button onClick={runDiagnostic} disabled={!account?.id || !rpcConnected || loading || repairing} className="bg-cyan-600 hover:bg-cyan-700">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Run Check
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!rpcConnected && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">Connect RPC before running address diagnostics.</AlertDescription>
          </Alert>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-xs text-slate-400">Addresses</p>
              <p className="text-xl font-bold text-white">{summary.total}</p>
            </div>
            <div className="rounded-lg bg-green-500/10 p-3">
              <p className="text-xs text-green-300">Imported</p>
              <p className="text-xl font-bold text-green-400">{summary.imported}</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3">
              <p className="text-xs text-amber-300">Missing</p>
              <p className="text-xl font-bold text-amber-400">{summary.missing}</p>
            </div>
            <div className="rounded-lg bg-cyan-500/10 p-3">
              <p className="text-xs text-cyan-300">Live Balance</p>
              <p className="text-xl font-bold text-cyan-400">{summary.totalBalance} ROD</p>
            </div>
          </div>
        )}

        {needsAttention && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <span>Some addresses are not visible as imported. Import and rescan them to recover older UTXOs.</span>
              <Button size="sm" onClick={repairAndRerun} disabled={repairing || loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                {repairing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Wrench className="w-3 h-3 mr-2" />}
                Import & Rescan
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {diagnostics?.results?.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {diagnostics.results.map((result) => (
              <div key={result.address} className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/50 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{result.label}</p>
                    <Badge className={result.status === 'imported' ? 'bg-green-500/20 text-green-400 border-green-500/50' : result.status === 'missing' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}>
                      {result.status === 'imported' ? 'Imported' : result.status === 'missing' ? 'Missing' : 'Error'}
                    </Badge>
                    {result.isWatchOnly && <Badge variant="outline" className="border-blue-500/50 text-blue-400">Watch-only</Badge>}
                    {result.isMine && <Badge variant="outline" className="border-purple-500/50 text-purple-400">Mine</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">{shortAddress(result.address)}</p>
                  {result.error && <p className="text-xs text-red-300 mt-1">{result.error}</p>}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1 text-sm font-semibold text-white">
                    <Eye className="w-3 h-3 text-slate-400" />
                    {result.balance} ROD
                  </div>
                  <p className="text-xs text-slate-500">{result.utxoCount} UTXO</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {summary && !needsAttention && (
          <div className="flex items-center gap-2 text-sm text-green-300">
            <CheckCircle2 className="w-4 h-4" />
            All tracked addresses are imported and readable by ROD Core.
          </div>
        )}
      </CardContent>
    </Card>
  );
}