import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function EnvLocalDownloader() {
    const downloadEnvLocal = () => {
        const envContent = `VITE_APP_ID=695c1217b1d1db20f67a77f2
`;

        const blob = new Blob([envContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'env.local';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('env.local downloaded - rename to .env.local and place in project root');
    };

    return (
        <Button
            onClick={downloadEnvLocal}
            variant="outline"
            className="border-emerald-500/50 text-emerald-400 hover:text-emerald-300">
            <Download className="w-4 h-4 mr-2" />
            Download .env.local
        </Button>
    );
}