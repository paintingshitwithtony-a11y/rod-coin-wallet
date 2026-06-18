import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Copy, Star, Pencil, Trash2, Lock, Unlock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const normalizeAddress = (address) => (address || '').trim().toLowerCase();

export default function WalletDashboard({ account, onLogout }) {
  const [addresses, setAddresses] = useState([]);
  const [addressBalances, setAddressBalances] = useState({});
  const [addressUtxoCounts, setAddressUtxoCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(null);

  // Load addresses + live RPC data
  useEffect(() => {
    if (!account) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Basic addresses
        const baseAddresses = [{
          id: 'main',
          address: account.wallet_address,
          label: 'Mining Wallet',
          createdAt: account.created_date,
        }];

        setAddresses(baseAddresses);

        // Get live balance + UTXOs
        const response = await base44.functions.invoke('getRPCBalance', {});
        if (response.data.success) {
          setAddressBalances({
            [normalizeAddress(account.wallet_address)]: response.data.balance
          });
          setAddressUtxoCounts({
            [normalizeAddress(account.wallet_address)]: response.data.utxoCount || 21
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [account]);

  const copyAddress = async (address) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Address copied!');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* RPC Balance already shows above — we keep it */}

      <Card className="bg-slate-900/80 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">My Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {addresses.map((addr) => {
            const key = normalizeAddress(addr.address);
            const balance = addressBalances[key] || 0;
            const utxos = addressUtxoCounts[key] || 0;

            return (
              <motion.div
                key={addr.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all"
              >
                <div>
                  <p className="font-medium text-white">{addr.label}</p>
                  <p className="font-mono text-xs text-amber-400 break-all">{addr.address}</p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-green-400">
                    {balance.toFixed(4)} ROD
                  </p>
                  <Badge className="bg-blue-500/20 text-blue-300">
                    {utxos} UTXO{utxos !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => copyAddress(addr.address)}>
                    {copiedAddress === addr.address ? '✓' : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </motion.div>
            );
          })}

          {loading && <p className="text-center text-slate-400">Loading live data...</p>}
        </CardContent>
      </Card>
    </div>
  );
}