import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Server, Copy, CheckCircle2, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function LocalProxySetupGuide() {
    const [copied, setCopied] = useState(false);
    
    const proxyUrl = window.location.origin + '/api/functions/localRPCProxy';

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-purple-500/50 text-purple-400">
                    <Zap className="w-4 h-4 mr-2" />
                    Local RPC Proxy
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-slate-950 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-white flex items-center gap-2">
                        <Server className="w-6 h-6 text-purple-400" />
                        Local RPC Proxy Server
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 text-slate-300">
                    {/* Overview */}
                    <Alert className="bg-purple-900/20 border-purple-500/50">
                        <Server className="h-4 w-4 text-purple-400" />
                        <AlertDescription className="text-slate-300">
                            <strong>Ngrok Alternative:</strong> This built-in proxy eliminates the need for external tunneling services.
                            It securely forwards RPC requests from your wallet to your local ROD Core node.
                        </AlertDescription>
                    </Alert>

                    {/* How It Works */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">How It Works</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mt-1">1</Badge>
                                <p className="text-slate-300">Your wallet sends RPC requests to this proxy endpoint</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mt-1">2</Badge>
                                <p className="text-slate-300">The proxy authenticates your session and retrieves your active RPC configuration</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mt-1">3</Badge>
                                <p className="text-slate-300">It forwards the request to your local ROD Core node using your saved credentials</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mt-1">4</Badge>
                                <p className="text-slate-300">The response is returned securely to your wallet</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Setup Instructions */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Setup Instructions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Step 1 */}
                            <div>
                                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Step 1</Badge>
                                    Configure Your Local ROD Core Node
                                </h4>
                                <p className="text-sm text-slate-400 mb-2">
                                    Ensure your ROD Core node is running locally with RPC enabled:
                                </p>
                                <div className="bg-slate-800 p-3 rounded-md font-mono text-xs space-y-1">
                                    <div>rpcuser=yourusername</div>
                                    <div>rpcpassword=yourpassword</div>
                                    <div>rpcport=9766</div>
                                    <div>server=1</div>
                                    <div>rpcallowip=127.0.0.1</div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    ℹ️ Add these to your rod.conf file and restart your node
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div>
                                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Step 2</Badge>
                                    Create an RPC Configuration
                                </h4>
                                <p className="text-sm text-slate-400 mb-2">
                                    Add a new RPC configuration with these settings:
                                </p>
                                <div className="bg-slate-800 p-3 rounded-md space-y-2 text-sm">
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-slate-500">Name:</span>
                                        <span className="col-span-2 text-white">Local Node</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-slate-500">Host:</span>
                                        <span className="col-span-2 text-white">127.0.0.1</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-slate-500">Port:</span>
                                        <span className="col-span-2 text-white">9766</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-slate-500">Username:</span>
                                        <span className="col-span-2 text-white">Your RPC username</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-slate-500">Password:</span>
                                        <span className="col-span-2 text-white">Your RPC password</span>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div>
                                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Step 3</Badge>
                                    Activate Configuration & Test
                                </h4>
                                <p className="text-sm text-slate-400">
                                    Click "Activate" on your configuration, then use "Test" to verify the connection.
                                    The proxy will automatically route all RPC calls through your active configuration.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Proxy Endpoint */}
                    <Card className="bg-slate-900/50 border-green-500/30">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                Your Proxy Endpoint
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-md">
                                <code className="flex-1 text-sm font-mono text-green-400 break-all">
                                    {proxyUrl}
                                </code>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(proxyUrl)}
                                    className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                ℹ️ This endpoint is automatically used by all wallet functions once your RPC config is active
                            </p>
                        </CardContent>
                    </Card>

                    {/* Benefits */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Benefits</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 text-sm">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span>No external tunneling services required (no Ngrok, LocalTunnel, etc.)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span>Built-in authentication and session management</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span>Automatically uses your active RPC configuration</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span>Secure credential storage in RPC configurations</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span>Works seamlessly with all wallet operations</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Troubleshooting */}
                    <Card className="bg-slate-900/50 border-amber-500/30">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Troubleshooting</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <p className="font-semibold text-amber-400 mb-1">Connection Failed?</p>
                                <ul className="list-disc list-inside text-slate-400 space-y-1 ml-2">
                                    <li>Verify your ROD Core node is running</li>
                                    <li>Check that RPC credentials in your configuration match rod.conf</li>
                                    <li>Ensure the RPC port (9766) is not blocked by firewall</li>
                                    <li>Confirm rpcallowip includes 127.0.0.1 in rod.conf</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-amber-400 mb-1">Unauthorized Error?</p>
                                <ul className="list-disc list-inside text-slate-400 space-y-1 ml-2">
                                    <li>Make sure you're logged into your wallet</li>
                                    <li>Verify an RPC configuration is marked as "Active"</li>
                                    <li>Test the connection using the "Test" button</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Footer */}
                    <Alert className="bg-blue-900/20 border-blue-500/50">
                        <ExternalLink className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-slate-300">
                            <strong>Need Help?</strong> The proxy server is already deployed and ready to use.
                            Just configure your local node and activate an RPC configuration to get started.
                        </AlertDescription>
                    </Alert>
                </div>
            </DialogContent>
        </Dialog>
    );
}