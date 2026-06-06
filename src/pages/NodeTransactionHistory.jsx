import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CheckCircle2, Clock, Copy, ExternalLink, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';

const normalizeAddress = (address) => (address || '').trim().toLowerCase();
const shortAddress = (address) => address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Unknown';

export default function NodeTransactionHistory() {
  const [account, setAccount] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  const walletOptions = useMemo(() => {
    if (!account) return [];
    const options = [
      { name: 'Main Wallet', address: account.wallet_address },
      ...(account.additional_addresses || []).map((addr) => ({ name: addr.label || 'Additional Address', address: addr.address })),
      ...wallets.map((wallet) => ({ name: wallet.name || 'Wallet', address: wallet.wallet_address }))
    ];
    const seen = new Set();
    return options.filter((option) => {
      const key = normalizeAddress(option.address);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [account, wallets]);

  useEffect(() => {
    const loadAccount = async () => {
      const savedSession = localStorage.getItem('rod_wallet_session');
      if (!savedSession) {
        setError('Please open your wallet first.');
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(savedSession);
      let accounts = parsed.email ? await base44.entities.WalletAccount.filter({ email: parsed.email }) : [];
      if (accounts.length === 0) accounts = await base44.entities.WalletAccount.filter({ id: parsed.id });
      if (accounts.length === 0) {
        setError('Wallet account not found.');
        setLoading(false);
        return;
      }

      const freshAccount = accounts[0];
      const walletList = await base44.entities.Wallet.filter({ account_id: freshAccount.id }, '-created_date', 100);
      const urlParams = new URLSearchParams(window.location.search);
      const requestedAddress = urlParams.get('address');
      const activeWallet = walletList.find((wallet) => wallet.is_active);

      setAccount(freshAccount);
      setWallets(walletList);
      setSelectedAddress(requestedAddress || activeWallet?.wallet_address || freshAccount.wallet_address);
    };

    loadAccount();
  }, []);

  useEffect(() => {
    if (selectedAddress) fetchNodeHistory();
  }, [selectedAddress]);

  const fetchNodeHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const request = base44.functions.invoke('getNodeTransactionHistory', {
        address: selectedAddress,
        limit: 200
      });
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('ROD Core is taking too long to respond. Try Refresh again.')), 20000)
      );
      const response = await Promise.race([request, timeout]);
      if (response.data.success) {
        setData(response.data);
      } else {
        setError(response.data.error || 'Failed to load node transaction history.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load node transaction history.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const selectedWalletName = walletOptions.find((wallet) => normalizeAddress(wallet.address) === normalizeAddress(selectedAddress))?.name || 'Selected Wallet';
  const transactions = data?.transactions || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white px-3 md:px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link to="/Wallet" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-3">
              <ArrowLeft className="w-4 h-4" /> Back to Wallet
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="w-8 h-8 text-purple-400" /> Node Transaction History
            </h1>
            <p className="text-slate-400 mt-1">Incoming and outgoing coins pulled directly from your ROD Core node.</p>
          </div>
          <Button onClick={fetchNodeHistory} disabled={loading || !selectedAddress} className="bg-purple-600 hover:bg-purple-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh from Node
          </Button>
        </div>

        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardContent className="p-4 grid gap-4 md:grid-cols-[1fr_2fr] items-end">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Selected wallet</label>
              <select
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                {walletOptions.map((wallet) => (
                  <option key={wallet.address} value={wallet.address}>{wallet.name}</option>
                ))}
              </select>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3 min-w-0">
              <p className="text-xs text-slate-400">Address</p>
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-sm text-amber-300 truncate">{selectedAddress}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyText(selectedAddress)}>
                  {copied === selectedAddress ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {data?.summary && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-green-500/10 border-green-500/30"><CardContent className="p-4"><p className="text-xs text-green-300">Received</p><p className="text-2xl font-bold text-green-400">{data.summary.received} ROD</p></CardContent></Card>
            <Card className="bg-red-500/10 border-red-500/30"><CardContent className="p-4"><p className="text-xs text-red-300">Sent</p><p className="text-2xl font-bold text-red-400">{data.summary.sent} ROD</p></CardContent></Card>
            <Card className="bg-purple-500/10 border-purple-500/30"><CardContent className="p-4"><p className="text-xs text-purple-300">Transactions</p><p className="text-2xl font-bold text-purple-400">{data.summary.count}</p></CardContent></Card>
            <Card className="bg-cyan-500/10 border-cyan-500/30"><CardContent className="p-4"><p className="text-xs text-cyan-300">Node</p><p className="text-sm font-bold text-cyan-400">Block {data.summary.nodeBlocks?.toLocaleString()}</p><p className="text-xs text-slate-400">{data.summary.chain} • ROD Core RPC</p></CardContent></Card>
          </div>
        )}

        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">{selectedWalletName} History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-3" /><p className="text-slate-400">Pulling transaction history from ROD Core...</p></div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 text-slate-500">No node transactions found for {shortAddress(selectedAddress)}.</div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <motion.div
                    key={`${tx.txid}-${tx.type}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.25) }}
                    className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          {tx.type === 'receive' ? <ArrowDownLeft className="w-5 h-5 text-green-400" /> : <ArrowUpRight className="w-5 h-5 text-red-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{tx.type === 'receive' ? 'Incoming Coins' : 'Outgoing Coins'}</span>
                            <Badge variant="outline" className={tx.confirmations > 0 ? 'border-green-500/50 text-green-400' : 'border-amber-500/50 text-amber-400'}>
                              {tx.confirmations > 0 ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                              {tx.confirmations} confirmations
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{tx.type === 'receive' ? 'To' : 'To recipient'}: <span className="font-mono text-amber-300">{shortAddress(tx.address)}</span></p>
                          <p className="text-xs text-slate-500 mt-1">
                            {tx.time ? `Local: ${new Date(tx.time).toLocaleString()} • UTC: ${new Date(tx.time).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}` : 'Time unavailable'}
                          </p>
                          <div className="flex items-center gap-2 mt-2 min-w-0">
                            <code className="text-xs text-slate-500 truncate">{tx.txid}</code>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyText(tx.txid)}>
                              {copied === tx.txid ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            </Button>
                            <ExternalLink className="w-3 h-3 text-slate-600 shrink-0" />
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xl font-bold ${tx.type === 'receive' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)}</p>
                        <p className="text-xs text-slate-400">ROD</p>
                        {tx.fee > 0 && <p className="text-xs text-slate-500 mt-1">Fee {tx.fee}</p>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}