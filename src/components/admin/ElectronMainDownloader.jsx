import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ElectronMainDownloader({ account }) {
    const downloadElectronMain = () => {
        const electronMain = `const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
let proxyServer;

// Local RPC Proxy Server
function startProxyServer() {
    proxyServer = http.createServer(async (req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end('Method Not Allowed');
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const rpcRequest = JSON.parse(body);

                // Forward to local ROD Core node
                const rpcHost = 'localhost';
                const rpcPort = 9766;
                const rpcUser = '${account?.rpc_username || 'your_rpc_username'}';
                const rpcPass = '${account?.rpc_password || 'your_rpc_password'}';

                const auth = Buffer.from(\`\${rpcUser}:\${rpcPass}\`).toString('base64');

                const options = {
                    hostname: rpcHost,
                    port: rpcPort,
                    path: '/',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Basic \${auth}\`
                    }
                };

                const rpcReq = http.request(options, (rpcRes) => {
                    let rpcBody = '';
                    rpcRes.on('data', chunk => { rpcBody += chunk; });
                    rpcRes.on('end', () => {
                        res.writeHead(rpcRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(rpcBody);
                    });
                });

                rpcReq.on('error', (err) => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                });

                rpcReq.write(body);
                rpcReq.end();

            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    });

    proxyServer.listen(9767, () => {
        console.log('RPC Proxy running on http://localhost:9767');
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        }
    });

    // Load your Base44 app with the correct URL
    mainWindow.loadURL('https://rod-coin-wallet.base44.app');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    startProxyServer();
    createWindow();
});

app.on('window-all-closed', () => {
    if (proxyServer) {
        proxyServer.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});`;

        const blob = new Blob([electronMain], { type: 'text/javascript' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'electron-main.js';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('electron-main.js downloaded with correct URL');
    };

    return (
        <Button
            onClick={downloadElectronMain}
            variant="outline"
            className="border-purple-500/50 text-purple-400">
            <Download className="w-4 h-4 mr-2" />
            Download electron-main.js (Updated URL)
        </Button>
    );
}