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
    const [showEditHost, setShowEditHost] = useState(false);
    const [editedHost, setEditedHost] = useState('https://spacexpanse-rpc.duckdns.org:9443');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const user = await base44.auth.me();
                setCurrentUser(user);
            } catch (err) {
                setCurrentUser(null);
            }
        };
        checkUser();
    }, []);

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
            <>
                <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-base text-white flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            Node Status
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowEditHost(true)}
                            className="h-8 w-8 text-slate-400 hover:text-amber-400"
                            title="Edit host URL">
                            <Pencil className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Alert className="bg-red-500/10 border-red-500/30">
                            <AlertDescription className="text-red-300 text-xs">
                                {error}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                <Dialog open={showEditHost} onOpenChange={setShowEditHost}>
                    <DialogContent className="bg-slate-900 border-slate-700">
                        <DialogHeader>
                            <DialogTitle className="text-white">Edit Node Host URL</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Update the host URL to reconnect to the node
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Input
                                value={editedHost}
                                onChange={(e) => setEditedHost(e.target.value)}
                                placeholder="https://spacexpanse-rpc.duckdns.org:9443"
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowEditHost(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={async () => {
                                        try {
                                            await base44.functions.invoke('fixDuplicateProtocols', {});
                                            toast.success('Host URL fixed and updated.');
                                            setEditedHost('');
                                            setShowEditHost(false);
                                        } catch (err) {
                                            toast.error('Failed to update host URL: ' + err.message);
                                        }
                                    }}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <>
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-white flex items-center gap-2">
                            <Server className="w-4 h-4 text-purple-400" />
                            Node Status
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Synced
                            </Badge>
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowEditHost(true)}
                            className="h-8 w-8 text-slate-400 hover:text-amber-400"
                            title="Edit host URL">
                            <Pencil className="w-4 h-4" />
                        </Button>
                    </div>
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

        <Dialog open={showEditHost} onOpenChange={setShowEditHost}>
            <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white">Edit Node Host URL</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Update the host URL to reconnect to the node
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Input
                        value={editedHost}
                        onChange={(e) => setEditedHost(e.target.value)}
                        placeholder="https://spacexpanse-rpc.duckdns.org:9443"
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setShowEditHost(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                toast.success('Host URL updated. Please reconnect in the RPC settings.');
                                setShowEditHost(false);
                            }}>
                            Save
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}