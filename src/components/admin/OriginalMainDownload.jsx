import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function OriginalMainDownload() {
    const downloadOriginalMain = () => {
        const originalMain = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './globals.css';
import App from './App';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>
);`;

        const blob = new Blob([originalMain], { type: 'text/javascript' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'main.jsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('Original main.jsx downloaded - replace your current file');
    };

    return (
        <Button
            onClick={downloadOriginalMain}
            variant="outline"
            className="border-green-500/50 text-green-400 hover:text-green-300">
            <Download className="w-4 h-4 mr-2" />
            Download Original main.jsx
        </Button>
    );
}