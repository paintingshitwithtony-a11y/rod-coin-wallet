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

    const mainCode = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@base44/sdk';
import './globals.css';
import App from './App';

// DIRECT FIX - Initialize SDK here
window.__BASE44_SDK__ = createClient({
    appId: '695c1217b1d1db20f67a77f2'
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);`;

    const clientCode = `export const base44 = window.__BASE44_SDK__ || null;`;

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
        <div className="space-y-3">
            <Alert className="bg-red-900/20 border-red-500/50">
                <Zap className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                    <strong>NUCLEAR OPTION:</strong> Replace main.jsx and base44Client.js
                </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
                <Button
                    onClick={copyMainFile}
                    className="flex-1 bg-red-600 hover:bg-red-700">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy main.jsx Fix
                </Button>
                
                <Button
                    onClick={copyClientFile}
                    className="flex-1 bg-red-600 hover:bg-red-700">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy base44Client.js Fix
                </Button>
            </div>
            
            <p className="text-xs text-slate-400">
                1. Click "Copy main.jsx Fix" → Paste into src/main.jsx<br/>
                2. Click "Copy base44Client.js Fix" → Paste into src/api/base44Client.js<br/>
                3. Restart both terminals
            </p>
        </div>
    );
}