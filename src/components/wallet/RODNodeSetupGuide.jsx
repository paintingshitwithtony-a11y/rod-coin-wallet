import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Server, Globe, Shield, Terminal, CheckCircle2, 
    AlertTriangle, Copy, ExternalLink, Network, Lock, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

export default function RODNodeSetupGuide({ onClose }) {
    const [copiedText, setCopiedText] = useState(null);

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedText(null), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen p-4 flex items-center justify-center">
                <Card className="w-full max-w-4xl bg-slate-900 border-slate-700">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl text-white flex items-center gap-2">
                                <Server className="w-6 h-6 text-purple-400" />
                                ROD Core Node Setup Guide
                            </CardTitle>
                            <Button variant="ghost" onClick={onClose}>✕</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="local" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 bg-slate-800">
                                <TabsTrigger value="local">Local Setup</TabsTrigger>
                                <TabsTrigger value="remote">Remote Access</TabsTrigger>
                                <TabsTrigger value="mobile">Mobile Access</TabsTrigger>
                                <TabsTrigger value="security">Security</TabsTrigger>
                            </TabsList>

                            {/* LOCAL SETUP */}
                            <TabsContent value="local" className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Terminal className="w-5 h-5 text-green-400" />
                                        Step 1: Download & Install ROD Core
                                    </h3>
                                    
                                    <Alert className="bg-blue-500/10 border-blue-500/30">
                                        <AlertDescription className="text-blue-300">
                                            <strong>Important:</strong> ROD Core requires significant disk space (100GB+) 
                                            and will take several hours to sync with the blockchain.
                                        </AlertDescription>
                                    </Alert>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-slate-300">
                                                1. Download ROD Core from the official website:
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between text-purple-400 border-purple-500/50"
                                                onClick={() => window.open('https://www.spacexpanse.org', '_blank')}
                                            >
                                                <span>SpaceXpanse Official Website</span>
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                            
                                            <p className="text-slate-300">
                                                2. Install and run the ROD Core wallet/daemon
                                            </p>
                                            
                                            <p className="text-slate-300">
                                                3. Wait for blockchain synchronization (this can take hours or days)
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-amber-400" />
                                        Step 2: Configure RPC Access
                                    </h3>

                                    <Alert className="bg-purple-500/10 border-purple-500/30">
                                        <AlertDescription className="text-purple-300">
                                            <strong>RPC Command Reference:</strong> Check out the{' '}
                                            <a 
                                                href="http://explorer1.rod.spacexpanse.org:3001/rpc-browser" 
                                                target="_blank"
                                                className="underline hover:text-purple-200"
                                            >
                                                ROD RPC Browser
                                            </a>
                                            {' '}for a complete list of available commands and their documentation.
                                        </AlertDescription>
                                    </Alert>

                                    <p className="text-slate-300">
                                        Create or edit your <code className="bg-slate-800 px-2 py-1 rounded text-amber-400">rod.conf</code> file:
                                    </p>

                                    <Card className="bg-slate-950 border-slate-700">
                                        <CardContent className="p-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <code className="text-green-400 text-sm">rod.conf location:</code>
                                                </div>
                                                <div className="bg-slate-900 p-3 rounded font-mono text-xs text-slate-300 space-y-1">
                                                    <div><strong>Windows:</strong> %APPDATA%\ROD\rod.conf</div>
                                                    <div><strong>Linux:</strong> ~/.rod/rod.conf</div>
                                                    <div><strong>macOS:</strong> ~/Library/Application Support/ROD/rod.conf</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-slate-950 border-slate-700">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <code className="text-green-400">rod.conf contents:</code>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyToClipboard(
                                                        `server=1\nrpcuser=yourUsername\nrpcpassword=yourSecurePassword123\nrpcallowip=127.0.0.1\nrpcport=7667`,
                                                        'config'
                                                    )}
                                                    className="text-slate-400"
                                                >
                                                    {copiedText === 'config' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                            <pre className="bg-slate-900 p-3 rounded text-sm text-slate-300 overflow-x-auto">
{`server=1
rpcuser=yourUsername
rpcpassword=yourSecurePassword123
rpcallowip=127.0.0.1
rpcport=7667`}
                                            </pre>
                                        </CardContent>
                                    </Card>

                                    <Alert className="bg-amber-500/10 border-amber-500/30">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                        <AlertDescription className="text-amber-300">
                                            <strong>Security:</strong> Choose a strong, unique password for rpcpassword. 
                                            Never share your rod.conf file!
                                        </AlertDescription>
                                    </Alert>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Network className="w-5 h-5 text-blue-400" />
                                        Step 3: Connect Your Wallet
                                    </h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-slate-300">
                                                In the wallet RPC Configuration:
                                            </p>
                                            <div className="bg-slate-900 p-3 rounded space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Host:</span>
                                                    <code className="text-green-400">127.0.0.1</code>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Port:</span>
                                                    <code className="text-green-400">7667</code>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Username:</span>
                                                    <code className="text-green-400">yourUsername</code>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Password:</span>
                                                    <code className="text-green-400">yourSecurePassword123</code>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Alert className="bg-green-500/10 border-green-500/30">
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        <AlertDescription className="text-green-300">
                                            <strong>Success!</strong> Your wallet is now connected to your local ROD Core node. 
                                            You have full transaction history access!
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </TabsContent>

                            {/* REMOTE ACCESS */}
                            <TabsContent value="remote" className="space-y-6">
                                <Alert className="bg-amber-500/10 border-amber-500/30">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    <AlertDescription className="text-amber-300">
                                        <strong>Advanced Users Only:</strong> Exposing your node to the internet 
                                        requires careful security configuration.
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-blue-400" />
                                        Method 1: Port Forwarding (Router)
                                    </h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-slate-300">
                                                <strong>Step 1:</strong> Find your local IP address:
                                            </p>
                                            <div className="bg-slate-900 p-3 rounded font-mono text-xs">
                                                <div className="text-slate-400">Windows: <code className="text-green-400">ipconfig</code></div>
                                                <div className="text-slate-400">Linux/Mac: <code className="text-green-400">ifconfig</code> or <code className="text-green-400">ip addr</code></div>
                                            </div>

                                            <p className="text-slate-300">
                                                <strong>Step 2:</strong> Log into your router (usually 192.168.1.1 or 192.168.0.1)
                                            </p>

                                            <p className="text-slate-300">
                                                <strong>Step 3:</strong> Set up port forwarding:
                                            </p>
                                            <div className="bg-slate-900 p-3 rounded space-y-1 text-sm">
                                                <div className="text-slate-300">External Port: <code className="text-green-400">7667</code></div>
                                                <div className="text-slate-300">Internal IP: <code className="text-green-400">Your PC's local IP</code></div>
                                                <div className="text-slate-300">Internal Port: <code className="text-green-400">7667</code></div>
                                                <div className="text-slate-300">Protocol: <code className="text-green-400">TCP</code></div>
                                            </div>

                                            <p className="text-slate-300">
                                                <strong>Step 4:</strong> Update rod.conf to allow external connections:
                                            </p>
                                            <pre className="bg-slate-950 p-3 rounded text-sm text-slate-300">
{`rpcallowip=0.0.0.0/0
rpcbind=0.0.0.0`}
                                            </pre>

                                            <Alert className="bg-red-500/10 border-red-500/30">
                                                <AlertDescription className="text-red-300">
                                                    <strong>Warning:</strong> This exposes your RPC to the internet. 
                                                    Use a VERY strong password and consider using a VPN instead!
                                                </AlertDescription>
                                            </Alert>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-purple-400" />
                                        Method 2: VPN (Recommended)
                                    </h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-slate-300">
                                                Set up a VPN server (like WireGuard or OpenVPN) on your home network:
                                            </p>
                                            
                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                                ✓ Encrypted connection
                                            </Badge>
                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                                ✓ No port forwarding needed
                                            </Badge>
                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                                ✓ Access entire home network securely
                                            </Badge>

                                            <div className="bg-slate-900 p-3 rounded space-y-2">
                                                <p className="text-slate-300 text-sm">
                                                    Popular VPN solutions:
                                                </p>
                                                <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                                                    <li>WireGuard (fast, modern)</li>
                                                    <li>OpenVPN (widely supported)</li>
                                                    <li>Tailscale (easiest setup)</li>
                                                </ul>
                                            </div>

                                            <p className="text-slate-300 text-sm">
                                                Once VPN is connected, use your local IP (127.0.0.1 or 192.168.x.x) to connect.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white">Getting Your Public IP</h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-slate-300">Visit these sites to find your public IP:</p>
                                            <div className="flex gap-2 flex-wrap">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open('https://whatismyipaddress.com', '_blank')}
                                                    className="text-purple-400 border-purple-500/50"
                                                >
                                                    whatismyipaddress.com
                                                    <ExternalLink className="w-3 h-3 ml-2" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open('https://www.myip.com', '_blank')}
                                                    className="text-purple-400 border-purple-500/50"
                                                >
                                                    myip.com
                                                    <ExternalLink className="w-3 h-3 ml-2" />
                                                </Button>
                                            </div>

                                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                                <AlertDescription className="text-blue-300">
                                                    <strong>Dynamic IP?</strong> Most home connections have dynamic IPs that change. 
                                                    Consider using a Dynamic DNS service (like No-IP or DuckDNS).
                                                </AlertDescription>
                                            </Alert>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* MOBILE ACCESS */}
                            <TabsContent value="mobile" className="space-y-6">
                                <Alert className="bg-blue-500/10 border-blue-500/30">
                                    <Smartphone className="w-4 h-4 text-blue-400" />
                                    <AlertDescription className="text-blue-300">
                                        <strong>Connect from Anywhere:</strong> Access your ROD node from your phone 
                                        on cellular data or any WiFi network.
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Smartphone className="w-5 h-5 text-purple-400" />
                                        Mobile Connection Overview
                                    </h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-slate-300">
                                                To access your node from a mobile device on its own internet connection, you need:
                                            </p>
                                            <div className="space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mt-0.5">1</Badge>
                                                    <p className="text-slate-300 text-sm">
                                                        Your home node running ROD Core with RPC enabled
                                                    </p>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mt-0.5">2</Badge>
                                                    <p className="text-slate-300 text-sm">
                                                        Port forwarding on your router OR a VPN connection
                                                    </p>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mt-0.5">3</Badge>
                                                    <p className="text-slate-300 text-sm">
                                                        Your public IP address or dynamic DNS hostname
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-green-400" />
                                        Option 1: VPN (Most Secure)
                                    </h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-slate-300 font-semibold text-green-400">
                                                ✓ Recommended for mobile access
                                            </p>
                                            
                                            <div className="space-y-2">
                                                <p className="text-slate-300">
                                                    <strong>Setup:</strong>
                                                </p>
                                                <div className="bg-slate-900 p-3 rounded space-y-2 text-sm">
                                                    <p className="text-slate-300">
                                                        1. Install Tailscale (easiest) or WireGuard on your home computer running ROD Core
                                                    </p>
                                                    <p className="text-slate-300">
                                                        2. Install the VPN app on your phone
                                                    </p>
                                                    <p className="text-slate-300">
                                                        3. Connect both devices to the same VPN network
                                                    </p>
                                                    <p className="text-slate-300">
                                                        4. Use your computer's VPN IP (usually starts with 100.x.x.x for Tailscale)
                                                    </p>
                                                </div>

                                                <div className="flex gap-2 mt-3">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open('https://tailscale.com', '_blank')}
                                                        className="text-purple-400 border-purple-500/50"
                                                    >
                                                        Tailscale Setup
                                                        <ExternalLink className="w-3 h-3 ml-2" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open('https://www.wireguard.com', '_blank')}
                                                        className="text-purple-400 border-purple-500/50"
                                                    >
                                                        WireGuard
                                                        <ExternalLink className="w-3 h-3 ml-2" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <Alert className="bg-green-500/10 border-green-500/30">
                                                <AlertDescription className="text-green-300 text-sm">
                                                    <strong>Benefits:</strong> Encrypted connection, no port forwarding needed, 
                                                    works on any network (cellular, WiFi, public WiFi)
                                                </AlertDescription>
                                            </Alert>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-blue-400" />
                                        Option 2: Direct Connection (Port Forwarding)
                                    </h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <Alert className="bg-amber-500/10 border-amber-500/30">
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                <AlertDescription className="text-amber-300 text-sm">
                                                    <strong>Less Secure:</strong> Exposes your node to the internet. 
                                                    Only use with a very strong password!
                                                </AlertDescription>
                                            </Alert>

                                            <p className="text-slate-300">
                                                <strong>Setup Steps:</strong>
                                            </p>
                                            <div className="bg-slate-900 p-3 rounded space-y-2 text-sm">
                                                <p className="text-slate-300">
                                                    1. <strong>Router Port Forwarding:</strong> Forward port 7667 to your computer's local IP
                                                </p>
                                                <p className="text-slate-300">
                                                    2. <strong>Update rod.conf:</strong> Add these lines:
                                                </p>
                                                <pre className="bg-slate-950 p-2 rounded text-xs text-green-400">
{`rpcallowip=0.0.0.0/0
rpcbind=0.0.0.0`}
                                                </pre>
                                                <p className="text-slate-300">
                                                    3. <strong>Get Your Public IP:</strong> Visit whatismyipaddress.com
                                                </p>
                                                <p className="text-slate-300">
                                                    4. <strong>Mobile RPC Config:</strong>
                                                </p>
                                                <div className="bg-slate-950 p-2 rounded text-xs space-y-1">
                                                    <div className="text-slate-400">Host: <span className="text-green-400">YOUR.PUBLIC.IP.HERE</span></div>
                                                    <div className="text-slate-400">Port: <span className="text-green-400">7667</span></div>
                                                    <div className="text-slate-400">Username: <span className="text-green-400">(from rod.conf)</span></div>
                                                    <div className="text-slate-400">Password: <span className="text-green-400">(from rod.conf)</span></div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white">Dynamic IP Solution</h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-slate-300">
                                                Most home internet connections have dynamic IPs that change periodically. 
                                                Use a <strong>Dynamic DNS</strong> service to get a permanent hostname:
                                            </p>
                                            
                                            <div className="bg-slate-900 p-3 rounded space-y-2">
                                                <p className="text-slate-300 text-sm font-semibold">Free Dynamic DNS Services:</p>
                                                <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                                                    <li>No-IP (noip.com) - Free subdomain like mynode.hopto.org</li>
                                                    <li>DuckDNS (duckdns.org) - Simple and free</li>
                                                    <li>Afraid.org - Multiple domain options</li>
                                                </ul>
                                            </div>

                                            <p className="text-slate-300 text-sm">
                                                Once set up, use your hostname instead of IP in the mobile RPC configuration.
                                            </p>

                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open('https://www.noip.com', '_blank')}
                                                    className="text-purple-400 border-purple-500/50"
                                                >
                                                    No-IP
                                                    <ExternalLink className="w-3 h-3 ml-2" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open('https://www.duckdns.org', '_blank')}
                                                    className="text-purple-400 border-purple-500/50"
                                                >
                                                    DuckDNS
                                                    <ExternalLink className="w-3 h-3 ml-2" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white">Troubleshooting Mobile Connection</h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-white font-semibold">Can't connect from mobile?</p>
                                                        <ul className="text-slate-300 text-sm space-y-1 mt-1 list-disc list-inside">
                                                            <li>Check that ROD Core is running on your home computer</li>
                                                            <li>Verify port forwarding is configured correctly</li>
                                                            <li>Test with your public IP in a browser: http://YOUR.IP:7667</li>
                                                            <li>Make sure your router firewall allows incoming connections</li>
                                                            <li>Disable any VPN on your phone that might block connections</li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-white font-semibold">ISP Blocking?</p>
                                                        <p className="text-slate-300 text-sm mt-1">
                                                            Some ISPs block incoming connections. If nothing works, VPN is your best option.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Alert className="bg-blue-500/10 border-blue-500/30">
                                    <AlertDescription className="text-blue-300 text-sm">
                                        <strong>Quick Test:</strong> Try connecting from your phone while on home WiFi first. 
                                        If that works, the issue is likely port forwarding or firewall related.
                                    </AlertDescription>
                                </Alert>
                            </TabsContent>

                            {/* SECURITY */}
                            <TabsContent value="security" className="space-y-6">
                                <Alert className="bg-red-500/10 border-red-500/30">
                                    <Shield className="w-4 h-4 text-red-400" />
                                    <AlertDescription className="text-red-300">
                                        <strong>Critical:</strong> Your node contains wallet access. 
                                        Poor security can lead to loss of funds!
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white">Security Best Practices</h3>

                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardContent className="p-4 space-y-4">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                                <div>
                                                    <p className="text-white font-semibold">Use Strong Passwords</p>
                                                    <p className="text-slate-300 text-sm">
                                                        rpcpassword should be at least 20 characters with mixed case, numbers, and symbols
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                                <div>
                                                    <p className="text-white font-semibold">Limit RPC Access</p>
                                                    <p className="text-slate-300 text-sm">
                                                        Use specific IPs in rpcallowip instead of 0.0.0.0/0 when possible
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                                <div>
                                                    <p className="text-white font-semibold">Enable Firewall</p>
                                                    <p className="text-slate-300 text-sm">
                                                        Only allow connections on port 7667 from trusted sources
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                                <div>
                                                    <p className="text-white font-semibold">Use VPN for Remote Access</p>
                                                    <p className="text-slate-300 text-sm">
                                                        VPN encrypts all traffic and avoids exposing RPC directly to internet
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                                <div>
                                                    <p className="text-white font-semibold">Keep Software Updated</p>
                                                    <p className="text-slate-300 text-sm">
                                                        Always use the latest version of ROD Core for security patches
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                                <div>
                                                    <p className="text-white font-semibold">Backup Wallet Regularly</p>
                                                    <p className="text-slate-300 text-sm">
                                                        Keep encrypted backups of your wallet.dat in multiple secure locations
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                                                <div>
                                                    <p className="text-white font-semibold">Never Share Credentials</p>
                                                    <p className="text-slate-300 text-sm">
                                                        Never share your rod.conf, private keys, or wallet files with anyone
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white">Recommended rod.conf Security Settings</h3>

                                    <Card className="bg-slate-950 border-slate-700">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <code className="text-green-400">Secure rod.conf:</code>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyToClipboard(
                                                        `server=1\nrpcuser=rod_admin_${Math.random().toString(36).substr(2, 9)}\nrpcpassword=${Math.random().toString(36).substr(2, 15)}${Math.random().toString(36).substr(2, 15)}\nrpcallowip=127.0.0.1\nrpcport=7667\nrpctimeout=300\nmaxconnections=40`,
                                                        'secure'
                                                    )}
                                                    className="text-slate-400"
                                                >
                                                    {copiedText === 'secure' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                            <pre className="bg-slate-900 p-3 rounded text-sm text-slate-300 overflow-x-auto">
{`server=1
rpcuser=rod_admin_${Math.random().toString(36).substr(2, 9)}
rpcpassword=${Math.random().toString(36).substr(2, 15)}${Math.random().toString(36).substr(2, 15)}
rpcallowip=127.0.0.1
rpcport=7667
rpctimeout=300
maxconnections=40`}
                                            </pre>
                                            <p className="text-slate-400 text-xs mt-2">
                                                ↑ Click copy for auto-generated secure credentials
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="outline" onClick={onClose}>
                                Close Guide
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}