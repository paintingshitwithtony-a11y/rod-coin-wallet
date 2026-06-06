import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle2, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

export default function DashboardRPCConsole({ selectedAddress, account }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rpcOutput, setRpcOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const queryRPCBalance = async () => {
    if (!selectedAddress) {
      setError('No address selected');
      return;
    }

    setLoading(true);
    setError(null);
    setAiExplanation('');
    setShowAI(false);
    setRpcOutput('Querying RPC for: ' + selectedAddress);

    try {
      // Use the dedicated balance function so permissions and address ownership are handled server-side
      const response = await base44.functions.invoke('getRPCBalance', {
        address: selectedAddress
      });

      if (response.data.success) {
        const utxoBalance = response.data.balance || 0;
        setBalance(utxoBalance);
        setRpcOutput(
          `✓ Method: listunspent (UTXO sum)\n` +
          `✓ Address: ${selectedAddress}\n` +
          `✓ UTXOs found: ${response.data.utxoCount || 0}\n` +
          `✓ Spendable balance: ${utxoBalance.toFixed(8)} ROD\n` +
          (utxoBalance > 0 ? '\nLive RPC balance loaded.' : '\nNo spendable UTXOs found for this address.')
        );
      } else {
        const errMsg = response.data.error || 'RPC query failed';
        setError(errMsg);
        setRpcOutput(`✗ Error: ${errMsg}`);
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

  const explainWithAI = async () => {
    setShowAI(true);
    setAiExplanation(error
      ? `This usually means the app could not read the live RPC balance for this address: ${error}`
      : 'The live RPC node returned 0 spendable UTXOs for this address. If funds exist on-chain, import/rescan the address in your ROD node and make sure the node is fully synced.');
  };

  // Auto-trigger AI explanation when an error occurs
  useEffect(() => {
    if (error && !aiLoading) {
      explainWithAI();
    }
  }, [error]);

  // Also trigger AI when balance is 0 and we've finished loading
  useEffect(() => {
    if (!loading && balance === 0 && selectedAddress && !error) {
      explainWithAI();
    }
  }, [loading, balance]);

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
            {selectedAddress
              ? `UTXO balance for: ${selectedAddress.slice(0, 10)}...${selectedAddress.slice(-6)}`
              : 'Select an address from "My Addresses" to query'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          {/* Error banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Balance display */}
          {balance !== null && (
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              <p className="text-xs text-slate-400">Spendable UTXO Balance</p>
              <div className="flex items-center justify-between">
                <p className={`text-3xl font-bold ${balance > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                  {balance.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}
                </p>
                <span className="text-slate-400">ROD</span>
              </div>
              {balance > 0 && (
                <Button size="sm" variant="outline" onClick={copyBalance} className="mt-2 w-full">
                  {copied ? <><CheckCircle2 className="w-3 h-3 mr-2 text-green-400" />Copied</> : <><Copy className="w-3 h-3 mr-2" />Copy Balance</>}
                </Button>
              )}
            </div>
          )}

          {/* RPC output log */}
          <div className="bg-slate-900/50 rounded-lg p-3 min-h-[80px] font-mono text-xs text-slate-300 overflow-y-auto max-h-[160px] whitespace-pre-wrap break-words">
            {rpcOutput || 'Select an address to query RPC...'}
          </div>

          {/* AI Explanation Panel */}
          <AnimatePresence>
            {(showAI || (balance === 0 && !loading && !error && selectedAddress)) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-purple-500/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowAI(v => !v)}
                  className="w-full flex items-center justify-between p-3 bg-purple-900/30 hover:bg-purple-900/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-300 font-medium">AI Explanation</span>
                    {aiLoading && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
                  </div>
                  {showAI ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
                </button>
                {showAI && (
                  <div className="p-3 bg-purple-950/30">
                    {aiLoading ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing your RPC situation...
                      </div>
                    ) : (
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiExplanation}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual AI trigger button when no error and balance > 0 */}
          {!error && balance !== null && balance > 0 && (
            <button
              onClick={() => { setShowAI(true); explainWithAI(); }}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
              <Sparkles className="w-3 h-3" />
              Explain this result
            </button>
          )}

          <Button
            onClick={queryRPCBalance}
            disabled={!selectedAddress || loading}
            className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Querying...</> : 'Refresh Balance'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}