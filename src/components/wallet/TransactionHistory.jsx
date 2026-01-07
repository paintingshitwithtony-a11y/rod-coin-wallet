import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowUpRight, ArrowDownLeft, Search, Filter, Download,
    Calendar, Hash, CheckCircle2, Clock, Copy, ExternalLink,
    TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TransactionHistory({ account }) {
    const [transactions, setTransactions] = useState([]);
    const [filteredTxs, setFilteredTxs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date-desc');
    const [dateRange, setDateRange] = useState('all');
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        fetchTransactions();
    }, [account]);

    useEffect(() => {
        applyFilters();
    }, [transactions, searchQuery, typeFilter, statusFilter, sortBy, dateRange]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const txs = await base44.entities.Transaction.filter(
                { account_id: account.id },
                '-created_date',
                500
            );
            setTransactions(txs);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
            toast.error('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...transactions];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(tx =>
                tx.address?.toLowerCase().includes(query) ||
                tx.memo?.toLowerCase().includes(query) ||
                tx.id?.toLowerCase().includes(query)
            );
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(tx => tx.type === typeFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(tx => tx.status === statusFilter);
        }

        // Date range filter
        if (dateRange !== 'all') {
            const now = new Date();
            const cutoff = new Date();
            
            switch (dateRange) {
                case 'today':
                    cutoff.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    cutoff.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    cutoff.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    cutoff.setFullYear(now.getFullYear() - 1);
                    break;
            }

            filtered = filtered.filter(tx => new Date(tx.created_date) >= cutoff);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.created_date) - new Date(a.created_date);
                case 'date-asc':
                    return new Date(a.created_date) - new Date(b.created_date);
                case 'amount-desc':
                    return Math.abs(b.amount) - Math.abs(a.amount);
                case 'amount-asc':
                    return Math.abs(a.amount) - Math.abs(b.amount);
                case 'confirmations':
                    return (b.confirmations || 0) - (a.confirmations || 0);
                default:
                    return 0;
            }
        });

        setFilteredTxs(filtered);
    };

    const exportTransactions = () => {
        const csv = [
            ['Date', 'Type', 'Amount', 'Address', 'Confirmations', 'Status', 'Memo', 'Fee'].join(','),
            ...filteredTxs.map(tx => [
                new Date(tx.created_date).toISOString(),
                tx.type,
                tx.amount,
                tx.address,
                tx.confirmations || 0,
                tx.status,
                tx.memo || '',
                tx.fee || 0
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Transactions exported');
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getTotalStats = () => {
        const received = filteredTxs
            .filter(tx => tx.type === 'receive')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const sent = filteredTxs
            .filter(tx => tx.type === 'send')
            .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        return { received, sent, count: filteredTxs.length };
    };

    const stats = getTotalStats();

    if (loading) {
        return (
            <Card className="bg-slate-900/80 border-slate-700/50">
                <CardContent className="p-12 text-center">
                    <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading transactions...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-green-500/10 to-slate-900/80 border-green-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Total Received</p>
                                <p className="text-2xl font-bold text-green-400">
                                    {stats.received.toFixed(4)} ROD
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-400/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500/10 to-slate-900/80 border-red-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Total Sent</p>
                                <p className="text-2xl font-bold text-red-400">
                                    {stats.sent.toFixed(4)} ROD
                                </p>
                            </div>
                            <TrendingDown className="w-8 h-8 text-red-400/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-slate-900/80 border-purple-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Transactions</p>
                                <p className="text-2xl font-bold text-purple-400">
                                    {stats.count}
                                </p>
                            </div>
                            <Hash className="w-8 h-8 text-purple-400/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card className="bg-slate-900/80 border-slate-700/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                            <Filter className="w-5 h-5 text-purple-400" />
                            Transaction History
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchTransactions}
                                className="border-slate-700 text-slate-300"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportTransactions}
                                disabled={filteredTxs.length === 0}
                                className="border-slate-700 text-slate-300"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search and Filters Row */}
                    <div className="grid gap-3 md:grid-cols-5">
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Search by address, memo, or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                            />
                        </div>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="receive">Received</SelectItem>
                                <SelectItem value="send">Sent</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">Last 30 Days</SelectItem>
                                <SelectItem value="year">Last Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort Options */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">Sort by:</span>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-48 bg-slate-800/50 border-slate-700 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date-desc">Newest First</SelectItem>
                                <SelectItem value="date-asc">Oldest First</SelectItem>
                                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                                <SelectItem value="confirmations">Most Confirmed</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-slate-500">
                            Showing {filteredTxs.length} of {transactions.length} transactions
                        </span>
                    </div>

                    {/* Transaction List */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        <AnimatePresence>
                            {filteredTxs.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12"
                                >
                                    <Hash className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-500">No transactions found</p>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || dateRange !== 'all'
                                            ? 'Try adjusting your filters'
                                            : 'Your transaction history will appear here'}
                                    </p>
                                </motion.div>
                            ) : (
                                filteredTxs.map((tx, index) => (
                                    <motion.div
                                        key={tx.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: Math.min(index * 0.02, 0.3) }}
                                        className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                                    tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'
                                                }`}>
                                                    {tx.type === 'receive' ? (
                                                        <ArrowDownLeft className="w-5 h-5 text-green-400" />
                                                    ) : (
                                                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-medium text-white">
                                                            {tx.type === 'receive' ? 'Received' : 'Sent'}
                                                        </span>
                                                        <Badge variant={tx.status === 'confirmed' ? 'outline' : 'secondary'}
                                                               className={tx.status === 'confirmed' 
                                                                   ? 'border-green-500/50 text-green-400 text-xs'
                                                                   : 'bg-amber-500/20 text-amber-400 text-xs'}>
                                                            {tx.status === 'confirmed' ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                    Confirmed
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    Pending
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-500">Address:</span>
                                                            <code className="text-xs text-amber-400/80 font-mono">
                                                                {tx.address?.slice(0, 12)}...{tx.address?.slice(-8)}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 text-slate-500 hover:text-white"
                                                                onClick={() => copyToClipboard(tx.address, `addr-${tx.id}`)}
                                                            >
                                                                {copiedId === `addr-${tx.id}` ? (
                                                                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </Button>
                                                        </div>

                                                        {tx.memo && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-500">Memo:</span>
                                                                <span className="text-xs text-slate-400">{tx.memo}</span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(tx.created_date).toLocaleString()}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                {tx.confirmations || 0} confirmations
                                                            </span>
                                                            {tx.fee > 0 && (
                                                                <span>Fee: {tx.fee} ROD</span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-slate-500">ID:</span>
                                                            <code className="text-xs text-slate-600 font-mono">
                                                                {tx.id?.slice(0, 16)}...
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 text-slate-500 hover:text-white"
                                                                onClick={() => copyToClipboard(tx.id, `id-${tx.id}`)}
                                                            >
                                                                {copiedId === `id-${tx.id}` ? (
                                                                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <p className={`text-lg font-bold ${
                                                    tx.type === 'receive' ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {tx.type === 'receive' ? '+' : '-'}{Math.abs(tx.amount).toFixed(4)}
                                                    <span className="text-sm ml-1">ROD</span>
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}