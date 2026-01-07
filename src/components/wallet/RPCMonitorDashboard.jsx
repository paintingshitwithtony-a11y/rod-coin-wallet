import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Activity, Server, Wifi, WifiOff, AlertCircle, CheckCircle2,
    TrendingUp, Users, Database, Clock, RefreshCw, X, Loader2,
    Signal, Zap, HardDrive, Network
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function RPCMonitorDashboard({ account, onClose }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [connectionHistory, setConnectionHistory] = useState([]);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchMetrics();
        loadConnectionHistory();

        // Auto-refresh every 10 seconds
        const interval = setInterval(() => {
            if (autoRefresh) {
                fetchMetrics(true);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const loadConnectionHistory = async () => {
        try {
            const configs = await base44.entities.RPCConfiguration.filter(
                { account_id: account.id },
                '-updated_date',
                20
            );

            const history = configs
                .filter(c => c.last_connected || c.connection_status !== 'untested')
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    status: c.connection_status,
                    timestamp: c.last_connected || c.updated_date,
                    isActive: c.is_active
                }))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setConnectionHistory(history);
        } catch (err) {
            console.error('Failed to load connection history:', err);
        }
    };

    const fetchMetrics = async (silent = false) => {
        if (!silent) setLoading(true);
        setRefreshing(true);

        try {
            const response = await base44.functions.invoke('getRPCMetrics', {});
            
            if (response.data.success) {
                setMetrics(response.data.metrics);
                
                // Add to connection history if status changed
                if (response.data.metrics.connected) {
                    await loadConnectionHistory();
                }
            } else {
                setMetrics({ connected: false, error: response.data.error });
            }
        } catch (err) {
            console.error('Failed to fetch metrics:', err);
            setMetrics({ connected: false, error: err.message });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected':
                return 'text-green-400 bg-green-500/20 border-green-500/50';
            case 'disconnected':
                return 'text-red-400 bg-red-500/20 border-red-500/50';
            case 'warning':
                return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
            default:
                return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected':
                return <CheckCircle2 className="w-5 h-5 text-green-400" />;
            case 'disconnected':
                return <WifiOff className="w-5 h-5 text-red-400" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-400" />;
            default:
                return <Activity className="w-5 h-5 text-slate-400" />;
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <Dialog open onOpenChange={onClose}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const nodeStatus = metrics?.connected ? 'connected' : metrics?.error ? 'disconnected' : 'warning';

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${getStatusColor(nodeStatus)}`}>
                                {getStatusIcon(nodeStatus)}
                            </div>
                            <div>
                                <DialogTitle className="text-2xl">RPC Node Monitor</DialogTitle>
                                <p className="text-sm text-slate-400">Real-time health and performance metrics</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => fetchMetrics()}
                                disabled={refreshing}
                                className="text-slate-400 hover:text-white"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Status Overview */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400">Connection</span>
                                    {metrics?.connected ? (
                                        <Wifi className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <WifiOff className="w-4 h-4 text-red-400" />
                                    )}
                                </div>
                                <p className={`text-2xl font-bold ${metrics?.connected ? 'text-green-400' : 'text-red-400'}`}>
                                    {metrics?.connected ? 'Online' : 'Offline'}
                                </p>
                                {metrics?.configName && (
                                    <p className="text-xs text-slate-500 mt-1">{metrics.configName}</p>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400">Block Height</span>
                                    <Database className="w-4 h-4 text-blue-400" />
                                </div>
                                <p className="text-2xl font-bold text-white">
                                    {metrics?.blockHeight?.toLocaleString() || '--'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Current chain tip</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400">Peers</span>
                                    <Users className="w-4 h-4 text-purple-400" />
                                </div>
                                <p className="text-2xl font-bold text-white">
                                    {metrics?.peerCount ?? '--'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Connected nodes</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400">Sync Status</span>
                                    <Signal className="w-4 h-4 text-amber-400" />
                                </div>
                                <p className="text-2xl font-bold text-white">
                                    {metrics?.syncProgress ? `${(metrics.syncProgress * 100).toFixed(1)}%` : '--'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {metrics?.isSyncing ? 'Syncing...' : 'Fully synced'}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Detailed Metrics */}
                {metrics?.connected && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Network className="w-5 h-5 text-blue-400" />
                                    Network Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Network</span>
                                    <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                                        {metrics.chain || 'mainnet'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Protocol Version</span>
                                    <span className="text-sm text-white">{metrics.protocolVersion || '--'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Subversion</span>
                                    <span className="text-xs text-slate-400 font-mono">{metrics.subversion || '--'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Difficulty</span>
                                    <span className="text-sm text-white">{metrics.difficulty?.toFixed(2) || '--'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <HardDrive className="w-5 h-5 text-purple-400" />
                                    Node Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Best Block Hash</span>
                                    <span className="text-xs text-slate-400 font-mono">
                                        {metrics.bestBlockHash ? `${metrics.bestBlockHash.slice(0, 8)}...` : '--'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Verification Progress</span>
                                    <span className="text-sm text-white">
                                        {metrics.verificationProgress ? `${(metrics.verificationProgress * 100).toFixed(2)}%` : '--'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Chain Work</span>
                                    <span className="text-xs text-slate-400 font-mono">
                                        {metrics.chainWork ? `${metrics.chainWork.slice(0, 10)}...` : '--'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Size on Disk</span>
                                    <span className="text-sm text-white">
                                        {metrics.sizeOnDisk ? `${(metrics.sizeOnDisk / 1e9).toFixed(2)} GB` : '--'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Connection History */}
                <Card className="mt-6 bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-green-400" />
                            Connection History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {connectionHistory.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No connection history yet</p>
                            ) : (
                                connectionHistory.map((event) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(event.status)}
                                            <div>
                                                <p className="text-sm font-medium text-white">{event.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {event.status === 'connected' ? 'Connected' : 
                                                     event.status === 'disconnected' ? 'Disconnected' : 
                                                     event.status === 'error' ? 'Connection error' : 'Untested'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {event.isActive && (
                                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                                                    Active
                                                </Badge>
                                            )}
                                            <span className="text-xs text-slate-500">{formatTimestamp(event.timestamp)}</span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Error Alert */}
                {metrics?.error && (
                    <Alert className="mt-6 bg-red-500/10 border-red-500/30">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-300/80">
                            <strong>Connection Error:</strong> {metrics.error}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Auto-refresh Toggle */}
                <div className="mt-6 flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-slate-300">Auto-refresh (every 10s)</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={autoRefresh ? 'text-green-400' : 'text-slate-500'}
                    >
                        {autoRefresh ? 'ON' : 'OFF'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}