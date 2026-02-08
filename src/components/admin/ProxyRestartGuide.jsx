import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, RefreshCw, X, Power } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProxyRestartGuide() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400">
                <HelpCircle className="w-4 h-4 mr-2" />
                Restart Proxy Tutorial
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-slate-950 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-cyan-400" />
                            How to Restart the Electron Proxy
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Learn how to properly restart your hybrid Electron wallet app and RPC proxy
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Quick Restart */}
                        <Card className="bg-slate-900/50 border-cyan-500/30">
                            <CardHeader>
                                <CardTitle className="text-cyan-400 flex items-center gap-2">
                                    <RefreshCw className="w-5 h-5" />
                                    Quick Restart (Recommended)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-slate-300">The easiest way to restart just the RPC proxy without closing the app:</p>
                                <ol className="space-y-2 text-slate-300 ml-4">
                                    <li className="flex gap-3">
                                        <span className="text-cyan-400 font-bold">1.</span>
                                        Click the <span className="font-mono bg-slate-800 px-2 py-1 rounded text-cyan-300">"Restart Proxy"</span> button in the Admin panel
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-cyan-400 font-bold">2.</span>
                                        The proxy will restart on <span className="font-mono bg-slate-800 px-2 py-1 rounded text-cyan-300">localhost:9767</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-cyan-400 font-bold">3.</span>
                                        Your RPC connections will be re-tested automatically
                                    </li>
                                </ol>
                                <Alert className="bg-cyan-900/20 border-cyan-500/50 mt-4">
                                    <RefreshCw className="h-4 w-4 text-cyan-400" />
                                    <AlertDescription className="text-cyan-300">
                                        This takes ~2 seconds. The app stays open - only the proxy restarts.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Full App Restart */}
                        <Card className="bg-slate-900/50 border-amber-500/30">
                            <CardHeader>
                                <CardTitle className="text-amber-400 flex items-center gap-2">
                                    <Power className="w-5 h-5" />
                                    Full App Restart (Manual)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-slate-300">If you need to restart the entire Electron app:</p>
                                <ol className="space-y-2 text-slate-300 ml-4">
                                    <li className="flex gap-3">
                                        <span className="text-amber-400 font-bold">1.</span>
                                        Click the <span className="font-mono bg-slate-800 px-2 py-1 rounded text-amber-300">X button</span> to close the Electron window
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-amber-400 font-bold">2.</span>
                                        Open the app again from your desktop shortcut or Start menu
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-amber-400 font-bold">3.</span>
                                        The app will reload with a fresh proxy on <span className="font-mono bg-slate-800 px-2 py-1 rounded text-amber-300">localhost:9767</span>
                                    </li>
                                </ol>
                                <Alert className="bg-amber-900/20 border-amber-500/50 mt-4">
                                    <AlertDescription className="text-amber-300">
                                        Use this if the proxy is stuck or unresponsive. This takes ~5-10 seconds.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Troubleshooting */}
                        <Card className="bg-slate-900/50 border-red-500/30">
                            <CardHeader>
                                <CardTitle className="text-red-400 flex items-center gap-2">
                                    <X className="w-5 h-5" />
                                    Troubleshooting
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="text-red-300 font-semibold mb-2">Restart button not working?</h4>
                                    <ul className="text-slate-300 space-y-1 ml-4 list-disc">
                                        <li>Check that the Electron app is still open</li>
                                        <li>Make sure ROD Core is running on your machine</li>
                                        <li>Try a full app restart instead (close and reopen)</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="text-red-300 font-semibold mb-2">App won't start?</h4>
                                    <ul className="text-slate-300 space-y-1 ml-4 list-disc">
                                        <li>Verify ROD Core is running in Task Manager</li>
                                        <li>Check your RPC credentials in <span className="font-mono text-red-200">%APPDATA%\ROD\rod.conf</span></li>
                                        <li>Update electron-main.js with correct RPC credentials</li>
                                        <li>Test RPC connection manually (see Admin RPC Configuration tab)</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="text-red-300 font-semibold mb-2">Proxy says "Connection Error"?</h4>
                                    <ul className="text-slate-300 space-y-1 ml-4 list-disc">
                                        <li>ROD Core RPC is not responding</li>
                                        <li>Check that port 9766 is open and RPC is enabled in rod.conf</li>
                                        <li>Try restarting ROD Core, then restart the proxy</li>
                                        <li>Run the curl test to verify RPC directly (see RPC Configuration tab)</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        {/* How It Works */}
                        <Card className="bg-slate-900/50 border-purple-500/30">
                            <CardHeader>
                                <CardTitle className="text-purple-400 flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5" />
                                    How the Proxy Works
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-slate-300">The hybrid Electron app has two parts:</p>
                                <div className="space-y-2 ml-4 text-slate-300">
                                    <div className="flex gap-3">
                                        <span className="text-purple-400 font-bold">1.</span>
                                        <div>
                                            <p className="font-semibold">Electron Window (localhost:80+)</p>
                                            <p className="text-sm text-slate-400">Displays your wallet interface from the Base44 cloud app</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="text-purple-400 font-bold">2.</span>
                                        <div>
                                            <p className="font-semibold">RPC Proxy Server (localhost:9767)</p>
                                            <p className="text-sm text-slate-400">Forwards requests from the wallet to your local ROD Core node on port 9766</p>
                                        </div>
                                    </div>
                                </div>
                                <Alert className="bg-purple-900/20 border-purple-500/50 mt-4">
                                    <AlertDescription className="text-purple-300">
                                        <strong>Why localhost:9767?</strong> The web app can't directly access localhost:9766 (CORS restrictions), so the proxy bridges the connection securely.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}