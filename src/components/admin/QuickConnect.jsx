import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function QuickConnect({ accountId, onSuccess }) {
    const [connecting, setConnecting] = useState(false);

    const handleQuickConnect = async () => {
        setConnecting(true);
        
        try {
            // Try to scan and auto-connect
            const scanResponse = await base44.functions.invoke('scanNetwork', {});
            
            if (scanResponse.data.success && scanResponse.data.nodes.length > 0) {
                const node = scanResponse.data.nodes[0];
                
                // Create configuration automatically
                const newConfig = await base44.entities.RPCConfiguration.create({
                    account_id: accountId,
                    name: `Quick Connect - ${node.host}:${node.port}`,
                    connection_type: 'rpc',
                    host: node.host,
                    port: node.port.toString(),
                    username: node.username,
                    password: node.password,
                    use_ssl: false,
                    connection_status: 'connected',
                    last_connected: new Date().toISOString(),
                    node_info: {
                        blocks: node.blocks,
                        chain: node.chain,
                        version: node.version
                    }
                });

                // Set as active
                const configs = await base44.entities.RPCConfiguration.filter({ account_id: accountId });
                await Promise.all(
                    configs.map(c => 
                        base44.entities.RPCConfiguration.update(c.id, { 
                            is_active: c.id === newConfig.id 
                        })
                    )
                );

                toast.success('Successfully connected to local node!');
                onSuccess();
            } else {
                toast.error('No nodes found. Please configure manually.');
            }
        } catch (err) {
            toast.error('Quick connect failed: ' + err.message);
        } finally {
            setConnecting(false);
        }
    };

    return (
        <Card className="bg-gradient-to-br from-purple-900/50 to-slate-900/80 border-purple-500/30">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Quick Connect
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="bg-purple-900/20 border-purple-500/50">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    <AlertDescription className="text-sm text-purple-300">
                        Automatically detect and connect to your local ROD Core node with one click.
                    </AlertDescription>
                </Alert>

                <Button
                    onClick={handleQuickConnect}
                    disabled={connecting}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    {connecting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            <Zap className="w-4 h-4 mr-2" />
                            Quick Connect Now
                        </>
                    )}
                </Button>

                <p className="text-xs text-slate-500">
                    This will scan for nodes, test connections, and automatically configure the first working node it finds.
                </p>
            </CardContent>
        </Card>
    );
}