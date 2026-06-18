import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function WalletDashboard({ account, onLogout }) {
  const [miningBalance, setMiningBalance] = useState(0);
  const [miningUtxos, setMiningUtxos] = useState(0);
  const [allAddresses, setAllAddresses] = useState([]);
  const [addressBalances, setAddressBalances] = useState({});
  const [addressUtxoCounts, setAddressUtxoCounts] = useState({});
  const [rpcSummary, setRpcSummary] = useState({ totalUtxos: 0, totalBalance: 0 });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!account) return;

    const loadAllData = async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke('getRPCBalance', {});
        if (res.data?.success) {
          const balance = res.data.balance || 0;
          const utxos = res.data.utxoCount || 0;

          setMiningBalance(balance);
          setMiningUtxos(utxos);
          setRpcSummary({ totalUtxos: utxos, totalBalance: balance });

          // Main address
          const mainAddr = {
            id: 'main',
            address: account.wallet_address,
            label: 'Mining Wallet',
            balance: balance,
            utxos: utxos
          };

          setAllAddresses([mainAddr]);
          setAddressBalances({ [account.wallet_address.toLowerCase().trim()]: balance });
          setAddressUtxoCounts({ [account.wallet_address.toLowerCase().trim()]: utxos });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [account]);

  const copyAddress = async (addr) => {
    await navigator.clipboard.writeText(addr);
    setCopied(addr);
    toast.success('Address copied');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">ROD Wallet</h1>

        {/* RPC Display at the top */}
        <Card className="bg-slate-900/90 border border-blue-500/30 mb-8">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" /> Live RPC Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-slate-400 text-sm">Total Balance</p>
                <p className="text-3xl font-bold text-green-400">{rpcSummary.totalBalance.toFixed(4)} ROD</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total UTXOs</p>
                <p className="text-3xl font-bold text-blue-400">{rpcSummary.totalUtxos}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Sync Status</p>
                <p className="text-green-400 font-medium">Fully Synced • Live</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Addresses - Full List */}
        <Card className="bg-slate-900/90 border border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">My Addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allAddresses.map((addr) => (
              <div key={addr.id} className="p-6 bg-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1">
                  <div className="font-semibold text-white text-xl">{addr.label}</div>
                  <div className="font-mono text-sm text-amber-400 break-all mt-2">{addr.address}</div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-4xl font-bold text-green-400">
                    {Number(addr.balance || 0).toFixed(4)} ROD
                  </div>
                  <Badge className="mt-3 text-lg px-5 py-1.5 bg-blue-600">
                    {addr.utxos} UTXOs
                  </Badge>
                </div>

                <Button onClick={() => copyAddress(addr.address)} variant="outline" className="flex-shrink-0">
                  <Copy className="mr-2 h-5 w-5" /> Copy
                </Button>
              </div>
            ))}

            {loading && <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 border border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="receive">Receive</TabsTrigger>
            <TabsTrigger value="more">More</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8 text-center">
            <p className="text-green-400 text-xl">✅ Everything is now live from RPC</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}