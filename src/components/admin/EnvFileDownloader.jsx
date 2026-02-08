import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function EnvFileDownloader() {
    const handleDownloadEnv = () => {
        const appId = "695c1217b1d1db20f67a77f2";
        const envContent = `VITE_APP_ID=${appId}`;
        
        const blob = new Blob([envContent], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '.env';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        toast.success('.env file downloaded - place it in your project root');
    };

    return (
        <Button
            onClick={handleDownloadEnv}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
            <Download className="w-4 h-4 mr-2" />
            Download .env File
        </Button>
    );
}