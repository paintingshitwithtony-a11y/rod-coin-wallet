import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Activity, Server, Wifi, WifiOff, AlertCircle, CheckCircle2,
    RefreshCw, TrendingUp, Clock, Zap, Database, ArrowLeft
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RPCMonitor() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchMetrics();
        
        const interval = setInterval(() => {
            if (autoRefresh) {
                fetchMetrics();
            }
        }, 10000); // Update every 10 seconds

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const fetchMetrics = async () => {
        try {
            const response = await base44.functions.invoke('getRPCMetrics', {});
            setMetrics(response.data);
            setLastUpdate(new Date());
            if (response.data.error) {
                toast.error(response.data.error);
            }
        } catch (err) {
            toast.error('Failed to fetch RPC metrics');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected': return 'text-green-400 bg-green-500/20 border-green-500/50';
            case 'warning': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
            case 'error': return 'text-red-400 bg-red-500/20 border-red-500/50';
            default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected': return <CheckCircle2 className="w-5 h-5" />;
            case 'warning': return <AlertCircle className="w-5 h-5" />;
            case 'error': return <WifiOff className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    const formatUptime = (seconds) => {
        if (!seconds) return 'N/A';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${mins}m`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading RPC metrics...</p>
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
                                <Activity className="w-8 h-8 text-purple-400" />
                                RPC Node Monitor
                            </h1>
                            <p className="text-slate-400 text-sm">Real-time health and performance metrics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastUpdate && (
                            <span className="text-xs text-slate-500">
                                Last update: {lastUpdate.toLocaleTimeString()}
                            </span>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={autoRefresh ? 'border-green-500/50 text-green-400' : 'border-slate-600 text-slate-400'}
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchMetrics}
                            disabled={loading}
                            className="border-purple-500/50 text-purple-400"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Status Alert */}
                {metrics?.error && (
                    <Alert className="bg-red-500/10 border-red-500/30">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-300/80">
                            {metrics.error}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className={`border-2 ${getStatusColor(metrics?.status)} bg-slate-900/80 backdrop-blur-xl`}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-xl ${getStatusColor(metrics?.status)}`}>
                                        {getStatusIcon(metrics?.status)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">
                                            {metrics?.config?.name || 'No Active Configuration'}
                                        </h2>
                                        <p className="text-slate-400 font-mono text-sm">
                                            {metrics?.config?.host}:{metrics?.config?.port}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge className={`text-lg px-4 py-2 ${getStatusColor(metrics?.status)}`}>
                                        {metrics?.status === 'connected' ? 'ONLINE' : 
                                         metrics?.status === 'warning' ? 'WARNING' : 
                                         metrics?.status === 'error' ? 'OFFLINE' : 'UNKNOWN'}
                                    </Badge>
                                    {metrics?.config?.connection_type && (
                                        <p className="text-xs text-slate-500 mt-2 uppercase">
                                            {metrics.config.connection_type} Connection
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Metrics Grid */}
                {metrics?.nodeInfo && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {/* Block Height */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        Block Height
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-white">
                                        {metrics.nodeInfo.blocks?.toLocaleString() || 'N/A'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Chain: {metrics.nodeInfo.chain || 'Unknown'}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Network Difficulty */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Difficulty
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-white">
                                        {metrics.nodeInfo.difficulty?.toExponential(2) || 'N/A'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Network difficulty
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Response Time */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        Response Time
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-white">
                                        {metrics.responseTime ? `${metrics.responseTime}ms` : 'N/A'}
                                    </p>
                                    <p className={`text-xs mt-1 ${
                                        metrics.responseTime < 500 ? 'text-green-400' :
                                        metrics.responseTime < 1000 ? 'text-yellow-400' :
                                        'text-red-400'
                                    }`}>
                                        {metrics.responseTime < 500 ? 'Excellent' :
                                         metrics.responseTime < 1000 ? 'Good' :
                                         'Slow'}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Connections */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                        <Wifi className="w-4 h-4" />
                                        Connections
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-white">
                                        {metrics.nodeInfo.connections || '0'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Active peers
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {/* Detailed Information */}
                {metrics?.nodeInfo && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Node Information */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Server className="w-5 h-5 text-purple-400" />
                                        Node Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-400 text-sm">Version</span>
                                        <span className="text-white font-mono text-sm">{metrics.nodeInfo.version || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-400 text-sm">Protocol Version</span>
                                        <span className="text-white font-mono text-sm">{metrics.nodeInfo.protocolversion || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-400 text-sm">Subversion</span>
                                        <span className="text-white font-mono text-sm">{metrics.nodeInfo.subversion || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-400 text-sm">Verification Progress</span>
                                        <span className="text-white font-mono text-sm">
                                            {metrics.nodeInfo.verificationprogress 
                                                ? `${(metrics.nodeInfo.verificationprogress * 100).toFixed(2)}%`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-400 text-sm">Pruned</span>
                                        <Badge variant={metrics.nodeInfo.pruned ? "destructive" : "outline"}>
                                            {metrics.nodeInfo.pruned ? 'Yes' : 'No'}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Network Statistics */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-green-400" />
                                        Network Statistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-400 text-sm">Headers</span>
                                        <span className="text-white font-mono text-sm">
                                            {metrics.nodeInfo.headers?.toLocaleString() || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-400 text-sm">Best Block Hash</span>
                                        <span className="text-white font-mono text-xs truncate max-w-[200px]" title={metrics.nodeInfo.bestblockhash}>
                                            {metrics.nodeInfo.bestblockhash?.slice(0, 16) || 'N/A'}...
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-400 text-sm">Chain Work</span>
                                        <span className="text-white font-mono text-xs truncate max-w-[200px]" title={metrics.nodeInfo.chainwork}>
                                            {metrics.nodeInfo.chainwork?.slice(0, 16) || 'N/A'}...
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-400 text-sm">Median Time</span>
                                        <span className="text-white font-mono text-sm">
                                            {metrics.nodeInfo.mediantime 
                                                ? new Date(metrics.nodeInfo.mediantime * 1000).toLocaleString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {/* Warning Messages */}
                {metrics?.nodeInfo?.warnings && (
                    <Alert className="bg-yellow-500/10 border-yellow-500/30">
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <AlertDescription className="text-yellow-300/80">
                            <strong>Node Warning:</strong> {metrics.nodeInfo.warnings}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}