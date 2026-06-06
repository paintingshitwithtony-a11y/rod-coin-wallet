import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Server } from 'lucide-react';

export default function AdminRPCStatusIndicator({ account }) {
    const [status, setStatus] = useState({ loading: true, connected: false, error: null, nodeInfo: null, sourceName: null });

    const getSessionPayload = () => {
        const savedSession = localStorage.getItem('rod_wallet_session');
        if (!savedSession) return {};
        const parsed = JSON.parse(savedSession);
        return {
            account_id: account?.id || parsed.id,
            session_token: parsed.session_token || parsed.sessionToken || parsed.token
        };
    };

    const checkStatus = async () => {
        setStatus((prev) => ({ ...prev, loading: true }));
        try {
            const response = await base44.functions.invoke('checkRPCStatus', {
                ...getSessionPayload(),
                admin_rpc_status: true
            });
            setStatus({
                loading: false,
                connected: !!response.data.connected,
                error: response.data.connected ? null : (response.data.error || 'Admin RPC node is not responding'),
                nodeInfo: response.data.nodeInfo || null,
                sourceName: response.data.sourceName || 'Admin RPC Node'
            });
        } catch (err) {
            setStatus({
                loading: false,
                connected: false,
                error: err.message || 'Admin RPC node is not responding',
                nodeInfo: null,
                sourceName: 'Admin RPC Node'
            });
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, [account?.id]);

    const statusClasses = status.connected
        ? 'border-green-500/40 bg-green-500/10 text-green-300'
        : status.loading
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            : 'border-red-500/40 bg-red-500/10 text-red-300';

    return (
        <Card className={`mb-6 border ${statusClasses}`}>
            <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60">
                            {status.loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : status.connected ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-400" />
                            )}
                            <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ${status.connected ? 'bg-green-400 animate-pulse' : status.loading ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-white">Admin RPC Node</p>
                                <Badge variant="outline" className={status.connected ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}>
                                    {status.loading ? 'Checking' : status.connected ? 'Reachable' : 'Offline'}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-300">
                                {status.connected
                                    ? `${status.sourceName} responding${status.nodeInfo?.blocks ? ` • Block ${status.nodeInfo.blocks.toLocaleString()}` : ''}`
                                    : status.error}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={checkStatus} disabled={status.loading} className="text-slate-200 hover:text-white">
                        {status.loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Refresh
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}