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
    Calendar, Hash, CheckCircle2, Clock, Copy,
    RefreshCw, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TransactionHistory({ account }) {
    const [transactions, setTransactions] = useState([]);
    const [filteredTxs, setFilteredTxs] = useState([]);
    const [addressLabels, setAddressLabels] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [memoSearch, setMemoSearch] = useState('');
    const [addressFilter, setAddressFilter] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date-desc');
    const [dateRange, setDateRange] = useState('all');
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        fetchTransactions(true);
        const interval = setInterval(() => fetchTransactions(true), 30000);
        return () => clearInterval(interval);
    }, [account]);

    useEffect(() => {
        applyFilters();
    }, [transactions, searchQuery, memoSearch, addressFilter, minAmount, maxAmount, typeFilter, statusFilter, sortBy, dateRange]);

    const fetchTransactions = async (refreshFromNode = false) => {
        setLoading(true);
        try {
            if (refreshFromNode) {
                await base44.functions.invoke('checkDeposits', {}).catch(() => null);
            }

            const [txs, contacts] = await Promise.all([
                base44.entities.Transaction.filter(
                    { account_id: account.id },
                    '-created_date',
                    500
                ),
                base44.entities.AddressBook.filter(
                    { account_id: account.id },
                    '-created_date'
                )
            ]);
            const labels = contacts.reduce((map, contact) => ({
                ...map,
                [(contact.address || '').trim().toLowerCase()]: contact.label
            }), {});
            setAddressLabels(labels);
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

        // General search filter (ID)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(tx =>
                tx.id?.toLowerCase().includes(query)
            );
        }

        // Memo search filter
        if (memoSearch) {
            const query = memoSearch.toLowerCase();
            filtered = filtered.filter(tx =>
                tx.memo?.toLowerCase().includes(query)
            );
        }

        // Address filter
        if (addressFilter) {
            const query = addressFilter.toLowerCase();
            filtered = filtered.filter(tx =>
                tx.address?.toLowerCase().includes(query)
            );
        }

        // Amount range filter
        if (minAmount) {
            const min = parseFloat(minAmount);
            if (!isNaN(min)) {
                filtered = filtered.filter(tx => Math.abs(tx.amount) >= min);
            }
        }
        if (maxAmount) {
            const max = parseFloat(maxAmount);
            if (!isNaN(max)) {
                filtered = filtered.filter(tx => Math.abs(tx.amount) <= max);
            }
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

    const getAddressLabel = (address) => addressLabels[(address || '').trim().toLowerCase()];

    const getConfirmationLevel = (confirmations = 0) => {
        if (confirmations >= 6) return { label: 'Final', color: 'text-green-400', border: 'border-green-500/50', bg: 'bg-green-500/20', percent: 100 };
        if (confirmations > 0) return { label: 'Confirming', color: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-500/20', percent: Math.min((confirmations / 6) * 100, 100) };
        return { label: 'Unconfirmed', color: 'text-red-400', border: 'border-red-500/50', bg: 'bg-red-500/20', percent: 0 };
    };

    const confirmationStats = {
        incoming: transactions.filter(tx => tx.type === 'receive' && (tx.confirmations || 0) < 6).length,
        outgoing: transactions.filter(tx => tx.type === 'send' && (tx.confirmations || 0) < 6).length,
        final: transactions.filter(tx => (tx.confirmations || 0) >= 6).length
    };

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
                                onClick={() => fetchTransactions(true)}
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
                    {/* Search and Filters Row 1 */}
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                            <p className="text-xs text-amber-200 flex items-center gap-1"><ArrowDownLeft className="w-3 h-3" /> Incoming Monitoring</p>
                            <p className="text-2xl font-bold text-white">{confirmationStats.incoming}</p>
                            <p className="text-xs text-slate-400">waiting for 6 confirmations</p>
                        </div>
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                            <p className="text-xs text-red-200 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> Outgoing Monitoring</p>
                            <p className="text-2xl font-bold text-white">{confirmationStats.outgoing}</p>
                            <p className="text-xs text-slate-400">waiting for 6 confirmations</p>
                        </div>
                        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
                            <p className="text-xs text-green-200 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Fully Confirmed</p>
                            <p className="text-2xl font-bold text-white">{confirmationStats.final}</p>
                            <p className="text-xs text-slate-400">6+ confirmations</p>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Search by ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                            />
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Search memo..."
                                value={memoSearch}
                                onChange={(e) => setMemoSearch(e.target.value)}
                                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                            />
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Filter by address..."
                                value={addressFilter}
                                onChange={(e) => setAddressFilter(e.target.value)}
                                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                            />
                        </div>

                        <Input
                            type="number"
                            placeholder="Min amount"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-white"
                        />

                        <Input
                            type="number"
                            placeholder="Max amount"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-white"
                        />
                    </div>

                    {/* Filters Row 2 */}
                    <div className="grid gap-3 md:grid-cols-3">
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

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <RefreshCw className="w-3 h-3" /> Confirmations refresh automatically every 30 seconds while this page is open.
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
                                        {searchQuery || memoSearch || addressFilter || minAmount || maxAmount || typeFilter !== 'all' || statusFilter !== 'all' || dateRange !== 'all'
                                            ? 'Try adjusting your filters'
                                            : 'Your transaction history will appear here'}
                                    </p>
                                </motion.div>
                            ) : (
                                filteredTxs.map((tx, index) => {
                                    const confirmationLevel = getConfirmationLevel(tx.confirmations || 0);
                                    return (
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
                                                        <Badge variant="outline" className={`${confirmationLevel.border} ${confirmationLevel.color} text-xs`}>
                                                           {(tx.confirmations || 0) >= 6 ? (
                                                               <CheckCircle2 className="w-3 h-3 mr-1" />
                                                           ) : (tx.confirmations || 0) > 0 ? (
                                                               <Clock className="w-3 h-3 mr-1" />
                                                           ) : (
                                                               <AlertTriangle className="w-3 h-3 mr-1" />
                                                           )}
                                                           {confirmationLevel.label}
                                                        </Badge>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs text-slate-500">Address:</span>
                                                            {getAddressLabel(tx.address) && (
                                                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">
                                                                    {getAddressLabel(tx.address)}
                                                                </Badge>
                                                            )}
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

                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {new Date(tx.created_date).toLocaleString()}
                                                                </span>
                                                                <span className={`flex items-center gap-1 ${confirmationLevel.color}`}>
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    {tx.confirmations || 0}/6 confirmations
                                                                </span>
                                                                {tx.fee > 0 && (
                                                                    <span>Fee: {tx.fee} ROD</span>
                                                                )}
                                                            </div>
                                                            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${confirmationLevel.bg}`}
                                                                    style={{ width: `${confirmationLevel.percent}%` }}
                                                                />
                                                            </div>
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
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}