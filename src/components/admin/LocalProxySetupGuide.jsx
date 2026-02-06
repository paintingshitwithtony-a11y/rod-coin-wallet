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
                            <CardTitle className="text-lg text-white">Complete Setup Guide</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Step 1 */}
                            <div className="border-l-4 border-purple-500 pl-4">
                                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Step 1</Badge>
                                    Install and Start ROD Core Node
                                </h4>
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-400">
                                        <strong className="text-white">Download:</strong> Get ROD Core from the official repository
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        <strong className="text-white">Extract:</strong> Unzip the downloaded file to a folder (e.g., C:\ROD or ~/rod)
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        <strong className="text-white">Start the node:</strong> Run the rod-qt.exe (Windows) or rod-qt (Mac/Linux)
                                    </p>
                                    <Alert className="bg-amber-900/20 border-amber-500/50 mt-2">
                                        <AlertDescription className="text-xs text-amber-300">
                                            ⚠️ First launch will take time as it downloads the blockchain. Wait for initial sync to complete.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="border-l-4 border-purple-500 pl-4">
                                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Step 2</Badge>
                                    Enable RPC Server
                                </h4>
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-400">
                                        Create or edit your <code className="text-purple-400">rod.conf</code> file with these settings:
                                    </p>
                                    <div className="bg-slate-800 p-3 rounded-md font-mono text-xs space-y-1 text-green-400">
                                        <div><span className="text-slate-500"># Enable RPC Server</span></div>
                                        <div>server=1</div>
                                        <div><span className="text-slate-500"># RPC Credentials (choose your own)</span></div>
                                        <div>rpcuser=<span className="text-amber-400">myusername</span></div>
                                        <div>rpcpassword=<span className="text-amber-400">mypassword123</span></div>
                                        <div><span className="text-slate-500"># RPC Port</span></div>
                                        <div>rpcport=9766</div>
                                        <div><span className="text-slate-500"># Allow local connections</span></div>
                                        <div>rpcallowip=127.0.0.1</div>
                                        <div>rpcbind=127.0.0.1</div>
                                    </div>
                                    <div className="space-y-1 text-xs text-slate-500">
                                        <p><strong className="text-white">Config location:</strong></p>
                                        <p>• Windows: <code className="text-purple-400">%APPDATA%\ROD\rod.conf</code></p>
                                        <p>• Mac: <code className="text-purple-400">~/Library/Application Support/ROD/rod.conf</code></p>
                                        <p>• Linux: <code className="text-purple-400">~/.rod/rod.conf</code></p>
                                    </div>
                                    <Alert className="bg-red-900/20 border-red-500/50">
                                        <AlertDescription className="text-xs text-red-300">
                                            🔒 IMPORTANT: After creating rod.conf, completely close and restart ROD Core for changes to take effect!
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="border-l-4 border-purple-500 pl-4">
                                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Step 3</Badge>
                                    Create RPC Configuration in Wallet
                                </h4>
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-400 mb-2">
                                        In the Admin Panel, click <strong className="text-purple-400">"Add New RPC Configuration"</strong> and enter:
                                    </p>
                                    <div className="bg-slate-800 p-3 rounded-md space-y-2 text-sm">
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-slate-500">Name:</span>
                                            <span className="col-span-2 text-white">My Local Node</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-slate-500">Type:</span>
                                            <span className="col-span-2 text-white">Full Node RPC</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-slate-500">Host:</span>
                                            <span className="col-span-2 text-purple-400">127.0.0.1</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-slate-500">Port:</span>
                                            <span className="col-span-2 text-purple-400">9766</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-slate-500">Username:</span>
                                            <span className="col-span-2 text-amber-400">Same as rod.conf rpcuser</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-slate-500">Password:</span>
                                            <span className="col-span-2 text-amber-400">Same as rod.conf rpcpassword</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-slate-500">SSL:</span>
                                            <span className="col-span-2 text-white">Unchecked (not needed for local)</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        💡 Click <strong>"Create Configuration"</strong> to save
                                    </p>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="border-l-4 border-green-500 pl-4">
                                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Step 4</Badge>
                                    Activate & Test Connection
                                </h4>
                                <div className="space-y-2">
                                    <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2">
                                        <li>Find your configuration in the list below</li>
                                        <li>Click the <strong className="text-blue-400">"Test"</strong> button to verify connection</li>
                                        <li>If test succeeds, click <strong className="text-purple-400">"Activate"</strong></li>
                                        <li>The proxy is now enabled! All wallet operations will use your local node</li>
                                    </ol>
                                    <Alert className="bg-green-900/20 border-green-500/50 mt-3">
                                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                                        <AlertDescription className="text-xs text-green-300">
                                            ✅ Success! Your wallet is now connected to your local ROD Core node via the built-in proxy.
                                            No Ngrok or external services needed!
                                        </AlertDescription>
                                    </Alert>
                                </div>
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
                                    <span className="text-slate-300">No external tunneling services required (no Ngrok, LocalTunnel, etc.)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span className="text-slate-300">Built-in authentication and session management</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span className="text-slate-300">Automatically uses your active RPC configuration</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span className="text-slate-300">Secure credential storage in RPC configurations</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span className="text-slate-300">Works seamlessly with all wallet operations</span>
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