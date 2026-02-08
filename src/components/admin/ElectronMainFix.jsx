import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ElectronMainFix() {
    const downloadElectronMain = () => {
        const electronMain = `import { app, BrowserWindow } from 'electron';
import http from 'http';
import https from 'https';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let proxyServer;
let appServer;

const BASE44_BACKEND = 'https://rod-coin-wallet.base44.app';
const BASE44_APP_ID = '695c1217b1d1db20f67a77f2';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

function startAppServer() {
  const distPath = path.resolve(__dirname, 'dist');

  appServer = http.createServer((req, res) => {
    // CRITICAL: Strip from_url IMMEDIATELY before anything else
    req.url = req.url.replace(/[?&]from_url=[^&]*/g, '');

    if (req.url.startsWith('/api')) {
      let apiUrl = req.url;
      apiUrl = apiUrl.replace(/null/g, BASE44_APP_ID);

      const targetUrl = new URL(apiUrl, BASE44_BACKEND);

      let bodyBuffer = Buffer.alloc(0);

      req.on('data', (chunk) => {
        bodyBuffer = Buffer.concat([bodyBuffer, chunk]);
      });

      req.on('end', () => {
        const headers = {};
        if (bodyBuffer.length > 0) {
          headers['content-length'] = bodyBuffer.length.toString();
          if (req.headers['content-type']) {
            headers['content-type'] = req.headers['content-type'];
          }
        }
        if (req.headers['authorization']) {
          headers['authorization'] = req.headers['authorization'];
        }

        const requestOptions = {
          method: req.method,
          headers: headers,
          agent: httpsAgent
        };

        const proxyReq = https.request(targetUrl, requestOptions, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          console.error('[API Proxy] Error:', err.message);
          res.writeHead(500);
          res.end('API Proxy Error');
        });

        if (bodyBuffer.length > 0) {
          proxyReq.write(bodyBuffer);
        }
        proxyReq.end();
      });

      return;
    }

    let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);

    if (!filePath.startsWith(distPath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT' && !req.url.match(/\\.[a-z0-9]+$/i)) {
          const indexPath = path.join(distPath, 'index.html');
          fs.readFile(indexPath, (indexErr, indexData) => {
            if (indexErr) {
              res.writeHead(404);
              res.end('Not Found');
              return;
            }

            let content = indexData.toString().replace(
              '</head>',
              \`<script>window.__BASE44_APP_ID__ = '\${BASE44_APP_ID}';</script></head>\`
            );

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
          });
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
        return;
      }

      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
      };

      let content = data;
      if (filePath.endsWith('index.html')) {
        content = data.toString().replace(
          '</head>',
          \`<script>window.__BASE44_APP_ID__ = '\${BASE44_APP_ID}';</script></head>\`
        );
      }

      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    });
  });

  appServer.listen(3000, () => {
    console.log('[App Server] Running on http://localhost:3000');
  });
}

function startProxyServer() {
  proxyServer = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const auth = Buffer.from('rpcuser:rpcpass').toString('base64');
        const options = {
          hostname: '127.0.0.1',
          port: 9766,
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
          console.error('[RPC Proxy] Error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });

        rpcReq.write(body);
        rpcReq.end();
      } catch (err) {
        console.error('[RPC Proxy] Parse error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  proxyServer.listen(9767, () => {
    console.log('[RPC Proxy] Running on http://localhost:9767');
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

  console.log('[Electron] Loading http://localhost:3000');
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.webContents.on('did-start-loading', () => {
    mainWindow.webContents.executeJavaScript(\`
      (function() {
        const errDiv = document.createElement('div');
        errDiv.id = 'error-catcher';
        errDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;color:#ff4444;padding:20px;font-family:monospace;font-size:12px;z-index:99999;overflow:auto;display:none;white-space:pre-wrap;word-break:break-all;';
        document.documentElement.appendChild(errDiv);

        window.addEventListener('error', (e) => {
          errDiv.style.display = 'block';
          errDiv.innerHTML += '<div style="margin:10px 0;border-bottom:1px solid #666;padding:10px 0;"><strong>' + new Date().toLocaleTimeString() + '</strong> ERROR: ' + e.message + '\\\\n' + (e.stack || '') + '</div>';
        }, true);

        window.addEventListener('unhandledrejection', (e) => {
          errDiv.style.display = 'block';
          errDiv.innerHTML += '<div style="margin:10px 0;border-bottom:1px solid #666;padding:10px 0;"><strong>' + new Date().toLocaleTimeString() + '</strong> REJECTION: ' + e.reason + '</div>';
        }, true);

        console.log('[ERROR CATCHER] Initialized');
      })();
    \`);
  });

  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[Electron] Page loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] Load failed:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('[Electron] App ready');
  startAppServer();
  startProxyServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (proxyServer) proxyServer.close();
  if (appServer) appServer.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
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
        toast.success('electron-main.js downloaded - 431 error fix applied!');
    };

    return (
        <Button
            onClick={downloadElectronMain}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:text-red-300">
            <Download className="w-4 h-4 mr-2" />
            Download electron-main.js (431 Fix)
        </Button>
    );
}