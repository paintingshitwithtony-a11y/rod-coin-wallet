import React from 'react';
import { Button } from "@/components/ui/button";
import { Download, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Base44ClientFix() {
    const downloadBase44Client = () => {
        const clientCode = `import { createClient } from '@base44/sdk';

// CRITICAL: Hardcode APP_ID to fix 404 errors
const APP_ID = '695c1217b1d1db20f67a77f2';

export const base44 = createClient({
    appId: APP_ID
});`;
        
        const blob = new Blob([clientCode], { type: 'text/javascript' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'base44Client.js';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('base44Client.js downloaded - place in src/api/ folder (create folder if needed)');
    };

    return (
        <Button
            onClick={downloadBase44Client}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 animate-pulse">
            <Zap className="w-4 h-4 mr-2" />
            FIX IT NOW: Download base44Client.js
        </Button>
    );
}