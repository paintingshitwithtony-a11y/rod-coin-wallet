import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Copy, CheckCircle2, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ElectronRestartGuide() {
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
                className="border-blue-500/50 text-blue-400 hover:text-blue-300">
                <Terminal className="w-4 h-4 mr-2" />
                Restart Electron App
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl bg-slate-950 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-blue-400" />
                            How to Restart the Electron App
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 text-slate-300">
                        <Alert className="bg-blue-500/10 border-blue-500/30">
                            <AlertCircle className="h-4 w-4 text-blue-400" />
                            <AlertDescription className="text-blue-300">
                                If the app doesn't show new code changes, you need to fully restart the npm process and rebuild.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                                    Stop the Current Process
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">In the terminal where your Electron app is running, press:</p>
                                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                    <code className="text-amber-400 font-mono text-sm">Ctrl + C</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard('Ctrl + C', 'stop')}
                                        className="text-slate-400 hover:text-white">
                                        {copied === 'stop' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">This will terminate the npm process gracefully.</p>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                                    Clear Node Cache (Optional but Recommended)
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">Clear npm cache to ensure clean rebuild:</p>
                                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                    <code className="text-green-400 font-mono text-sm">npm cache clean --force</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard('npm cache clean --force', 'cache')}
                                        className="text-slate-400 hover:text-white">
                                        {copied === 'cache' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                                    Rebuild the App
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">Run the Electron development build:</p>
                                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                                    <code className="text-green-400 font-mono text-sm">npm run electron:dev</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard('npm run electron:dev', 'rebuild')}
                                        className="text-slate-400 hover:text-white">
                                        {copied === 'rebuild' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Wait for the build to complete. The Electron app will start automatically.</p>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
                                    Verify the Update
                                </h3>
                                <p className="text-sm text-slate-400">Once the app restarts, check the header area for the "Test Electron Proxy" button. If you still don't see it:</p>
                                <ul className="list-disc list-inside text-sm text-slate-400 mt-2 space-y-1">
                                    <li>Press <code className="bg-slate-800 px-1 rounded text-amber-400">Ctrl+Shift+R</code> to hard-refresh</li>
                                    <li>Check browser console (<code className="bg-slate-800 px-1 rounded text-amber-400">F12</code>) for errors</li>
                                    <li>Restart the app again if needed</li>
                                </ul>
                            </div>
                        </div>

                        <Alert className="bg-amber-500/10 border-amber-500/30">
                            <AlertCircle className="h-4 w-4 text-amber-400" />
                            <AlertDescription className="text-amber-300">
                                <strong>Common Issues:</strong> If the app won't start, check that port 9767 isn't already in use and that your ROD RPC configuration is correct.
                            </AlertDescription>
                        </Alert>

                        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
                            <p className="text-xs text-slate-400"><strong>Pro Tip:</strong> Keep the terminal window open so you can see error messages. If something goes wrong, the errors will appear there.</p>
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