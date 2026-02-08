import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, Zap, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function ViteDevServerGuide() {
    const [open, setOpen] = useState(false);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className="border-yellow-500/50 text-yellow-400">
                <Zap className="w-4 h-4 mr-2" />
                Vite Dev Server Guide
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-slate-950 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            Vite Development Server
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Local development without rebuilding for every change
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* What is Vite? */}
                        <Card className="bg-slate-900/50 border-yellow-500/30">
                            <CardHeader>
                                <CardTitle className="text-yellow-400">What is Vite?</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-slate-300">
                                    Vite is a <strong>local development server</strong> that runs your React app instantly with hot-reload. Changes appear in real-time without rebuilding.
                                </p>
                                <div className="bg-slate-800/50 p-4 rounded border border-slate-700 space-y-2 text-slate-300">
                                    <div className="flex gap-3">
                                        <span className="text-yellow-400">•</span>
                                        <div>
                                            <p className="font-semibold">For Development:</p>
                                            <p className="text-sm text-slate-400">Fast iteration - edit code, see changes instantly</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="text-yellow-400">•</span>
                                        <div>
                                            <p className="font-semibold">For Production:</p>
                                            <p className="text-sm text-slate-400">Users access your hosted Base44 app or built Windows installer</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Starting the Dev Server */}
                        <Card className="bg-slate-900/50 border-green-500/30">
                            <CardHeader>
                                <CardTitle className="text-green-400">How to Start the Dev Server</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ol className="space-y-3 text-slate-300 ml-4">
                                    <li className="flex gap-3">
                                        <span className="text-green-400 font-bold">1.</span>
                                        <div>
                                            Open <span className="font-mono bg-slate-800 px-2 py-1 rounded text-green-300">Command Prompt</span> or <span className="font-mono bg-slate-800 px-2 py-1 rounded text-green-300">PowerShell</span>
                                        </div>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-green-400 font-bold">2.</span>
                                        <div>
                                            Navigate to your project folder:
                                            <div className="bg-slate-800/50 p-3 rounded border border-slate-700 mt-2 flex items-center justify-between">
                                                <code className="text-green-300 text-sm">cd path\to\your\project</code>
                                                <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300" onClick={() => copyToClipboard('cd path\\to\\your\\project')}>
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-green-400 font-bold">3.</span>
                                        <div>
                                            Run the dev server:
                                            <div className="bg-slate-800/50 p-3 rounded border border-slate-700 mt-2 flex items-center justify-between">
                                                <code className="text-green-300 text-sm">npm run dev</code>
                                                <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300" onClick={() => copyToClipboard('npm run dev')}>
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-green-400 font-bold">4.</span>
                                        <div>
                                            It will print the local URL (usually <span className="font-mono bg-slate-800 px-2 py-1 rounded text-green-300">http://localhost:5173</span>)
                                        </div>
                                    </li>
                                </ol>
                            </CardContent>
                        </Card>

                        {/* Using with Electron */}
                        <Card className="bg-slate-900/50 border-blue-500/30">
                            <CardHeader>
                                <CardTitle className="text-blue-400">Using Vite Dev Server with Electron</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-slate-300">You can point your Electron app to the dev server for instant testing:</p>
                                <ol className="space-y-3 text-slate-300 ml-4">
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">1.</span>
                                        Start the Vite dev server (see above)
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">2.</span>
                                        <div>
                                            Edit your <span className="font-mono bg-slate-800 px-2 py-1 rounded text-blue-300">electron-main.js</span>:
                                            <div className="bg-slate-800/50 p-3 rounded border border-slate-700 mt-2 text-sm">
                                                <code className="text-blue-300">mainWindow.loadURL('http://localhost:5173');</code>
                                            </div>
                                        </div>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">3.</span>
                                        <div>
                                            In another terminal, start your Electron app:
                                            <div className="bg-slate-800/50 p-3 rounded border border-slate-700 mt-2 flex items-center justify-between">
                                                <code className="text-blue-300 text-sm">npm run electron:dev</code>
                                                <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300" onClick={() => copyToClipboard('npm run electron:dev')}>
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">4.</span>
                                        Now edit React code and changes appear in Electron instantly!
                                    </li>
                                </ol>
                                <Alert className="bg-blue-900/20 border-blue-500/50 mt-4">
                                    <AlertDescription className="text-blue-300">
                                        ⚡ Hot reload makes development ~10x faster - no rebuilding needed
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Important Notes */}
                        <Card className="bg-slate-900/50 border-amber-500/30">
                            <CardHeader>
                                <CardTitle className="text-amber-400">Important Notes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-slate-300">
                                <div className="flex gap-3">
                                    <span className="text-amber-400">⚠️</span>
                                    <div>
                                        <p className="font-semibold">Don't forget to switch back to production!</p>
                                        <p className="text-sm text-slate-400 mt-1">When you're done developing, change <span className="font-mono bg-slate-800 px-1 rounded">electron-main.js</span> back to load from your hosted URL (<span className="font-mono bg-slate-800 px-1 rounded">https://rod-coin-wallet.base44.app</span>)</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-amber-400">⚠️</span>
                                    <div>
                                        <p className="font-semibold">Port 5173 must be free</p>
                                        <p className="text-sm text-slate-400 mt-1">If another app uses port 5173, Vite will use 5174, 5175, etc. Check terminal output for the actual URL</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-amber-400">⚠️</span>
                                    <div>
                                        <p className="font-semibold">Vite is local only</p>
                                        <p className="text-sm text-slate-400 mt-1">The dev server only runs on your computer. It's not accessible online - only for local testing</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Troubleshooting */}
                        <Card className="bg-slate-900/50 border-red-500/30">
                            <CardHeader>
                                <CardTitle className="text-red-400">Troubleshooting</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-red-300 font-semibold mb-2">Dev server shows "Connection refused"?</p>
                                    <ul className="text-slate-300 space-y-1 ml-4 list-disc text-sm">
                                        <li>Make sure you ran <span className="font-mono bg-slate-800 px-1 rounded">npm run dev</span> first</li>
                                        <li>Check that the terminal shows "Local: http://localhost:XXXX"</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="text-red-300 font-semibold mb-2">Changes don't appear in Electron?</p>
                                    <ul className="text-slate-300 space-y-1 ml-4 list-disc text-sm">
                                        <li>Hot reload may take 2-3 seconds - wait a moment</li>
                                        <li>Try refreshing the Electron window (Ctrl+R)</li>
                                        <li>Check console for JavaScript errors</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="text-red-300 font-semibold mb-2">Port already in use?</p>
                                    <ul className="text-slate-300 space-y-1 ml-4 list-disc text-sm">
                                        <li>Close other Vite servers or apps using port 5173</li>
                                        <li>Or let Vite use the next available port (it will tell you)</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}