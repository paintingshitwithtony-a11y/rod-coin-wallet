import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, CheckCircle2, Server, Code, Zap, Terminal, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function LocalDevSetup({ account }) {
    const [copied, setCopied] = useState(null);

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(null), 2000);
    };

    // Use account's RPC credentials if available, otherwise use placeholders
    const rpcUser = account?.rpc_username || 'yourusername';
    const rpcPassword = account?.rpc_password || 'yourpassword';
    const rpcPort = account?.rpc_port || '9766';

    const proxyServerCode = `// local-rpc-proxy.js - Run this on your local machine
import http from 'http';

const RPC_HOST = '127.0.0.1';
const RPC_PORT = ${rpcPort};
const RPC_USER = '${rpcUser}'; ${rpcUser === 'yourusername' ? '// Change to your rod.conf rpcuser' : '// From your rod.conf'}
const RPC_PASSWORD = '${rpcPassword}'; ${rpcPassword === 'yourpassword' ? '// Change to your rod.conf rpcpassword' : '// From your rod.conf'}
const PROXY_PORT = 8545;

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const auth = Buffer.from(\`\${RPC_USER}:\${RPC_PASSWORD}\`).toString('base64');
            
            const options = {
                hostname: RPC_HOST,
                port: RPC_PORT,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Basic \${auth}\`
                }
            };

            const proxyReq = http.request(options, (proxyRes) => {
                let data = '';
                proxyRes.on('data', chunk => data += chunk);
                proxyRes.on('end', () => {
                    res.writeHead(proxyRes.statusCode, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(data);
                });
            });

            proxyReq.on('error', (err) => {
                console.error('Proxy error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            });

            proxyReq.write(body);
            proxyReq.end();
        });
    } else {
        res.writeHead(405);
        res.end('Method not allowed');
    }
});

server.listen(PROXY_PORT, () => {
    console.log(\`🚀 Local RPC Proxy running on http://localhost:\${PROXY_PORT}\`);
    console.log(\`📡 Forwarding to ROD Core at \${RPC_HOST}:\${RPC_PORT}\`);
});`;

    const setupCommands = {
        install: 'npm install',
        dev: 'npm run dev',
        proxyRun: 'node local-rpc-proxy.js'
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                    <Code className="w-4 h-4 mr-2" />
                    Local Dev Setup
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white text-2xl flex items-center gap-3">
                        <Server className="w-6 h-6 text-green-400" />
                        Local Development Setup
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Overview */}
                    <Alert className="bg-blue-900/20 border-blue-500/50">
                        <Zap className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-sm text-blue-300">
                            Run the wallet frontend locally on your machine while directly connecting to your local ROD Core node.
                            <strong> No cloud proxy or Ngrok needed!</strong>
                        </AlertDescription>
                    </Alert>

                    {/* Step 1: Install Node.js */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Badge className="bg-purple-500/20 text-purple-400">Step 1</Badge>
                                Install Node.js
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-slate-400">
                                Node.js is required to run the app. If you already have it installed, skip this step.
                            </p>
                            <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2">
                                <li>Go to <a href="https://nodejs.org" target="_blank" className="text-blue-400 underline">https://nodejs.org</a></li>
                                <li>Download the <strong className="text-white">LTS version</strong> (recommended for most users)</li>
                                <li>Run the installer and follow the installation wizard</li>
                                <li>Accept all default settings</li>
                                <li>Restart your terminal/command prompt after installation</li>
                            </ol>
                            <Alert className="bg-blue-900/20 border-blue-500/50 mt-3">
                                <AlertDescription className="text-xs text-blue-300">
                                    To verify installation, open a new terminal and type: <code className="text-purple-400">node --version</code>
                                    <br />You should see a version number like v20.x.x
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Step 2: Export App */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Badge className="bg-purple-500/20 text-purple-400">Step 2</Badge>
                                Export Your App
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-slate-400">
                                You need a <strong className="text-white">Builder plan or higher</strong> to export your app.
                            </p>
                            <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2">
                                <li>Click the <strong className="text-purple-400">More Actions (•••)</strong> menu at the top of the editor</li>
                                <li>Select <strong className="text-purple-400">"Export project as ZIP"</strong></li>
                                <li>Extract the downloaded ZIP file to a folder on your computer</li>
                            </ol>
                        </CardContent>
                    </Card>

                    {/* Step 3: Install Dependencies */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Badge className="bg-purple-500/20 text-purple-400">Step 3</Badge>
                                Install Dependencies
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-slate-400 mb-3">
                                <strong className="text-white">How to open terminal in the extracted folder:</strong>
                            </p>
                            <div className="bg-slate-800 p-3 rounded-md space-y-2 text-xs text-slate-300 mb-4">
                                <div>
                                    <strong className="text-blue-400">Windows:</strong>
                                    <ol className="list-decimal list-inside ml-3 mt-1 space-y-1">
                                        <li>Open the extracted folder in File Explorer</li>
                                        <li>Click in the address bar at the top (where the folder path shows)</li>
                                        <li>Type <code className="text-purple-400">cmd</code> and press Enter</li>
                                        <li>Command Prompt will open in that folder</li>
                                    </ol>
                                    <p className="text-slate-500 mt-2 ml-3">Alternative: Right-click in the folder → "Open in Terminal" (Windows 11)</p>
                                </div>
                                <div>
                                    <strong className="text-blue-400">Mac:</strong>
                                    <ol className="list-decimal list-inside ml-3 mt-1 space-y-1">
                                        <li>Right-click the folder in Finder</li>
                                        <li>Hold Option key → click "Open in Terminal"</li>
                                    </ol>
                                </div>
                                <div>
                                    <strong className="text-blue-400">Linux:</strong>
                                    <ol className="list-decimal list-inside ml-3 mt-1 space-y-1">
                                        <li>Right-click in the folder</li>
                                        <li>Select "Open in Terminal"</li>
                                    </ol>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400">Then run this command:</p>
                            <div className="relative">
                                <pre className="bg-slate-800 p-3 rounded-md font-mono text-sm text-green-400">
                                    {setupCommands.install}
                                </pre>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(setupCommands.install, 'install')}
                                >
                                    {copied === 'install' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 4: Create Local Proxy */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Badge className="bg-purple-500/20 text-purple-400">Step 4</Badge>
                                Create Local RPC Proxy
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-slate-400">
                                Download the proxy file and place it in your project root folder:
                            </p>
                            
                            <Button
                                onClick={() => {
                                    const blob = new Blob([proxyServerCode], { type: 'text/javascript' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'local-rpc-proxy.js';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    a.remove();
                                    toast.success('Proxy file downloaded!');
                                }}
                                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                                <Download className="w-4 h-4 mr-2" />
                                Download local-rpc-proxy.js
                            </Button>

                            <details className="bg-slate-800 rounded-md p-3">
                                <summary className="text-sm text-slate-300 cursor-pointer hover:text-white">
                                    View proxy code (optional)
                                </summary>
                                <div className="relative mt-3">
                                    <pre className="font-mono text-xs text-slate-300 max-h-64 overflow-y-auto">
                                        {proxyServerCode}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(proxyServerCode, 'proxy')}
                                    >
                                        {copied === 'proxy' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </details>

                            {(rpcUser === 'yourusername' || rpcPassword === 'yourpassword') ? (
                                <Alert className="bg-amber-900/20 border-amber-500/50">
                                    <AlertDescription className="text-xs text-amber-300">
                                        ⚠️ After downloading, edit the file and change <code>RPC_USER</code> and <code>RPC_PASSWORD</code> to match your rod.conf settings!
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert className="bg-green-900/20 border-green-500/50">
                                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                                    <AlertDescription className="text-xs text-green-300">
                                        ✓ Your RPC credentials from rod.conf have been automatically included in the proxy file!
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 5: Start Everything */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Badge className="bg-green-500/20 text-green-400">Step 5</Badge>
                                Start Local Development
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-400 mb-2">
                                    <strong className="text-white">Terminal 1:</strong> Start the local proxy
                                </p>
                                <div className="relative">
                                    <pre className="bg-slate-800 p-3 rounded-md font-mono text-sm text-green-400">
                                        {setupCommands.proxyRun}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(setupCommands.proxyRun, 'proxy-run')}
                                    >
                                        {copied === 'proxy-run' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-slate-400 mb-2">
                                    <strong className="text-white">Terminal 2:</strong> Start the wallet app
                                </p>
                                <div className="relative">
                                    <pre className="bg-slate-800 p-3 rounded-md font-mono text-sm text-green-400">
                                        {setupCommands.dev}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(setupCommands.dev, 'dev')}
                                    >
                                        {copied === 'dev' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            <Alert className="bg-green-900/20 border-green-500/50">
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                                <AlertDescription className="text-sm text-green-300">
                                    Your wallet will open at <strong>http://localhost:5173</strong> and connect to your local ROD node via the proxy at <strong>http://localhost:8545</strong>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Step 6: Configure RPC */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Badge className="bg-green-500/20 text-green-400">Step 6</Badge>
                                Configure Local RPC in Wallet
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-slate-400">In the Admin Panel, create a new RPC configuration:</p>
                            <div className="bg-slate-800 p-3 rounded-md space-y-2 text-sm">
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500">Name:</span>
                                    <span className="col-span-2 text-white">Local Dev Node</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500">Host:</span>
                                    <span className="col-span-2 text-purple-400">localhost</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500">Port:</span>
                                    <span className="col-span-2 text-purple-400">8545</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500">Username:</span>
                                    <span className="col-span-2 text-white">(leave empty - handled by proxy)</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500">Password:</span>
                                    <span className="col-span-2 text-white">(leave empty - handled by proxy)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Troubleshooting */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Terminal className="w-5 h-5" />
                                Troubleshooting
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-white font-semibold">Proxy won't start:</p>
                                    <p className="text-slate-400">• Check if port 8545 is already in use</p>
                                    <p className="text-slate-400">• Ensure Node.js is installed on your system</p>
                                </div>
                                <div>
                                    <p className="text-white font-semibold">Cannot connect to ROD Core:</p>
                                    <p className="text-slate-400">• Verify ROD Core is running</p>
                                    <p className="text-slate-400">• Check rod.conf has correct rpcuser/rpcpassword</p>
                                    <p className="text-slate-400">• Ensure you updated the credentials in local-rpc-proxy.js</p>
                                </div>
                                <div>
                                    <p className="text-white font-semibold">Wallet shows connection errors:</p>
                                    <p className="text-slate-400">• Confirm both proxy and ROD Core are running</p>
                                    <p className="text-slate-400">• Check browser console for CORS errors</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Note about Hosted vs Local */}
                    <Alert className="bg-purple-900/20 border-purple-500/50">
                        <AlertDescription className="text-sm text-purple-300">
                            <strong>Note:</strong> For the hosted version (base44.app), continue using Ngrok or the cloud RPC proxy. 
                            This local setup only works when running the app on your own machine.
                        </AlertDescription>
                    </Alert>
                </div>
            </DialogContent>
        </Dialog>
    );
}