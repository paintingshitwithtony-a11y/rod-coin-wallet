import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, Link2, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function DesktopShortcutGuide() {
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
                className="border-green-500/50 text-green-400">
                <Link2 className="w-4 h-4 mr-2" />
                Create Desktop Shortcut
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-950 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-green-400" />
                            Create Desktop Shortcut
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Quick ways to add your Electron wallet to the desktop
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Method 1: Automatic */}
                        <Card className="bg-slate-900/50 border-green-500/30">
                            <CardHeader>
                                <CardTitle className="text-green-400">Method 1: Automatic (Easiest)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-slate-300">When you built the Windows installer, it automatically creates a start menu shortcut. Here's how to pin it to desktop:</p>
                                <ol className="space-y-2 text-slate-300 ml-4">
                                    <li className="flex gap-3">
                                        <span className="text-green-400 font-bold">1.</span>
                                        Press <span className="font-mono bg-slate-800 px-2 py-1 rounded text-green-300">Windows Key</span> and search for <span className="font-mono bg-slate-800 px-2 py-1 rounded text-green-300">ROD Wallet</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-green-400 font-bold">2.</span>
                                        Right-click on the app result
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-green-400 font-bold">3.</span>
                                        Click <span className="font-mono bg-slate-800 px-2 py-1 rounded text-green-300">"Pin to Desktop"</span> or drag it to desktop
                                    </li>
                                </ol>
                                <Alert className="bg-green-900/20 border-green-500/50 mt-4">
                                    <AlertDescription className="text-green-300">
                                        ✓ This is the fastest method - takes 10 seconds
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Method 2: From Program Files */}
                        <Card className="bg-slate-900/50 border-blue-500/30">
                            <CardHeader>
                                <CardTitle className="text-blue-400">Method 2: From Program Files</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-slate-300">Find the exe file and create a shortcut manually:</p>
                                <ol className="space-y-2 text-slate-300 ml-4">
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">1.</span>
                                        Press <span className="font-mono bg-slate-800 px-2 py-1 rounded text-blue-300">Windows Key + E</span> to open File Explorer
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">2.</span>
                                        Navigate to: <span className="font-mono bg-slate-800 px-2 py-1 rounded text-blue-300 text-xs">C:\Program Files\ROD Wallet</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">3.</span>
                                        Find <span className="font-mono bg-slate-800 px-2 py-1 rounded text-blue-300">ROD Wallet.exe</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">4.</span>
                                        Right-click → <span className="font-mono bg-slate-800 px-2 py-1 rounded text-blue-300">"Send to"</span> → <span className="font-mono bg-slate-800 px-2 py-1 rounded text-blue-300">"Desktop (create shortcut)"</span>
                                    </li>
                                </ol>
                                <Alert className="bg-blue-900/20 border-blue-500/50 mt-4">
                                    <AlertDescription className="text-blue-300">
                                        ✓ Works if installer didn't create start menu entry
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Method 3: Manual Right-Click */}
                        <Card className="bg-slate-900/50 border-purple-500/30">
                            <CardHeader>
                                <CardTitle className="text-purple-400">Method 3: Manual Right-Click Shortcut</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-slate-300">Create a shortcut directly on desktop:</p>
                                <ol className="space-y-2 text-slate-300 ml-4">
                                    <li className="flex gap-3">
                                        <span className="text-purple-400 font-bold">1.</span>
                                        Right-click on empty desktop space
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-purple-400 font-bold">2.</span>
                                        Click <span className="font-mono bg-slate-800 px-2 py-1 rounded text-purple-300">"New"</span> → <span className="font-mono bg-slate-800 px-2 py-1 rounded text-purple-300">"Shortcut"</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-purple-400 font-bold">3.</span>
                                        In the location field, paste this path:
                                    </li>
                                </ol>
                                <div className="bg-slate-800/50 p-3 rounded border border-slate-700 mt-3">
                                    <code className="text-purple-300 text-sm break-all">C:\Program Files\ROD Wallet\ROD Wallet.exe</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="float-right text-purple-400 hover:text-purple-300"
                                        onClick={() => copyToClipboard('C:\\Program Files\\ROD Wallet\\ROD Wallet.exe')}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <ol className="space-y-2 text-slate-300 ml-4" start={4}>
                                    <li className="flex gap-3">
                                        <span className="text-purple-400 font-bold">4.</span>
                                        Click <span className="font-mono bg-slate-800 px-2 py-1 rounded text-purple-300">"Next"</span> and name it <span className="font-mono bg-slate-800 px-2 py-1 rounded text-purple-300">"ROD Wallet"</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-purple-400 font-bold">5.</span>
                                        Click <span className="font-mono bg-slate-800 px-2 py-1 rounded text-purple-300">"Finish"</span>
                                    </li>
                                </ol>
                            </CardContent>
                        </Card>

                        {/* Troubleshooting */}
                        <Card className="bg-slate-900/50 border-amber-500/30">
                            <CardHeader>
                                <CardTitle className="text-amber-400">Can't Find the EXE?</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-slate-300">If the file isn't in Program Files, check these locations:</p>
                                <div className="space-y-2 text-slate-300 ml-4">
                                    <div className="flex gap-2">
                                        <span className="text-amber-400">•</span>
                                        <code className="text-amber-200 bg-slate-800 px-2 py-1 rounded text-sm">C:\Users\YourName\AppData\Local\Programs\ROD Wallet</code>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-amber-400">•</span>
                                        <code className="text-amber-200 bg-slate-800 px-2 py-1 rounded text-sm">C:\Users\YourName\Desktop\release</code>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-amber-400">•</span>
                                        Wherever you extracted the installer files
                                    </div>
                                </div>
                                <p className="text-slate-300 mt-4">Or search your entire computer for <span className="font-mono bg-slate-800 px-2 py-1 rounded text-amber-200">*.exe</span> with "ROD" in the name</p>
                            </CardContent>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}