import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
    TrendingUp, TrendingDown, Activity, DollarSign, ArrowUpRight,
    ArrowDownLeft, Calendar, Zap, Database, Network, ArrowLeft, RefreshCw, Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export default function Analytics() {
     const [account, setAccount] = useState(null);
     const [transactions, setTransactions] = useState([]);
     const [loading, setLoading] = useState(true);
     const [networkStats, setNetworkStats] = useState(null);
     const [timeRange, setTimeRange] = useState('30d');
     const [rodPrice, setRodPrice] = useState(null);
     const [allWalletsBalance, setAllWalletsBalance] = useState(0);

    useEffect(() => {
        loadData();
        fetchNetworkStats();
        fetchRODPrice();

        // Auto-refresh price every 30 seconds
        const priceInterval = setInterval(fetchRODPrice, 30000);

        // Subscribe to account updates for real-time balance
        const savedSession = localStorage.getItem('rod_wallet_session');
        if (savedSession) {
            const session = JSON.parse(savedSession);
            const unsubscribe = base44.entities.WalletAccount.subscribe((event) => {
                if (event.id === session.id && event.type === 'update') {
                    setAccount(event.data);
                }
            });
            return () => {
                unsubscribe();
                clearInterval(priceInterval);
            };
        }

        return () => clearInterval(priceInterval);
    }, []);

    const fetchRODPrice = async () => {
        try {
            const response = await base44.functions.invoke('getRODPrice', {});
            if (response.data.success && response.data.price) {
                setRodPrice(response.data.price);
            }
        } catch (err) {
            console.error('Failed to fetch ROD price:', err);
            // Fallback to last known price
            setRodPrice(0.00049952);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const savedSession = localStorage.getItem('rod_wallet_session');
            if (!savedSession) {
                toast.error('Please log in');
                return;
            }

            const session = JSON.parse(savedSession);
            const accounts = await base44.entities.WalletAccount.filter({ id: session.id });
            if (accounts.length > 0) {
                setAccount(accounts[0]);

                const txs = await base44.entities.Transaction.filter(
                    { account_id: accounts[0].id },
                    '-created_date',
                    1000
                );
                setTransactions(txs);

                // Fetch RPC balance for all wallets
                try {
                    const rpcBalResponse = await base44.functions.invoke('getRPCBalance', {});
                    console.log('RPC Balance Response:', rpcBalResponse.data);
                    if (rpcBalResponse.data && rpcBalResponse.data.balance !== undefined) {
                        setAllWalletsBalance(rpcBalResponse.data.balance);
                    } else {
                        console.warn('Invalid RPC balance response:', rpcBalResponse.data);
                        setAllWalletsBalance(0);
                    }
                } catch (err) {
                    console.error('Failed to fetch RPC balance:', err);
                    setAllWalletsBalance(0);
                }
            }
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const fetchNetworkStats = async () => {
        try {
            const response = await base44.functions.invoke('getRPCMetrics', {});
            if (response.data.nodeInfo) {
                setNetworkStats(response.data.nodeInfo);
            }
        } catch (err) {
            console.error('Failed to fetch network stats:', err);
        }
    };

    const getTimeFilteredTxs = () => {
        const now = new Date();
        const cutoff = new Date();
        
        switch (timeRange) {
            case '7d':
                cutoff.setDate(now.getDate() - 7);
                break;
            case '30d':
                cutoff.setDate(now.getDate() - 30);
                break;
            case '90d':
                cutoff.setDate(now.getDate() - 90);
                break;
            case '1y':
                cutoff.setFullYear(now.getFullYear() - 1);
                break;
            default:
                return transactions;
        }
        
        return transactions.filter(tx => new Date(tx.created_date) >= cutoff);
    };

    const getBalanceOverTime = () => {
        const filtered = getTimeFilteredTxs();
        const sorted = [...filtered].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        let runningBalance = 0;
        const data = sorted.map(tx => {
            if (tx.type === 'receive') {
                runningBalance += tx.amount;
            } else {
                runningBalance -= Math.abs(tx.amount);
            }
            
            return {
                date: new Date(tx.created_date).toLocaleDateString(),
                balance: runningBalance
            };
        });
        
        return data;
    };

    const getIncomeVsSpending = () => {
        const filtered = getTimeFilteredTxs();
        const groupedByDate = {};
        
        filtered.forEach(tx => {
            const date = new Date(tx.created_date).toLocaleDateString();
            if (!groupedByDate[date]) {
                groupedByDate[date] = { date, income: 0, spending: 0 };
            }
            
            if (tx.type === 'receive') {
                groupedByDate[date].income += tx.amount;
            } else {
                groupedByDate[date].spending += Math.abs(tx.amount);
            }
        });
        
        return Object.values(groupedByDate).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
    };

    const getTransactionDistribution = () => {
        const filtered = getTimeFilteredTxs();
        const receives = filtered.filter(tx => tx.type === 'receive');
        const sends = filtered.filter(tx => tx.type === 'send');
        
        return [
            { name: 'Received', value: receives.length, amount: receives.reduce((sum, tx) => sum + tx.amount, 0) },
            { name: 'Sent', value: sends.length, amount: sends.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) }
        ];
    };

    const getTopTransactions = () => {
        const filtered = getTimeFilteredTxs();
        return [...filtered]
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 10);
    };

    const getAverageTransactionSize = () => {
        const filtered = getTimeFilteredTxs();
        if (filtered.length === 0) return 0;
        const total = filtered.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        return total / filtered.length;
    };

    const balanceData = getBalanceOverTime();
    const incomeSpendingData = getIncomeVsSpending();
    const distributionData = getTransactionDistribution();
    const topTxs = getTopTransactions();
    const avgTxSize = getAverageTransactionSize();

    const totalIncome = distributionData.find(d => d.name === 'Received')?.amount || 0;
    const totalSpending = distributionData.find(d => d.name === 'Sent')?.amount || 0;
    const netFlow = totalIncome - totalSpending;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Activity className="w-12 h-12 text-purple-500 animate-pulse mx-auto mb-4" />
                    <p className="text-slate-400">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('Wallet')}>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <TrendingUp className="w-8 h-8 text-purple-400" />
                                Portfolio Analytics
                            </h1>
                            <p className="text-slate-400 text-sm">Comprehensive insights into your transactions and network</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {['7d', '30d', '90d', '1y', 'all'].map(range => (
                            <Button
                                key={range}
                                variant={timeRange === range ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTimeRange(range)}
                                className={timeRange === range ? 'bg-purple-600' : 'border-slate-700 text-slate-400'}
                            >
                                {range === '7d' ? '7 Days' : 
                                 range === '30d' ? '30 Days' :
                                 range === '90d' ? '90 Days' :
                                 range === '1y' ? '1 Year' : 'All Time'}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="bg-gradient-to-br from-purple-500/10 to-slate-900/80 border-purple-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">Current Balance</p>
                                        <p className="text-xl font-bold text-purple-400">
                                            {account ? account.balance.toFixed(4) : '0.0000'} ROD
                                        </p>
                                        {account && rodPrice && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-sm text-green-400">
                                                    ≈ ${(account.balance * rodPrice).toFixed(2)} USD
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={fetchRODPrice}
                                                    className="h-5 w-5 text-slate-400 hover:text-green-400"
                                                    title="Refresh ROD price">
                                                    <RefreshCw className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <Wallet className="w-8 h-8 text-purple-400/50" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                         <Card className="bg-gradient-to-br from-green-500/10 to-slate-900/80 border-green-500/30">
                             <CardContent className="p-4">
                                 <div className="flex items-center justify-between">
                                     <div>
                                         <p className="text-xs text-slate-400 mb-1">Total Wallets Balance</p>
                                         <p className="text-xl font-bold text-green-400">
                                             {allWalletsBalance.toFixed(4)} ROD
                                         </p>
                                     </div>
                                     <ArrowDownLeft className="w-8 h-8 text-green-400/50" />
                                 </div>
                             </CardContent>
                         </Card>
                     </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="bg-gradient-to-br from-red-500/10 to-slate-900/80 border-red-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">Total Sent</p>
                                        <p className="text-xl font-bold text-red-400">
                                            {totalSpending.toFixed(4)} ROD
                                        </p>
                                    </div>
                                    <ArrowUpRight className="w-8 h-8 text-red-400/50" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <Card className="bg-gradient-to-br from-blue-500/10 to-slate-900/80 border-blue-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">Avg Transaction</p>
                                        <p className="text-xl font-bold text-blue-400">
                                            {avgTxSize.toFixed(4)} ROD
                                        </p>
                                    </div>
                                    <DollarSign className="w-8 h-8 text-blue-400/50" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                <Tabs defaultValue="portfolio" className="space-y-6">
                    <TabsList className="bg-slate-800/50 border border-slate-700">
                        <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                        <TabsTrigger value="network">Network</TabsTrigger>
                    </TabsList>

                    <TabsContent value="portfolio" className="space-y-6">
                        {/* Balance Over Time */}
                        <Card className="bg-slate-900/80 border-slate-700/50">
                            <CardHeader>
                                <CardTitle className="text-white">Balance Over Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={balanceData}>
                                        <defs>
                                            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                            labelStyle={{ color: '#94a3b8' }}
                                        />
                                        <Area type="monotone" dataKey="balance" stroke="#8b5cf6" fill="url(#balanceGradient)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Income vs Spending */}
                        <Card className="bg-slate-900/80 border-slate-700/50">
                            <CardHeader>
                                <CardTitle className="text-white">Income vs Spending</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={incomeSpendingData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                            labelStyle={{ color: '#94a3b8' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="income" fill="#10b981" name="Income" />
                                        <Bar dataKey="spending" fill="#ef4444" name="Spending" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="transactions" className="space-y-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Transaction Distribution */}
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white">Transaction Distribution</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={distributionData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {distributionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Top Transactions */}
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white">Top 10 Transactions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {topTxs.map((tx, index) => (
                                        <div key={tx.id} className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">#{index + 1}</span>
                                                {tx.type === 'receive' ? (
                                                    <ArrowDownLeft className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                                                )}
                                                <span className="text-xs text-slate-400">{tx.type}</span>
                                            </div>
                                            <span className={`font-mono text-sm font-bold ${
                                                tx.type === 'receive' ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {tx.type === 'receive' ? '+' : '-'}{Math.abs(tx.amount).toFixed(4)}
                                            </span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="network" className="space-y-6">
                        {networkStats && (
                            <div className="grid gap-6 md:grid-cols-3">
                                <Card className="bg-slate-900/80 border-slate-700/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                            <Database className="w-4 h-4" />
                                            Block Height
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-white">
                                            {networkStats.blocks?.toLocaleString() || 'N/A'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Current blockchain height</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-900/80 border-slate-700/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                            <Network className="w-4 h-4" />
                                            Network Difficulty
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-white">
                                            {networkStats.difficulty?.toExponential(2) || 'N/A'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Mining difficulty</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-900/80 border-slate-700/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                            <Zap className="w-4 h-4" />
                                            Connections
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-white">
                                            {networkStats.connections || '0'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Active network peers</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Block Explorer Integration */}
                        <Card className="bg-slate-900/80 border-slate-700/50">
                            <CardHeader>
                                <CardTitle className="text-white">Block Explorer</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                                        <div>
                                            <p className="text-sm text-slate-400 mb-1">Official ROD Explorer</p>
                                            <p className="text-xs text-slate-500">View network activity and transactions</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open('http://explorer1.rod.spacexpanse.org:3001/', '_blank')}
                                            className="border-purple-500/50 text-purple-400"
                                        >
                                            Open Explorer
                                        </Button>
                                    </div>
                                    
                                    {account && (
                                        <div className="p-4 rounded-lg bg-slate-800/50">
                                            <p className="text-sm text-slate-400 mb-2">Your Wallet Address</p>
                                            <code className="text-xs text-amber-400/80 font-mono break-all">
                                                {account.wallet_address}
                                            </code>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}