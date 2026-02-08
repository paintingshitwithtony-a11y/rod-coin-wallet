import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Copy, CheckCircle2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ViteBuildErrorFix() {
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
                className="border-amber-500/50 text-amber-400 hover:text-amber-300">
                <Zap className="w-4 h-4 mr-2" />
                Fix Vite Build Error
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl bg-slate-950 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-400" />
                            Fix: "Cannot resolve react/jsx-runtime"
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 text-slate-300">
                        <Alert className="bg-red-500/10 border-red-500/30">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-300">
                                <strong>Error:</strong> Rollup failed to resolve import "react/jsx-runtime"
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                                    Add "type": "module" to package.json
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">Open your package.json and add this line after "name":</p>
                                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                    <code className="text-green-400 font-mono text-sm">"type": "module",</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard('"type": "module",', 'type')}
                                        className="text-slate-400 hover:text-white">
                                        {copied === 'type' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Your package.json should look like:</p>
                                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 text-xs font-mono text-slate-300 overflow-x-auto">
{`{
  "name": "rod-wallet",
  "type": "module",
  "version": "1.0.0",
  ...
}`}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                                    Ensure React is Installed
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">Run this command:</p>
                                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                    <code className="text-green-400 font-mono text-sm">npm install react react-dom @vitejs/plugin-react</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard('npm install react react-dom @vitejs/plugin-react', 'react')}
                                        className="text-slate-400 hover:text-white">
                                        {copied === 'react' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                                    Delete node_modules and reinstall
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">If the above doesn't work, do a clean reinstall:</p>
                                <div className="space-y-2">
                                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                        <code className="text-amber-400 font-mono text-sm">rmdir /s node_modules</code>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => copyToClipboard('rmdir /s node_modules', 'rmdir')}
                                            className="text-slate-400 hover:text-white">
                                            {copied === 'rmdir' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                        <code className="text-amber-400 font-mono text-sm">npm install</code>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => copyToClipboard('npm install', 'reinstall')}
                                            className="text-slate-400 hover:text-white">
                                            {copied === 'reinstall' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Then try building again:</p>
                                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                    <code className="text-amber-400 font-mono text-sm">npm run electron:build</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard('npm run electron:build', 'build')}
                                        className="text-slate-400 hover:text-white">
                                        {copied === 'build' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Alert className="bg-blue-500/10 border-blue-500/30">
                            <AlertCircle className="h-4 w-4 text-blue-400" />
                            <AlertDescription className="text-blue-300">
                                <strong>Why this happens:</strong> React's jsx-runtime can't be found when Vite is building. Adding "type": "module" tells Node.js to treat the project as ES modules, which fixes the import resolution.
                            </AlertDescription>
                        </Alert>
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