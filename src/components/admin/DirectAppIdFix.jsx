import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Zap, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function DirectAppIdFix() {
    const [showMain, setShowMain] = useState(false);
    const [showClient, setShowClient] = useState(false);

    const clientCode = `import { createClient } from '@base44/sdk';

export const base44 = createClient({
    appId: '695c1217b1d1db20f67a77f2'
});`;

    const copyToClipboard = (text, successMsg) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            toast.success(successMsg);
        } catch (err) {
            toast.error('Failed to copy - select and copy manually');
        }
        document.body.removeChild(textarea);
    };

    return (
        <>
            <div className="space-y-3">
                <Alert className="bg-red-900/20 border-red-500/50">
                    <Zap className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-300">
                        <strong>NUCLEAR OPTION:</strong> Replace main.jsx and base44Client.js
                    </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowMain(true)}
                        className="flex-1 bg-red-600 hover:bg-red-700">
                        <Copy className="w-4 h-4 mr-2" />
                        Show main.jsx Fix
                    </Button>
                    
                    <Button
                        onClick={() => setShowClient(true)}
                        className="flex-1 bg-red-600 hover:bg-red-700">
                        <Copy className="w-4 h-4 mr-2" />
                        Show base44Client.js Fix
                    </Button>
                </div>
                
                <p className="text-xs text-slate-400">
                    Click buttons above → Select all text → Copy → Paste into your files → Restart terminals
                </p>
            </div>

            <Dialog open={showMain} onOpenChange={setShowMain}>
                <DialogContent className="max-w-3xl bg-slate-950 border-slate-700">
                    <div className="space-y-3">
                        <h3 className="text-lg font-bold text-white">src/main.jsx</h3>
                        <Textarea 
                            value={mainCode}
                            readOnly
                            className="h-64 font-mono text-sm bg-slate-900 border-slate-700 text-white"
                            onClick={(e) => e.target.select()}
                        />
                        <Button
                            onClick={() => {
                                copyToClipboard(mainCode, 'Copied! Replace src/main.jsx');
                                setShowMain(false);
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-700">
                            <Copy className="w-4 h-4 mr-2" />
                            Copy to Clipboard
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showClient} onOpenChange={setShowClient}>
                <DialogContent className="max-w-3xl bg-slate-950 border-slate-700">
                    <div className="space-y-3">
                        <h3 className="text-lg font-bold text-white">src/api/base44Client.js</h3>
                        <Textarea 
                            value={clientCode}
                            readOnly
                            className="h-32 font-mono text-sm bg-slate-900 border-slate-700 text-white"
                            onClick={(e) => e.target.select()}
                        />
                        <Button
                            onClick={() => {
                                copyToClipboard(clientCode, 'Copied! Replace src/api/base44Client.js');
                                setShowClient(false);
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-700">
                            <Copy className="w-4 h-4 mr-2" />
                            Copy to Clipboard
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}