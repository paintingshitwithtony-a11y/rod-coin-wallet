import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Radar, CheckCircle2, Server, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function NetworkScanner({ onNodeSelected }) {
    const [scanning, setScanning] = useState(false);
    const [discoveredNodes, setDiscoveredNodes] = useState([]);
    const [scanComplete, setScanComplete] = useState(false);

    const handleScan = async () => {
        setScanning(true);
        setScanComplete(false);
        setDiscoveredNodes([]);
        
        try {
            const response = await base44.functions.invoke('scanNetwork', {});
            
            if (response.data.success) {
                setDiscoveredNodes(response.data.nodes);
                setScanComplete(true);
                
                if (response.data.nodes.length > 0) {
                    toast.success(`Found ${response.data.nodes.length} node(s)!`);
                } else {
                    toast.info('No nodes found on local network');
                }
            } else {
                toast.error('Scan failed: ' + response.data.error);
            }
        } catch (err) {
            toast.error('Scan error: ' + err.message);
        } finally {
            setScanning(false);
        }
    };

    const handleSelectNode = (node) => {
        onNodeSelected({
            name: `${node.chain} Node (${node.host}:${node.port})`,
            host: node.host,
            port: node.port.toString(),
            username: node.username,
            password: node.password,
            connection_type: 'rpc',
            use_ssl: false
        });
        toast.success('Node details added to form!');
    };

    return (
        <Card className="bg-slate-900/80 border-blue-500/30">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Radar className="w-5 h-5 text-blue-400" />
                    Network Scanner
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-400">
                    Automatically scan your local network for ROD Core nodes running with default credentials.
                </p>

                <Button
                    onClick={handleScan}
                    disabled={scanning}
                    className="w-full bg-blue-600 hover:bg-blue-700">
                    {scanning ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Scanning Network...
                        </>
                    ) : (
                        <>
                            <Radar className="w-4 h-4 mr-2" />
                            Scan Local Network
                        </>
                    )}
                </Button>

                <AnimatePresence>
                    {scanComplete && discoveredNodes.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}>
                            <Alert className="bg-amber-900/20 border-amber-500/50">
                                <XCircle className="h-4 w-4 text-amber-400" />
                                <AlertDescription className="text-sm text-amber-300">
                                    No nodes detected. Make sure ROD Core is running with RPC enabled.
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    {discoveredNodes.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-3">
                            <h4 className="text-sm font-semibold text-white">Discovered Nodes:</h4>
                            {discoveredNodes.map((node, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}>
                                    <Card className="bg-slate-800/50 border-green-500/30">
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                        <Server className="w-5 h-5 text-green-400" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-white font-semibold">{node.host}:{node.port}</p>
                                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Verified
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-slate-400">
                                                            {node.chain} • Block {node.blocks.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSelectNode(node)}
                                                    className="bg-blue-600 hover:bg-blue-700">
                                                    Use This Node
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}