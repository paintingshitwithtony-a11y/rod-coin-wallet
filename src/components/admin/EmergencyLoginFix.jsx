import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { AlertCircle, Download, CheckCircle2, Terminal } from 'lucide-react';
import { toast } from 'sonner';

export default function EmergencyLoginFix() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);

    const downloadViteConfig = () => {
        const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  define: {
    'import.meta.env.VITE_APP_ID': JSON.stringify('695c1217b1d1db20f67a77f2')
  }
});`;
        
        const blob = new Blob([viteConfig], { type: 'text/javascript' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vite.config.js';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('vite.config.js downloaded!');
        setStep(1);
    };

    const steps = [
        {
            title: "Step 1: Download Fixed Config",
            action: downloadViteConfig,
            buttonText: "Download vite.config.js",
            instructions: "Click the button to download the fixed vite.config.js file with hardcoded APP_ID"
        },
        {
            title: "Step 2: Replace Your Config",
            instructions: "1. Go to your project folder: C:\\Users\\paint\\Downloads\\rod-coin-wallet\n2. Find the existing vite.config.js file\n3. DELETE it or rename it to vite.config.js.old\n4. Move the downloaded vite.config.js into this folder"
        },
        {
            title: "Step 3: Restart Vite Dev Server",
            instructions: "1. Go to Terminal 1 (the one running npm run dev)\n2. Press Ctrl+C to stop it\n3. Type: npm run dev\n4. Wait for it to say 'Local: http://localhost:5173/'"
        },
        {
            title: "Step 4: Restart Electron",
            instructions: "1. Go to Terminal 2 (the one running electron:dev)\n2. Press Ctrl+C to stop it\n3. Type: npm run electron:dev\n4. The login screen should now work!"
        }
    ];

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 animate-pulse">
                <AlertCircle className="w-4 h-4 mr-2" />
                EMERGENCY: Fix Login 404
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl bg-slate-950 border-red-500/50">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2 text-xl">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                            Emergency Login Fix - Follow These Steps
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        <Card className="bg-red-900/30 border-red-500/50 p-4">
                            <p className="text-red-200 text-sm">
                                <strong>Problem:</strong> Base44 SDK getting 404 errors because VITE_APP_ID is not loaded.
                            </p>
                            <p className="text-red-200 text-sm mt-2">
                                <strong>Solution:</strong> Hardcode the APP_ID directly in vite.config.js
                            </p>
                        </Card>

                        {steps.map((stepData, idx) => (
                            <Card 
                                key={idx}
                                className={`p-4 ${
                                    step >= idx 
                                        ? 'bg-green-900/30 border-green-500/50' 
                                        : 'bg-slate-900/50 border-slate-700'
                                }`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        step > idx 
                                            ? 'bg-green-500 text-white' 
                                            : step === idx 
                                                ? 'bg-blue-500 text-white' 
                                                : 'bg-slate-700 text-slate-400'
                                    }`}>
                                        {step > idx ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold mb-2">{stepData.title}</h3>
                                        <pre className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-800/50 p-3 rounded">
{stepData.instructions}
                                        </pre>
                                        {stepData.action && step === idx && (
                                            <Button
                                                onClick={stepData.action}
                                                className="mt-3 bg-blue-600 hover:bg-blue-700 w-full">
                                                <Download className="w-4 h-4 mr-2" />
                                                {stepData.buttonText}
                                            </Button>
                                        )}
                                        {!stepData.action && (
                                            <Button
                                                onClick={() => setStep(idx + 1)}
                                                disabled={step < idx}
                                                className="mt-3 w-full"
                                                variant={step === idx ? "default" : "outline"}>
                                                {step === idx ? "I've Done This Step" : "Complete Previous Steps First"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {step >= steps.length && (
                            <Card className="bg-green-900/30 border-green-500/50 p-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                                    <div>
                                        <p className="text-green-200 font-semibold">All Done!</p>
                                        <p className="text-green-300 text-sm">Your login should now work. If you still see 404 errors, try closing and reopening the Electron window.</p>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}