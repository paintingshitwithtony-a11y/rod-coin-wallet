import React from 'react';
import { Button } from "@/components/ui/button";
import { Download, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function HardcodeAppId() {
    const downloadIndexHtml = () => {
        const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ROD Coin Wallet</title>
    <script>
      // CRITICAL: Set APP_ID before anything else loads
      window.__VITE_APP_ID__ = '695c1217b1d1db20f67a77f2';
      window.__BASE44_APP_ID__ = '695c1217b1d1db20f67a77f2';
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
        
        const blob = new Blob([indexHtml], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('index.html downloaded - replace the one in your project root!');
    };

    return (
        <Button
            onClick={downloadIndexHtml}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700">
            <Zap className="w-4 h-4 mr-2" />
            Download index.html (APP_ID Hardcoded)
        </Button>
    );
}