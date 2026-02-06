import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Activity, TrendingUp, Network, Zap, 
    CheckCircle2, AlertCircle, Loader2, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { base44 } from '@/api/base44Client';

export default function NetworkActivityDashboard({ account, rpcConnected }) {
    const [networkHashrate, setNetworkHashrate] = useState(null);
    const [activeNodes, setActiveNodes] = useState(0);
    const [feeData, setFeeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [networkHealth, setNetworkHealth] = useState({
        send: 'checking',
        receive: 'checking',
        rpc: 'checking'
    });

    useEffect(() => {
        fetchNetworkData();
        const interval = setInterval(fetchNetworkData, 120000); // Refresh every 2 minutes
        return () => clearInterval(interval);
    }, [account, rpcConnected]);

    const fetchNetworkData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchHashrate(),
                fetchActiveNodes(),
                fetchFeeAnalytics(),
                checkNetworkHealth()
            ]);
        } catch (err) {
            console.error('Network data fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHashrate = async () => {
        try {
            const response = await fetch('http://explorer1.rod.spacexpanse.org:3001/');
            const html = await response.text();

            const sha256Match = html.match(/sha256d Hash Rate:[^>]*>([0-9.]+)[^>]*>[^>]*>([0-9.]+)[^<]*<small[^>]*>(\w+)\/s<\/small>/);
            const neoscryptMatch = html.match(/neoscrypt Hash Rate[^>]*>([0-9.]+)[^>]*>[^>]*>([0-9.]+)[^<]*<small[^>]*>(\w+)\/s<\/small>/);

            if (sha256Match && neoscryptMatch) {
                setNetworkHashrate({
                    sha256: `${sha256Match[1]} ${sha256Match[3]}/s`,
                    neoscrypt: `${neoscryptMatch[1]} ${neoscryptMatch[3]}/s`
                });
            }
        } catch (err) {
            console.error('Hashrate fetch failed:', err);
        }
    };

    const fetchActiveNodes = async () => {
        try {
            const response = await base44.functions.invoke('getOnlineUsers', {});
            if (response.data.count !== undefined) {
                setActiveNodes(response.data.count);
            }
        } catch (err) {
            console.error('Active nodes fetch failed:', err);
        }
    };

    const fetchFeeAnalytics = async () => {
        try {
            // Get recent transactions to analyze fees
            const txs = await base44.entities.Transaction.filter(
                { account_id: account.id, type: 'send' },
                '-created_date',
                50
            );

            // Group by day and calculate average fees
            const feesByDay = {};
            txs.forEach(tx => {
                const day = new Date(tx.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (!feesByDay[day]) {
                    feesByDay[day] = { day, total: 0, count: 0 };
                }
                feesByDay[day].total += tx.fee || 0;
                feesByDay[day].count++;
            });

            const data = Object.values(feesByDay)
                .map(d => ({ day: d.day, avgFee: (d.total / d.count).toFixed(6) }))
                .slice(-7)
                .reverse();

            setFeeData(data);
        } catch (err) {
            console.error('Fee analytics fetch failed:', err);
        }
    };

    const checkNetworkHealth = async () => {
        const health = { send: 'checking', receive: 'checking', rpc: 'checking' };

        try {
            // Check RPC status
            const rpcStatus = await base44.functions.invoke('checkRPCStatus', {});
            health.rpc = rpcStatus.data.connected ? 'healthy' : 'down';

            // Check send capability (if RPC is up)
            if (health.rpc === 'healthy') {
                health.send = 'healthy';
            } else {
                health.send = 'down';
            }

            // Check receive capability (deposit detection)
            if (health.rpc === 'healthy') {
                health.receive = 'healthy';
            } else {
                health.receive = 'degraded';
            }

            setNetworkHealth(health);
        } catch (err) {
            console.error('Network health check failed:', err);
            setNetworkHealth({ send: 'down', receive: 'degraded', rpc: 'down' });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-400 bg-green-500/20 border-green-500/50';
            case 'degraded': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
            case 'down': return 'text-red-400 bg-red-500/20 border-red-500/50';
            default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return <CheckCircle2 className="w-4 h-4" />;
            case 'degraded': return <AlertCircle className="w-4 h-4" />;
            case 'down': return <AlertCircle className="w-4 h-4" />;
            default: return <Loader2 className="w-4 h-4 animate-spin" />;
        }
    };

    if (loading && !networkHashrate) {
        return (
            <Card className="bg-slate-900/80 border-slate-700/50">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Network Health Status */}
            <Card className="bg-slate-900/80 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Network Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Send Status */}
                        <div className={`p-4 rounded-lg border ${getStatusColor(networkHealth.send)}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <ArrowUpRight className="w-5 h-5" />
                                <span className="font-medium">Send Function</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(networkHealth.send)}
                                <span className="text-sm capitalize">{networkHealth.send}</span>
                            </div>
                            <p className="text-xs mt-2 opacity-80">
                                {networkHealth.send === 'healthy' ? 'Transactions can be broadcasted' : 'Unable to send transactions'}
                            </p>
                        </div>

                        {/* Receive Status */}
                        <div className={`p-4 rounded-lg border ${getStatusColor(networkHealth.receive)}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <ArrowDownLeft className="w-5 h-5" />
                                <span className="font-medium">Receive Function</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(networkHealth.receive)}
                                <span className="text-sm capitalize">{networkHealth.receive}</span>
                            </div>
                            <p className="text-xs mt-2 opacity-80">
                                {networkHealth.receive === 'healthy' ? 'Deposits auto-detected' : 'Manual import required'}
                            </p>
                        </div>

                        {/* RPC Status */}
                        <div className={`p-4 rounded-lg border ${getStatusColor(networkHealth.rpc)}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <Network className="w-5 h-5" />
                                <span className="font-medium">RPC Connection</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(networkHealth.rpc)}
                                <span className="text-sm capitalize">{networkHealth.rpc}</span>
                            </div>
                            <p className="text-xs mt-2 opacity-80">
                                {networkHealth.rpc === 'healthy' ? 'Node connected' : 'Node disconnected'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Network Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hash Rate */}
                {networkHashrate && (
                    <Card className="bg-slate-900/80 border-slate-700/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" />
                                Network Hash Rate
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-400">SHA256</p>
                                    <p className="text-lg font-bold text-blue-400">{networkHashrate.sha256}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Neoscrypt</p>
                                    <p className="text-lg font-bold text-purple-400">{networkHashrate.neoscrypt}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Active Nodes */}
                <Card className="bg-slate-900/80 border-slate-700/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm flex items-center gap-2">
                            <Network className="w-4 h-4 text-green-400" />
                            Active Nodes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-400">{activeNodes}</p>
                        <p className="text-xs text-slate-400 mt-2">Connected wallet nodes</p>
                    </CardContent>
                </Card>

                {/* Average Fee */}
                <Card className="bg-slate-900/80 border-slate-700/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-400" />
                            Avg Transaction Fee
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-purple-400">
                            {feeData.length > 0 ? feeData[0].avgFee : '0.0001'}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">ROD (Last 7 days)</p>
                    </CardContent>
                </Card>
            </div>

            {/* Fee Trend Chart */}
            {feeData.length > 0 && (
                <Card className="bg-slate-900/80 border-slate-700/50">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                            Transaction Fee Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={feeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis 
                                    dataKey="day" 
                                    stroke="#94a3b8" 
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis 
                                    stroke="#94a3b8" 
                                    style={{ fontSize: '12px' }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        border: '1px solid #475569',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="avgFee" 
                                    stroke="#a855f7" 
                                    strokeWidth={2}
                                    dot={{ fill: '#a855f7', r: 4 }}
                                    name="Avg Fee (ROD)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}