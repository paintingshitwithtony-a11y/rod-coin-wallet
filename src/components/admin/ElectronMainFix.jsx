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
      // CRITICAL: Strip from_url parameter immediately - this causes 431 header overflow
      const urlWithoutFromUrl = req.url.replace(/[?&]from_url=[^&]*/g, '');

      // For non-API routes, strip ALL query parameters to prevent redirect loops
      let cleanPath = urlWithoutFromUrl;
      if (!urlWithoutFromUrl.startsWith('/api')) {
        try {
          const url = new URL(urlWithoutFromUrl, 'http://localhost:3000');
          cleanPath = url.pathname;
        } catch {
          cleanPath = urlWithoutFromUrl.split('?')[0];
        }
      }

      req.url = cleanPath;
      console.log('[AppServer]', req.method, req.url, '- App ID: ' + BASE44_APP_ID);

    // Prevent redirect loops by never redirecting
    // Just serve the file or proxy the API

    if (req.url.startsWith('/api')) {
      // API requests to Base44 backend
      let apiPath = req.url;
      // CRITICAL: Strip from_url parameter - prevents 431 header overflow
      apiPath = apiPath.replace(/[?&]from_url=[^&]*/g, '');
      // Replace null placeholder with actual app ID
      apiPath = apiPath.replace(/null/g, BASE44_APP_ID);
      const targetUrl = new URL(apiPath, BASE44_BACKEND);

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
          // Strip location header to prevent redirect loops
          const headers = { ...proxyRes.headers };
          if (headers.location) {
            headers.location = headers.location.replace(/[?&]from_url=[^&]*/g, '');
          }
          res.writeHead(proxyRes.statusCode || 200, headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          console.error('[API Proxy Error]:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API Proxy Error', message: err.message }));
        });

        if (bodyBuffer.length > 0) {
          proxyReq.write(bodyBuffer);
        }
        proxyReq.end();
      });

      return;
    }

    // Serve static files or index.html
    let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);

    // Security: prevent directory traversal
    if (!filePath.startsWith(distPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    fs.stat(filePath, (statErr, stats) => {
      if (statErr) {
        // File not found - serve index.html for SPA routing
        const indexPath = path.join(distPath, 'index.html');
        fs.readFile(indexPath, (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
          }

          // Inject app ID and URL cleanup script at the very start
          let content = indexData.toString();
          const injectionScript = \`<script>
            // Clean URL on page load - remove all query params to prevent redirect loops
            if (window.location.search) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            window.__BASE44_APP_ID__ = '\${BASE44_APP_ID}';
            window.__VITE_APP_ID__ = '\${BASE44_APP_ID}';
          </script>\`;
          if (!content.includes('window.__BASE44_APP_ID__')) {
            content = content.replace('<head>', '<head>' + injectionScript);
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
        return;
      }

      // File exists - serve it
      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.mjs': 'application/javascript; charset=utf-8',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        // Inject app ID and URL cleanup script into HTML files
        let response = data;
        if (filePath.endsWith('index.html')) {
        response = data.toString();
        const injectionScript = \`<script>
          if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          window.__BASE44_APP_ID__ = '\${BASE44_APP_ID}';
          window.__VITE_APP_ID__ = '\${BASE44_APP_ID}';
        </script>\`;
        if (!response.includes('window.__BASE44_APP_ID__')) {
          response = response.replace('<head>', '<head>' + injectionScript);
        }
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(response);
      });
    });
  });

  appServer.listen(3000, '127.0.0.1', () => {
    console.log('[App Server] Listening on http://127.0.0.1:3000');
  });

  appServer.on('error', (err) => {
    console.error('[App Server Error]:', err.message);
  });
}

function startProxyServer() {
  proxyServer = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Only accept POST for RPC
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      // Prevent large payloads
      if (body.length > 1024 * 1024) {
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      try {
        // Simple auth for local RPC
        const auth = Buffer.from('rpcuser:rpcpass').toString('base64');
        
        const options = {
          hostname: '127.0.0.1',
          port: 9766,
          path: '/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'Authorization': \`Basic \${auth}\`
          },
          timeout: 30000
        };

        const rpcReq = http.request(options, (rpcRes) => {
          let rpcBody = '';
          rpcRes.on('data', (chunk) => {
            rpcBody += chunk.toString();
          });
          rpcRes.on('end', () => {
            res.writeHead(rpcRes.statusCode || 200, { 'Content-Type': 'application/json' });
            res.end(rpcBody || '{}');
          });
        });

        rpcReq.on('error', (err) => {
          console.error('[RPC Proxy Error]:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'RPC Connection Failed', message: err.message }));
        });

        rpcReq.on('timeout', () => {
          rpcReq.destroy();
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'RPC Timeout' }));
        });

        rpcReq.write(body);
        rpcReq.end();
      } catch (err) {
        console.error('[RPC Parse Error]:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid Request', message: err.message }));
      }
    });
  });

  proxyServer.listen(9767, '127.0.0.1', () => {
    console.log('[RPC Proxy] Listening on http://127.0.0.1:9767');
  });

  proxyServer.on('error', (err) => {
    console.error('[RPC Proxy Error]:', err.message);
  });
}

function createWindow() {
  console.log('[Electron] Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false  // CRITICAL: Disable sandbox to allow DevTools
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  console.log('[Electron] Loading URL: http://localhost:5173/');
  mainWindow.loadURL('http://localhost:5173/').catch(err => {
    console.error('[Electron] loadURL failed:', err);
  });

  // Show window first
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Force DevTools open after window is ready
    setTimeout(() => {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
      console.log('[Electron] DevTools opened');
    }, 1000);
  });

  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[Electron] Started loading...');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] ✓ App loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] ✗ Load failed:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer Console]:', message);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle app ready
app.whenReady().then(() => {
  console.log('[Electron] App ready - starting servers');
  
  // Only start app server in production (when packaged)
  if (app.isPackaged) {
    startAppServer();
  }
  
  startProxyServer();
  
  // Wait a bit for servers to start
  setTimeout(() => {
    createWindow();
  }, 500);
});

// Handle window all closed
app.on('window-all-closed', () => {
  console.log('[Electron] Closing servers');
  if (proxyServer) proxyServer.close();
  if (appServer) appServer.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app activate (macOS)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Log any uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Electron] Uncaught Exception:', err);
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