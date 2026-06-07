import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';

const normalizeAddress = (address) => (address || '').trim().toLowerCase();

const txNetAmount = (tx) => {
  const amount = Number(tx.amount || 0);
  return tx.type === 'receive' ? Math.abs(amount) : -Math.abs(amount);
};

export default function BalanceTrendChart({ transactions, account, currentWallet, currentBalance, allWallets = [], addressBalances = {} }) {
  const [trendScope, setTrendScope] = useState('primary');

  const chartData = useMemo(() => {
    const now = new Date();
    const allTransactions = transactions || [];
    const primaryAddress = normalizeAddress(account?.wallet_address || currentWallet?.wallet_address);
    const primaryTransactions = allTransactions.filter((tx) => normalizeAddress(tx.wallet_address) === primaryAddress);
    const liveBalances = Object.values(addressBalances).map(Number).filter((value) => !Number.isNaN(value));
    const fallbackAllBalance = allTransactions.reduce((sum, tx) => sum + txNetAmount(tx), 0);
    const fallbackPrimaryBalance = primaryTransactions.reduce((sum, tx) => sum + txNetAmount(tx), 0);
    const totalLiveBalance = liveBalances.length > 0
      ? liveBalances.reduce((sum, amount) => sum + amount, 0)
      : allWallets.length > 0
        ? allWallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0)
        : fallbackAllBalance;
    const primaryLiveBalance = addressBalances[primaryAddress];
    const endingBalance = trendScope === 'all'
      ? totalLiveBalance
      : primaryLiveBalance !== undefined
        ? Number(primaryLiveBalance || 0)
        : Number(currentBalance ?? fallbackPrimaryBalance ?? 0);

    const selectedTransactions = trendScope === 'all' ? allTransactions : primaryTransactions;

    return Array.from({ length: 30 }, (_, index) => {
      const day = new Date(now);
      day.setHours(23, 59, 59, 999);
      day.setDate(now.getDate() - (29 - index));

      const netAfterDay = selectedTransactions.reduce((sum, tx) => {
        const txDate = new Date(tx.created_date || tx.timestamp || 0);
        return txDate > day ? sum + txNetAmount(tx) : sum;
      }, 0);

      const balance = endingBalance - netAfterDay;
      return {
        date: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        balance: Number(balance.toFixed(8))
      };
    });
  }, [transactions, account, currentWallet, currentBalance, allWallets, addressBalances, trendScope]);

  return (
    <Card className="bg-slate-900/80 border-slate-700/50 mt-6">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          30-Day ROD Balance Trend
        </CardTitle>
        <div className="flex rounded-lg border border-slate-700 bg-slate-950/60 p-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setTrendScope('primary')}
            className={trendScope === 'primary' ? 'bg-purple-600 text-white hover:bg-purple-600' : 'text-slate-400 hover:text-white'}
          >
            Primary
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setTrendScope('all')}
            className={trendScope === 'all' ? 'bg-purple-600 text-white hover:bg-purple-600' : 'text-slate-400 hover:text-white'}
          >
            All Wallets
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rodBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: '#fff' }}
                formatter={(value) => [`${Number(value).toFixed(4)} ROD`, trendScope === 'all' ? 'All Wallets' : 'Primary Wallet']}
              />
              <Area type="monotone" dataKey="balance" stroke="#c084fc" strokeWidth={3} fill="url(#rodBalanceGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}