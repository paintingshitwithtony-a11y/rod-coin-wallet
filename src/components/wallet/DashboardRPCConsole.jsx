import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

export default function DashboardRPCConsole({ selectedAddress, account }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rpcOutput, setRpcOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const queryRPCBalance = async () => {
    if (!selectedAddress) {
      setError('No address selected');
      return;
    }

    setLoading(true);
    setError(null);
    setRpcOutput('Querying RPC for: ' + selectedAddress);

    try {
      // Call getRPCBalance which will use the wallet_address from the context
      const response = await base44.functions.invoke('getRPCBalance', {});

      if (response.data.success) {
        setBalance(response.data.balance);
        const output = `✓ Balance: ${response.data.balance.toFixed(8)} ROD\n✓ Address: ${response.data.address}\n✓ Received: ${(response.data.received || 0).toFixed(8)}\n✓ Sent: ${(response.data.sent || 0).toFixed(8)}`;
        setRpcOutput(output);
      } else {
        setError(response.data.error || 'RPC query failed');
        setRpcOutput(`✗ Error: ${response.data.error}`);
      }
    } catch (err) {
      setError(err.message);
      setRpcOutput(`✗ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAddress) {
      queryRPCBalance();
    }
  }, [selectedAddress]);

  const copyBalance = () => {
    if (balance !== null) {
      navigator.clipboard.writeText(balance.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Balance copied');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6">
      <Card className="bg-gradient-to-br from-blue-900/80 to-slate-900/80 border-blue-500/30 backdrop-blur-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardHeader>
          <CardTitle className="text-white text-lg">RPC Balance Query</CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            {selectedAddress ? `Query: ${selectedAddress.slice(0, 10)}...${selectedAddress.slice(-6)}` : 'Select an address from "My Addresses" to query'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {balance !== null && (
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              <p className="text-xs text-slate-400">Current RPC Balance</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-green-400">
                  {balance.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}
                </p>
                <span className="text-slate-400">ROD</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyBalance}
                className="mt-2 w-full">
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-2 text-green-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-2" />
                    Copy Balance
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="bg-slate-900/50 rounded-lg p-3 min-h-[100px] font-mono text-xs text-slate-300 overflow-y-auto max-h-[200px] whitespace-pre-wrap break-words">
            {rpcOutput || 'Select an address to query RPC...'}
          </div>

          <Button
            onClick={queryRPCBalance}
            disabled={!selectedAddress || loading}
            className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Querying...
              </>
            ) : (
              'Refresh Balance'
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}