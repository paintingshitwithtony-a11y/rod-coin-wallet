import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ViteConfigDownloader() {
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
        toast.success('vite.config.js downloaded - APP_ID hardcoded! Restart Vite dev server.');
    };

    return (
        <Button
            onClick={downloadViteConfig}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
            <Download className="w-4 h-4 mr-2" />
            Download vite.config.js (APP_ID Fix)
        </Button>
    );
}