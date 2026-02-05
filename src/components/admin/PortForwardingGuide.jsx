import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Terminal, Copy, CheckCircle2, ExternalLink, 
    AlertCircle, Zap, Lock, Globe, Server 
} from 'lucide-react';
import { toast } from 'sonner';

export default function PortForwardingGuide({ onConfigCreated }) {
    const [copiedCommand, setCopiedCommand] = useState(null);
    const [ngrokUrl, setNgrokUrl] = useState('');
    const [step, setStep] = useState(1);

    const copyCommand = (command, id) => {
        navigator.clipboard.writeText(command);
        setCopiedCommand(id);
        toast.success('Command copied');
        setTimeout(() => setCopiedCommand(null), 2000);
    };

    const handleNgrokUrlSubmit = () => {
        if (!ngrokUrl.includes('ngrok') || !ngrokUrl.includes('.app')) {
            toast.error('Please enter a valid ngrok URL');
            return;
        }
        
        // Extract host and determine if SSL
        const url = new URL(ngrokUrl);
        onConfigCreated({
            name: 'Local Node (via ngrok)',
            connection_type: 'rpc',
            host: url.hostname,
            port: url.port || (url.protocol === 'https:' ? '443' : '80'),
            use_ssl: url.protocol === 'https:'
        });
    };

    return (
        <Card className="bg-slate-900/80 border-purple-500/30">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-400" />
                    Local Port Forwarding Setup
                </CardTitle>
                <CardDescription className="text-slate-400">
                    Connect your local ROD Core node to this web wallet using ngrok
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Why Port Forwarding */}
                <Alert className="bg-blue-500/10 border-blue-500/30">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-300/90 text-sm">
                        Since this wallet runs in your browser, it cannot directly access localhost. 
                        Port forwarding creates a secure tunnel to your local ROD node.
                    </AlertDescription>
                </Alert>

                {/* Step 1: Install ngrok */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            <Badge className={step >= 1 ? "bg-purple-600" : "bg-slate-700"}>1</Badge>
                            Install ngrok
                        </h3>
                        {step === 1 && <Badge variant="outline" className="text-amber-400 border-amber-500/50">Current</Badge>}
                    </div>
                    
                    <div className="space-y-2 pl-9">
                        <p className="text-sm text-slate-400">
                            ngrok creates a secure tunnel from the internet to your local machine.
                        </p>
                        
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => window.open('https://ngrok.com/download', '_blank')}
                                className="border-purple-500/50 text-purple-400">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Download ngrok
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setStep(2)}
                                className="text-slate-400">
                                Skip (Already Installed)
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Step 2: Start ROD Core */}
                {step >= 2 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Badge className={step >= 2 ? "bg-purple-600" : "bg-slate-700"}>2</Badge>
                                Start ROD Core Node
                            </h3>
                            {step === 2 && <Badge variant="outline" className="text-amber-400 border-amber-500/50">Current</Badge>}
                        </div>
                        
                        <div className="space-y-2 pl-9">
                            <p className="text-sm text-slate-400 mb-2">
                                Make sure your ROD Core node is running with RPC enabled.
                            </p>
                            
                            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <code className="text-xs text-slate-500">rod.conf</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyCommand('server=1\nrpcuser=your_username\nrpcpassword=your_password\nrpcport=18374\nrpcallowip=127.0.0.1', 'conf')}
                                        className="h-6 px-2">
                                        {copiedCommand === 'conf' ? (
                                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                                        ) : (
                                            <Copy className="w-3 h-3" />
                                        )}
                                    </Button>
                                </div>
                                <pre className="text-xs text-green-400 whitespace-pre-wrap">
server=1
rpcuser=your_username
rpcpassword=your_password
rpcport=18374
rpcallowip=127.0.0.1
                                </pre>
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => setStep(3)}
                                className="text-slate-400 mt-2">
                                Continue →
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Start ngrok Tunnel */}
                {step >= 3 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Badge className={step >= 3 ? "bg-purple-600" : "bg-slate-700"}>3</Badge>
                                Create Tunnel
                            </h3>
                            {step === 3 && <Badge variant="outline" className="text-amber-400 border-amber-500/50">Current</Badge>}
                        </div>
                        
                        <div className="space-y-2 pl-9">
                            <p className="text-sm text-slate-400 mb-2">
                                Run this command in your terminal to expose your ROD node:
                            </p>
                            
                            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="w-3 h-3 text-purple-400" />
                                        <code className="text-xs text-slate-500">Terminal</code>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyCommand('ngrok http 18374', 'ngrok')}
                                        className="h-6 px-2">
                                        {copiedCommand === 'ngrok' ? (
                                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                                        ) : (
                                            <Copy className="w-3 h-3" />
                                        )}
                                    </Button>
                                </div>
                                <pre className="text-sm text-green-400">ngrok http 18374</pre>
                            </div>

                            <Alert className="bg-amber-500/10 border-amber-500/30 mt-3">
                                <Zap className="h-4 w-4 text-amber-400" />
                                <AlertDescription className="text-amber-300/80 text-xs">
                                    ngrok will display a forwarding URL like <strong>https://abc123.ngrok.app</strong> - copy this URL!
                                </AlertDescription>
                            </Alert>

                            <Button
                                variant="ghost"
                                onClick={() => setStep(4)}
                                className="text-slate-400 mt-2">
                                Continue →
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 4: Configure Wallet */}
                {step >= 4 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Badge className="bg-purple-600">4</Badge>
                                Configure Wallet
                            </h3>
                            <Badge variant="outline" className="text-amber-400 border-amber-500/50">Current</Badge>
                        </div>
                        
                        <div className="space-y-3 pl-9">
                            <p className="text-sm text-slate-400">
                                Paste your ngrok forwarding URL below:
                            </p>
                            
                            <div className="flex gap-2">
                                <Input
                                    value={ngrokUrl}
                                    onChange={(e) => setNgrokUrl(e.target.value)}
                                    placeholder="https://abc123.ngrok.app"
                                    className="bg-slate-800 border-slate-700 text-white flex-1"
                                />
                                <Button
                                    onClick={handleNgrokUrlSubmit}
                                    disabled={!ngrokUrl}
                                    className="bg-purple-600 hover:bg-purple-700">
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Create Config
                                </Button>
                            </div>

                            <p className="text-xs text-slate-500">
                                Example: https://abc123.ngrok-free.app or https://1234-56-78-90-123.ngrok.app
                            </p>
                        </div>
                    </div>
                )}

                {/* Security Notice */}
                <Alert className="bg-red-500/10 border-red-500/30">
                    <Lock className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-300/90 text-sm">
                        <strong>Security Warning:</strong> Your RPC credentials will be sent through ngrok's tunnel. 
                        Only use ngrok for development/testing. For production, use a proper VPS or dedicated server.
                    </AlertDescription>
                </Alert>

                {/* Alternative Methods */}
                <div className="pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-semibold text-white mb-2">Alternative Methods</h4>
                    <div className="space-y-2 text-sm text-slate-400">
                        <div className="flex items-start gap-2">
                            <Server className="w-4 h-4 mt-0.5 text-purple-400" />
                            <div>
                                <p className="text-white">Remote VPS</p>
                                <p className="text-xs text-slate-500">Run ROD Core on a cloud server with a public IP</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <Globe className="w-4 h-4 mt-0.5 text-purple-400" />
                            <div>
                                <p className="text-white">Cloudflare Tunnel</p>
                                <p className="text-xs text-slate-500">Use Cloudflare's free tunnel service (cloudflared)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}