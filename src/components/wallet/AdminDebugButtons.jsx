import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Plug, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AdminDebugButtons({ isAdmin, loading, isSyncing, rpcConnected, onRefresh, setLoading }) {
  if (!isAdmin) return null;

  const testElectronProxy = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:9767', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '1.0', method: 'getblockchaininfo', params: [] }),
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          toast.success(`Electron Proxy Connected! Block ${data.result.blocks?.toLocaleString()}`, {
            description: `Chain: ${data.result.chain}`
          });
        } else if (data.error) {
          toast.error('Electron Proxy error: ' + data.error.message);
        }
      } else {
        toast.error('Electron Proxy returned: ' + response.status);
      }
    } catch (err) {
      toast.error('Electron Proxy unavailable: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testNgrok = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('checkRPCStatus', {});
      if (response.data.connected) {
        toast.success('Ngrok connection working! RPC is reachable.');
      } else {
        toast.error('Ngrok test failed: ' + (response.data.error || 'Connection failed'));
      }
    } catch (err) {
      toast.error('Ngrok test failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={testElectronProxy}
        disabled={loading}>
        {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plug className="w-3 h-3 mr-1" />}
        Test Electron Proxy
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={testNgrok}
        disabled={loading}>
        {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plug className="w-3 h-3 mr-1" />}
        Test Ngrok
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading || isSyncing || !rpcConnected}>
        {isSyncing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
        Sync Now
      </Button>
    </div>
  );
}