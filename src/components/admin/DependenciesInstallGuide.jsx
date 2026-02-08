import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Copy, CheckCircle2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DependenciesInstallGuide() {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(null);

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className="border-green-500/50 text-green-400 hover:text-green-300">
                <Package className="w-4 h-4 mr-2" />
                Install Dependencies
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl bg-slate-950 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-green-400" />
                            Install Missing Dependencies
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 text-slate-300">
                        <Alert className="bg-red-500/10 border-red-500/30">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-300">
                                <strong>Error:</strong> "'vite' is not recognized as an internal or external command"
                            </AlertDescription>
                        </Alert>

                        <p className="text-sm text-slate-400">
                            This error means npm packages are not installed. You need to install the project dependencies before building.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                                    Install All Dependencies
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">Run this command in your project folder:</p>
                                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                    <code className="text-green-400 font-mono text-sm">npm install</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard('npm install', 'install')}
                                        className="text-slate-400 hover:text-white">
                                        {copied === 'install' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">This will read package.json and install all required packages. Wait for it to complete.</p>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                                    Install Specific Package (if needed)
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">If a specific package is missing, install it directly:</p>
                                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                    <code className="text-green-400 font-mono text-sm">npm install vite @vitejs/plugin-react --save-dev</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard('npm install vite @vitejs/plugin-react --save-dev', 'specific')}
                                        className="text-slate-400 hover:text-white">
                                        {copied === 'specific' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Replace 'vite' and 'plugin-react' with any other missing package names.</p>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                                    Retry Your Build Command
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">After installation completes, try your build again:</p>
                                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                    <code className="text-amber-400 font-mono text-sm">npm run electron:build</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard('npm run electron:build', 'rebuild')}
                                        className="text-slate-400 hover:text-white">
                                        {copied === 'rebuild' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Alert className="bg-blue-500/10 border-blue-500/30">
                            <AlertCircle className="h-4 w-4 text-blue-400" />
                            <AlertDescription className="text-blue-300">
                                <strong>Tip:</strong> Always run `npm install` after cloning a project or pulling new code. It ensures all dependencies are available.
                            </AlertDescription>
                        </Alert>

                        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700 space-y-2">
                            <p className="text-xs text-slate-400"><strong>What's happening?</strong></p>
                            <ul className="text-xs text-slate-500 space-y-1">
                                <li>• <code className="bg-slate-900 px-1 rounded">npm install</code> reads package.json</li>
                                <li>• Downloads all packages listed in dependencies and devDependencies</li>
                                <li>• Creates node_modules folder with all code</li>
                                <li>• Creates package-lock.json to lock versions</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                        <Button
                            onClick={() => setOpen(false)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700">
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}