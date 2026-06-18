import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const MINING_ADDRESS = "RYKcnyMoWnqH67zdMCWCbEkyVNvHknn8FY".toLowerCase();

export default function WalletDashboard({ account, onLogout }) {
  const [miningBalance, setMiningBalance] = useState(0);
  const [miningUtxos, setMiningUtxos] = useState(0);
  const [showMiningWallet, setShowMiningWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!account) return;

    // Check if this user owns the mining address
    const userHasMiningWallet = account.wallet_address && 
      account.wallet_address.toLowerCase() === MINING_ADDRESS;

    setShowMiningWallet(userHasMiningWallet);

    if (userHasMiningWallet) {
      const fetchLive = async () => {
        setLoading(true);
        try {
          const res = await base44.functions.invoke('getRPCBalance', {});
          if (res.data?.success) {
            setMiningBalance(res.data.balance || 0);
            setMiningUtxos(res.data.utxoCount || 0);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchLive();
    }
  }, [account]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(MINING_ADDRESS);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">ROD Wallet</h1>

        {/* Mining Wallet - Only show if user owns it */}
        {showMiningWallet && (
          <Card className="bg-slate-900/90 border border-slate-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex justify-between">
                Mining Wallet
                <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="flex-1">
                  <div className="font-mono text-amber-400 text-lg break-all">
                    RYKcnyMoWnqH67zdMCWCbEkyVNvHknn8FY
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-green-400">
                    {miningBalance.toFixed(4)} ROD
                  </div>
                  <Badge className="mt-4 text-xl px-6 py-2 bg-blue-600">
                    {miningUtxos} UTXOs
                  </Badge>
                </div>
                <Button onClick={copyAddress} size="lg" variant="outline">
                  <Copy className="mr-2" /> Copy Address
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
            <p className="text-green-400 text-xl">Mining Wallet only shows for authorized accounts</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}