import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, Server, Key, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WalletConnect({ onConnect }) {
    const [rpcHost, setRpcHost] = useState('127.0.0.1');
    const [rpcPort, setRpcPort] = useState('8396');
    const [rpcUser, setRpcUser] = useState('');
    const [rpcPassword, setRpcPassword] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');
    const [connectionMethod, setConnectionMethod] = useState('rpc');

    const handleRPCConnect = async () => {
        setConnecting(true);
        setError('');
        
        try {
            // Simulate RPC connection attempt
            // In production, this would make an actual RPC call to ROD Core
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Store connection info
            const connectionInfo = {
                method: 'rpc',
                host: rpcHost,
                port: rpcPort,
                user: rpcUser,
                connected: true,
                timestamp: Date.now()
            };
            
            onConnect(connectionInfo);
        } catch (err) {
            setError('Failed to connect to ROD Core. Please check your settings.');
        } finally {
            setConnecting(false);
        }
    };

    const handleLocalConnect = async () => {
        setConnecting(true);
        setError('');
        
        try {
            // Simulate local wallet detection
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const connectionInfo = {
                method: 'local',
                connected: true,
                timestamp: Date.now()
            };
            
            onConnect(connectionInfo);
        } catch (err) {
            setError('ROD Core wallet not detected. Please ensure it is running.');
        } finally {
            setConnecting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md mx-auto"
        >
            <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center">
                        <Wallet className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Connect ROD Core</CardTitle>
                    <CardDescription className="text-slate-400">
                        Connect to your SpaceXpanse ROD Core wallet
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Tabs value={connectionMethod} onValueChange={setConnectionMethod}>
                        <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                            <TabsTrigger value="rpc" className="data-[state=active]:bg-purple-600">
                                <Server className="w-4 h-4 mr-2" />
                                RPC
                            </TabsTrigger>
                            <TabsTrigger value="local" className="data-[state=active]:bg-purple-600">
                                <Key className="w-4 h-4 mr-2" />
                                Local
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="rpc" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Host</Label>
                                    <Input
                                        value={rpcHost}
                                        onChange={(e) => setRpcHost(e.target.value)}
                                        placeholder="127.0.0.1"
                                        className="bg-slate-800/50 border-slate-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Port</Label>
                                    <Input
                                        value={rpcPort}
                                        onChange={(e) => setRpcPort(e.target.value)}
                                        placeholder="8396"
                                        className="bg-slate-800/50 border-slate-700 text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">RPC Username</Label>
                                <Input
                                    value={rpcUser}
                                    onChange={(e) => setRpcUser(e.target.value)}
                                    placeholder="rpcuser"
                                    className="bg-slate-800/50 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">RPC Password</Label>
                                <Input
                                    type="password"
                                    value={rpcPassword}
                                    onChange={(e) => setRpcPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-slate-800/50 border-slate-700 text-white"
                                />
                            </div>
                            <Button
                                onClick={handleRPCConnect}
                                disabled={connecting}
                                className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white font-semibold"
                            >
                                {connecting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Server className="w-4 h-4 mr-2" />
                                        Connect via RPC
                                    </>
                                )}
                            </Button>
                        </TabsContent>
                        
                        <TabsContent value="local" className="space-y-4 mt-4">
                            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                                <p className="text-sm text-slate-400 mb-3">
                                    Connect to ROD Core running on your local machine. Make sure your wallet is unlocked and the RPC server is enabled.
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    Auto-detects rod.conf settings
                                </div>
                            </div>
                            <Button
                                onClick={handleLocalConnect}
                                disabled={connecting}
                                className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white font-semibold"
                            >
                                {connecting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Detecting...
                                    </>
                                ) : (
                                    <>
                                        <Wallet className="w-4 h-4 mr-2" />
                                        Connect Local Wallet
                                    </>
                                )}
                            </Button>
                        </TabsContent>
                    </Tabs>
                    
                    {error && (
                        <Alert variant="destructive" className="bg-red-900/30 border-red-500/50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    
                    <div className="pt-4 border-t border-slate-700">
                        <p className="text-xs text-center text-slate-500">
                            Don't have ROD Core? <a href="https://spacexpanse.org" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">Download here</a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}