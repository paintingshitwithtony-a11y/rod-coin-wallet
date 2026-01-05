import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, 
    TrendingUp, Clock, Copy, CheckCircle2, ExternalLink,
    LogOut, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import AddressGenerator from './AddressGenerator';
import SendReceive from './SendReceive';
import { toast } from 'sonner';

export default function WalletDashboard({ account, onLogout }) {
    const [balance, setBalance] = useState({ confirmed: account?.balance || 0, unconfirmed: 0 });
    const [addresses, setAddresses] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        // Load addresses from account
        if (account) {
            const mainAddress = {
                id: 'main',
                address: account.wallet_address,
                label: 'Primary Address',
                createdAt: account.created_date,
                isValid: true
            };
            
            const additionalAddresses = (account.additional_addresses || []).map((addr, i) => ({
                id: `addr-${i}`,
                address: addr.address,
                label: addr.label || `Address ${i + 2}`,
                createdAt: addr.created_at,
                isValid: true
            }));
            
            setAddresses([mainAddress, ...additionalAddresses]);
            setBalance({ confirmed: account.balance || 0, unconfirmed: 0 });
        }
        fetchWalletData();
    }, [account]);

    const fetchWalletData = async () => {
        setLoading(true);
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Mock transactions - in production this would come from ROD Core RPC
            setTransactions([
                {
                    id: 1,
                    type: 'receive',
                    amount: 100.0,
                    address: account?.wallet_address?.slice(0, 8) + '...' + account?.wallet_address?.slice(-6),
                    confirmations: 156,
                    timestamp: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    id: 2,
                    type: 'send',
                    amount: -50.25,
                    address: 'RMnYq2...9Hk4rW',
                    confirmations: 89,
                    timestamp: new Date(Date.now() - 86400000).toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddressGenerated = (newAddress) => {
        setAddresses(prev => [newAddress, ...prev]);
    };

    const copyAddress = async (address) => {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        toast.success('Address copied');
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">ROD Wallet</h1>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-green-500/50 text-green-400">
                                <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
                                Logged In
                            </Badge>
                            <span className="text-xs text-slate-500">
                                {account?.email}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchWalletData}
                        disabled={loading}
                        className="text-slate-400 hover:text-white"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onLogout}
                        className="text-slate-400 hover:text-red-400 gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </div>

            {/* Balance Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="bg-gradient-to-br from-purple-900/80 to-slate-900/80 border-purple-500/30 backdrop-blur-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardContent className="p-6 relative">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-slate-400 mb-1">Total Balance</p>
                                <h2 className="text-4xl font-bold text-white mb-2">
                                    {balance.confirmed.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                                    <span className="text-xl text-slate-400 ml-2">ROD</span>
                                </h2>
                                {balance.unconfirmed > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-amber-400">
                                        <Clock className="w-4 h-4" />
                                        +{balance.unconfirmed} ROD pending
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    onClick={() => setActiveTab('send')}
                                    className="bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700"
                                >
                                    <ArrowUpRight className="w-4 h-4 mr-2" />
                                    Send
                                </Button>
                                <Button 
                                    onClick={() => setActiveTab('receive')}
                                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50"
                                >
                                    <ArrowDownLeft className="w-4 h-4 mr-2" />
                                    Receive
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-800/50 border border-slate-700">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="generate" className="data-[state=active]:bg-purple-600">
                        Generate
                    </TabsTrigger>
                    <TabsTrigger value="send" className="data-[state=active]:bg-purple-600">
                        Send
                    </TabsTrigger>
                    <TabsTrigger value="receive" className="data-[state=active]:bg-purple-600">
                        Receive
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Recent Transactions */}
                        <Card className="bg-slate-900/80 border-slate-700/50">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white text-lg">Recent Transactions</CardTitle>
                                <Button variant="ghost" size="sm" className="text-slate-400">
                                    View All
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {transactions.map((tx, index) => (
                                    <motion.div
                                        key={tx.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'
                                            }`}>
                                                {tx.type === 'receive' ? (
                                                    <ArrowDownLeft className="w-5 h-5 text-green-400" />
                                                ) : (
                                                    <ArrowUpRight className="w-5 h-5 text-red-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {tx.type === 'receive' ? 'Received' : 'Sent'}
                                                </p>
                                                <p className="text-xs text-slate-500">{tx.address}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-semibold ${
                                                tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount} ROD
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {tx.confirmations} confirmations
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* My Addresses */}
                        <Card className="bg-slate-900/80 border-slate-700/50">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white text-lg">My Addresses</CardTitle>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-purple-400"
                                    onClick={() => setActiveTab('generate')}
                                >
                                    + New
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {addresses.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500 text-sm">No addresses generated yet</p>
                                        <Button
                                            variant="link"
                                            className="text-purple-400 mt-2"
                                            onClick={() => setActiveTab('generate')}
                                        >
                                            Generate your first address
                                        </Button>
                                    </div>
                                ) : (
                                    addresses.slice(0, 5).map((addr, index) => (
                                        <motion.div
                                            key={addr.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {addr.label}
                                                </p>
                                                <p className="text-xs text-amber-400/80 font-mono truncate">
                                                    {addr.address}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => copyAddress(addr.address)}
                                                className="shrink-0 text-slate-400 hover:text-white"
                                            >
                                                {copiedAddress === addr.address ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </motion.div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="generate" className="mt-6">
                    <AddressGenerator onAddressGenerated={handleAddressGenerated} />
                </TabsContent>

                <TabsContent value="send" className="mt-6">
                    <SendReceive mode="send" balance={balance.confirmed} />
                </TabsContent>

                <TabsContent value="receive" className="mt-6">
                    <SendReceive 
                        mode="receive" 
                        addresses={addresses}
                        onGenerateNew={() => setActiveTab('generate')}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}