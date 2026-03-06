import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Server, CheckCircle2, AlertCircle, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function NodeStatusCard() {
    const [nodeInfo, setNodeInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchNodeInfo();
        const interval = setInterval(fetchNodeInfo, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchNodeInfo = async () => {
        try {
            setLoading(true);
            const response = await base44.functions.invoke('getRPCMetrics', {});
            if (response.data?.nodeInfo) {
                setNodeInfo(response.data.nodeInfo);
                setError(null);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch node status');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !nodeInfo) {
        return (
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        Node Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-slate-400">Connecting...</div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        Node Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert className="bg-red-500/10 border-red-500/30">
                        <AlertDescription className="text-red-300 text-xs">
                            {error}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
            <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-purple-400" />
                    Node Status
                    <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Synced
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {nodeInfo && (
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-400">
                            <span>Block Height:</span>
                            <span className="text-white font-semibold">{nodeInfo.blocks?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span>Network:</span>
                            <span className="text-white font-semibold">{nodeInfo.chain === 'main' ? 'Mainnet' : 'Testnet'}</span>
                        </div>
                        {nodeInfo.connections !== undefined && (
                            <div className="flex justify-between text-slate-400">
                                <span>Peers Connected:</span>
                                <span className="text-white font-semibold">{nodeInfo.connections}</span>
                            </div>
                        )}
                        {nodeInfo.difficulty && (
                            <div className="flex justify-between text-slate-400">
                                <span>Difficulty:</span>
                                <span className="text-white font-semibold">{(nodeInfo.difficulty).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}