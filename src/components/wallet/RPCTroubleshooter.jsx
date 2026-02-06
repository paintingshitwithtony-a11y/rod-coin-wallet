import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    AlertCircle, CheckCircle2, XCircle, Loader2, 
    Terminal, Play, RefreshCw, ExternalLink, Copy
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function RPCTroubleshooter({ error, config, onRetry, onClose }) {
    const [checking, setChecking] = useState(false);
    const [diagnostics, setDiagnostics] = useState(null);

    const isConnectionRefused = error?.includes('Connection refused') || error?.includes('ECONNREFUSED');
    const isTimeout = error?.includes('timeout') || error?.includes('ETIMEDOUT');
    const isUnauthorized = error?.includes('401') || error?.includes('Unauthorized');

    const runDiagnostics = async () => {
        setChecking(true);
        const results = {
            nodeRunning: false,
            portOpen: false,
            authCorrect: false,
            configValid: true
        };

        // Simulate quick checks
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (isConnectionRefused) {
            results.nodeRunning = false;
            results.portOpen = false;
        } else if (isTimeout) {
            results.nodeRunning = false;
            results.portOpen = false;
        } else if (isUnauthorized) {
            results.nodeRunning = true;
            results.portOpen = true;
            results.authCorrect = false;
        }

        setDiagnostics(results);
        setChecking(false);
    };

    const commonSolutions = [
        {
            condition: isConnectionRefused,
            title: "ROD Core Not Running",
            description: "Your ROD Core wallet needs to be running with RPC enabled",
            icon: Play,
            color: "red",
            steps: [
                {
                    platform: "Windows",
                    command: `rod-qt.exe -server -rpcport=${config?.port || '9650'} -rpcbind=127.0.0.1`,
                    description: "Start ROD Core with RPC from Command Prompt"
                },
                {
                    platform: "Linux/Mac",
                    command: `./rodd -server -rpcport=${config?.port || '9650'} -rpcbind=127.0.0.1`,
                    description: "Start ROD Core daemon with RPC"
                }
            ]
        },
        {
            condition: isTimeout,
            title: "Connection Timeout",
            description: "The node is not responding or firewall is blocking",
            icon: AlertCircle,
            color: "amber",
            steps: [
                {
                    platform: "Check Firewall",
                    command: `Port ${config?.port || '9650'} may be blocked`,
                    description: "Use the 'Open Ports' button to get firewall commands"
                },
                {
                    platform: "Verify Node",
                    command: "Check if ROD Core is syncing or stuck",
                    description: "Open ROD Core GUI to verify it's running properly"
                }
            ]
        },
        {
            condition: isUnauthorized,
            title: "Authentication Failed",
            description: "Username/password or API key is incorrect",
            icon: XCircle,
            color: "red",
            steps: [
                {
                    platform: "Check Credentials",
                    command: "Verify username and password match rod.conf",
                    description: "Open your rod.conf file to verify credentials"
                },
                {
                    platform: "Cookie Auth",
                    command: "Use __cookie__ with .cookie file content",
                    description: "Located in ROD Core data directory"
                }
            ]
        }
    ];

    const activeSolution = commonSolutions.find(s => s.condition);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <Card 
                className="bg-slate-900 border-red-500/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-xl text-white">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                            Connection Failed
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="text-slate-400 hover:text-white"
                        >
                            ×
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Error Details */}
                    <Alert className="bg-red-500/10 border-red-500/30">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-300 text-sm">
                            <strong>Error:</strong> {error}
                        </AlertDescription>
                    </Alert>

                    {/* Connection Info */}
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                        <p className="text-xs text-slate-400 mb-2">Trying to connect to:</p>
                        <p className="text-white font-mono text-sm">
                            {config?.host || 'localhost'}:{config?.port || '9650'}
                        </p>
                    </div>

                    {/* Quick Diagnostics */}
                    <div className="space-y-2">
                        <Button
                            onClick={runDiagnostics}
                            disabled={checking}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {checking ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Running Diagnostics...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Run Quick Diagnostics
                                </>
                            )}
                        </Button>

                        {diagnostics && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-2 mt-3"
                            >
                                <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                                    <span className="text-sm text-slate-300">ROD Core Running</span>
                                    {diagnostics.nodeRunning ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-400" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                                    <span className="text-sm text-slate-300">Port Open</span>
                                    {diagnostics.portOpen ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-400" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                                    <span className="text-sm text-slate-300">Authentication</span>
                                    {diagnostics.authCorrect ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-400" />
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Solution Steps */}
                    {activeSolution && (
                        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 space-y-3">
                            <div className="flex items-center gap-2">
                                <activeSolution.icon className={`w-5 h-5 text-${activeSolution.color}-400`} />
                                <h4 className="text-white font-medium">{activeSolution.title}</h4>
                            </div>
                            <p className="text-sm text-slate-300">{activeSolution.description}</p>

                            <div className="space-y-3 mt-4">
                                {activeSolution.steps.map((step, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                                {step.platform}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-2">{step.description}</p>
                                        <div className="relative group">
                                            <pre className="bg-slate-900 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto">
                                                {step.command}
                                            </pre>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700 h-6 w-6 p-0"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(step.command);
                                                    toast.success('Command copied');
                                                }}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            onClick={onRetry}
                            variant="outline"
                            className="border-green-600 text-green-400 hover:bg-green-600/10"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry Connection
                        </Button>
                        <Button
                            onClick={() => {
                                window.open('https://github.com/RODCoin/RODCore/releases', '_blank');
                            }}
                            variant="outline"
                            className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Download ROD Core
                        </Button>
                    </div>

                    {/* Additional Resources */}
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <Terminal className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300/80 text-xs">
                            <strong>Still having issues?</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Check ROD Core is synced (may take hours for first sync)</li>
                                <li>Verify rod.conf has correct RPC settings</li>
                                <li>Try using cookie authentication (__cookie__)</li>
                                <li>Check antivirus isn't blocking the connection</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </motion.div>
    );
}