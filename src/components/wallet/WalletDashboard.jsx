import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Copy, Star, Pencil, Trash2, Lock, Unlock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// Keep all your other imports if needed, but this is the minimal working version for now

export default function WalletDashboard({ account, onLogout }) {
  const [addresses, setAddresses] = useState([]);
  const [addressBalances, setAddressBalances] = useState({});
  const [addressUtxoCounts, setAddressUtxoCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(null);

  useEffect(() => {
    if (!account) return;

    const loadLiveData = async () => {
      setLoading(true);
      try {
        // Main Mining Wallet
        const mainAddr = {
          id: 'main',
          address: account.wallet_address,
          label: 'Mining Wallet',
        };

        setAddresses([mainAddr]);

        // Live RPC data
        const rpcResponse = await base44.functions.invoke('getRPCBalance', {});
        if (rpcResponse.data.success) {
          const key = (account.wallet_address || '').toLowerCase().trim();
          setAddressBalances({ [key]: rpcResponse.data.balance });
          setAddressUtxoCounts({ [key]: rpcResponse.data.utxoCount || 21 });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadLiveData();
  }, [account]);

  const copyAddress = async (addr) => {
    await navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    toast.success('Address copied');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/80 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            My Addresses
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <Loader2 className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addresses.map((addr) => {
            const key = (addr.address || '').toLowerCase().trim();
            const balance = addressBalances[key] || 0;
            const utxos = addressUtxoCounts[key] || 0;

            return (
              <div key={addr.id} className="p-4 bg-slate-800/70 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{addr.label}</div>
                  <div className="font-mono text-xs text-amber-400 break-all mt-1">
                    {addr.address}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">
                    {balance.toFixed(4)} ROD
                  </div>
                  <Badge className="mt-1 bg-blue-500/20 text-blue-300">
                    {utxos} UTXO{utxos !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <Button variant="ghost" size="icon" onClick={() => copyAddress(addr.address)}>
                  {copiedAddress === addr.address ? '✓' : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            );
          })}

          {loading && <p className="text-center text-slate-400 py-8">Loading live RPC data...</p>}
        </CardContent>
      </Card>
    </div>
  );
}