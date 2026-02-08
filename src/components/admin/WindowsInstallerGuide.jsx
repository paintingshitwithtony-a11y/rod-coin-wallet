import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, CheckCircle2, Download, Package, Terminal } from 'lucide-react';
import { toast } from 'sonner';

export default function WindowsInstallerGuide() {
    const [copied, setCopied] = useState(null);

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(null), 2000);
    };

    const electronMainJs = `// electron-main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let proxyServer;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'build', 'icon.png')
    });

    // In production, load built React app
    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        // In development, load from Vite dev server
        mainWindow.loadURL('http://localhost:5173');
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startProxyServer() {
    // Start the local RPC proxy
    const proxyPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'local-rpc-proxy.js')
        : path.join(__dirname, 'local-rpc-proxy.js');
    
    proxyServer = spawn('node', [proxyPath], {
        stdio: 'inherit'
    });

    proxyServer.on('error', (err) => {
        console.error('Proxy server error:', err);
    });
}

app.on('ready', () => {
    startProxyServer();
    setTimeout(createWindow, 1000); // Wait for proxy to start
});

app.on('window-all-closed', () => {
    if (proxyServer) {
        proxyServer.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('quit', () => {
    if (proxyServer) {
        proxyServer.kill();
    }
});`;

    const packageJsonAdditions = `{
  "name": "rod-wallet",
  "version": "1.0.0",
  "description": "ROD Cryptocurrency Wallet",
  "main": "electron-main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "electron .",
    "electron:build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.rod.wallet",
    "productName": "ROD Wallet",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron-main.js",
      "local-rpc-proxy.js",
      "package.json"
    ],
    "extraResources": [
      {
        "from": "local-rpc-proxy.js",
        "to": "local-rpc-proxy.js"
      }
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "ROD Wallet"
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  }
}`;

    const buildSteps = [
        {
            title: "Install Electron Dependencies",
            command: "npm install --save-dev electron electron-builder",
            description: "Install Electron and the builder tool"
        },
        {
            title: "Create Electron Main Process",
            command: "# Create electron-main.js file (see code below)",
            description: "This launches the app window and proxy server"
        },
        {
            title: "Add Build Scripts to package.json",
            command: "# Add the scripts and build config (see below)",
            description: "Configure Electron Builder for Windows"
        },
        {
            title: "Create App Icon",
            command: "# Add icon.ico file to /build folder (256x256 or larger)",
            description: "Windows installer needs an .ico icon file"
        },
        {
            title: "Build the Installer",
            command: "npm run electron:build",
            description: "Creates Windows installer in /release folder"
        }
    ];

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                    <Package className="w-4 h-4 mr-2" />
                    Windows Installer
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white text-2xl flex items-center gap-3">
                        <Download className="w-6 h-6 text-blue-400" />
                        Create Windows Installer
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Overview */}
                    <Alert className="bg-blue-900/20 border-blue-500/50">
                        <Package className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-sm text-blue-300">
                            Build a standalone Windows desktop app with installer (.exe) that includes the wallet 
                            and local RPC proxy - no browser needed!
                        </AlertDescription>
                    </Alert>

                    {/* Quick Download Complete package.json */}
                    <Card className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-green-500/50">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Download className="w-5 h-5 text-green-400" />
                                Quick Start: Download Complete package.json
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-slate-300">
                                Download this complete package.json file and replace your existing one:
                            </p>
                            <Button
                                onClick={() => {
                                    const completePackageJson = {
                                        "name": "rod-wallet",
                                        "version": "1.0.0",
                                        "description": "ROD Cryptocurrency Wallet",
                                        "type": "module",
                                        "main": "electron-main.js",
                                        "scripts": {
                                            "dev": "vite",
                                            "build": "vite build",
                                            "preview": "vite preview",
                                            "electron:dev": "electron .",
                                            "electron:build": "npm run build && electron-builder"
                                        },
                                        "dependencies": {
                                            "@base44/sdk": "^0.8.3",
                                            "@base44/vite-plugin": "^0.2.14",
                                            "@hello-pangea/dnd": "^17.0.0",
                                            "@hookform/resolvers": "^4.1.2",
                                            "@radix-ui/react-accordion": "^1.2.3",
                                            "@radix-ui/react-alert-dialog": "^1.1.6",
                                            "@radix-ui/react-aspect-ratio": "^1.1.2",
                                            "@radix-ui/react-avatar": "^1.1.3",
                                            "@radix-ui/react-checkbox": "^1.1.4",
                                            "@radix-ui/react-collapsible": "^1.1.3",
                                            "@radix-ui/react-context-menu": "^2.2.6",
                                            "@radix-ui/react-dialog": "^1.1.6",
                                            "@radix-ui/react-dropdown-menu": "^2.1.6",
                                            "@radix-ui/react-hover-card": "^1.1.6",
                                            "@radix-ui/react-label": "^2.1.2",
                                            "@radix-ui/react-menubar": "^1.1.6",
                                            "@radix-ui/react-navigation-menu": "^1.2.5",
                                            "@radix-ui/react-popover": "^1.1.6",
                                            "@radix-ui/react-progress": "^1.1.2",
                                            "@radix-ui/react-radio-group": "^1.2.3",
                                            "@radix-ui/react-scroll-area": "^1.2.3",
                                            "@radix-ui/react-select": "^2.1.6",
                                            "@radix-ui/react-separator": "^1.1.2",
                                            "@radix-ui/react-slider": "^1.2.3",
                                            "@radix-ui/react-slot": "^1.1.2",
                                            "@radix-ui/react-switch": "^1.1.3",
                                            "@radix-ui/react-tabs": "^1.1.3",
                                            "@radix-ui/react-toast": "^1.2.2",
                                            "@radix-ui/react-toggle": "^1.1.2",
                                            "@radix-ui/react-toggle-group": "^1.1.2",
                                            "@radix-ui/react-tooltip": "^1.1.8",
                                            "@stripe/react-stripe-js": "^3.0.0",
                                            "@stripe/stripe-js": "^5.2.0",
                                            "@tanstack/react-query": "^5.84.1",
                                            "canvas-confetti": "^1.9.4",
                                            "class-variance-authority": "^0.7.1",
                                            "clsx": "^2.1.1",
                                            "cmdk": "^1.0.0",
                                            "date-fns": "^3.6.0",
                                            "embla-carousel-react": "^8.5.2",
                                            "framer-motion": "^11.16.4",
                                            "html2canvas": "^1.4.1",
                                            "input-otp": "^1.4.2",
                                            "jspdf": "^2.5.2",
                                            "lodash": "^4.17.21",
                                            "lucide-react": "^0.475.0",
                                            "moment": "^2.30.1",
                                            "next-themes": "^0.4.4",
                                            "react": "^18.2.0",
                                            "react-day-picker": "^8.10.1",
                                            "react-dom": "^18.2.0",
                                            "react-hook-form": "^7.54.2",
                                            "react-hot-toast": "^2.6.0",
                                            "react-leaflet": "^4.2.1",
                                            "react-markdown": "^9.0.1",
                                            "react-quill": "^2.0.0",
                                            "react-resizable-panels": "^2.1.7",
                                            "react-router-dom": "^6.26.0",
                                            "recharts": "^2.15.4",
                                            "sonner": "^2.0.1",
                                            "tailwind-merge": "^3.0.2",
                                            "tailwindcss-animate": "^1.0.7",
                                            "three": "^0.171.0",
                                            "vaul": "^1.1.2",
                                            "zod": "^3.24.2"
                                        },
                                        "devDependencies": {
                                            "@types/react": "^18.2.43",
                                            "@types/react-dom": "^18.2.17",
                                            "@vitejs/plugin-react": "^4.2.1",
                                            "autoprefixer": "^10.4.16",
                                            "electron": "^28.0.0",
                                            "electron-builder": "^24.9.1",
                                            "postcss": "^8.4.32",
                                            "tailwindcss": "^3.4.0",
                                            "vite": "^6.1.0"
                                        },
                                        "build": {
                                            "appId": "com.rod.wallet",
                                            "productName": "ROD Wallet",
                                            "directories": {
                                                "output": "release"
                                            },
                                            "files": [
                                                "dist/**/*",
                                                "electron-main.js",
                                                "local-rpc-proxy.js",
                                                "package.json"
                                            ],
                                            "extraResources": [
                                                {
                                                    "from": "local-rpc-proxy.js",
                                                    "to": "local-rpc-proxy.js"
                                                }
                                            ],
                                            "win": {
                                                "target": [
                                                    {
                                                        "target": "nsis",
                                                        "arch": ["x64"]
                                                    }
                                                ],
                                                "icon": "build/icon.ico"
                                            },
                                            "nsis": {
                                                "oneClick": false,
                                                "allowToChangeInstallationDirectory": true,
                                                "createDesktopShortcut": true,
                                                "createStartMenuShortcut": true,
                                                "shortcutName": "ROD Wallet"
                                            }
                                        }
                                    };
                                    const blob = new Blob([JSON.stringify(completePackageJson, null, 2)], { type: 'application/json' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'package.json';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    a.remove();
                                    toast.success('Complete package.json downloaded! Replace your existing file.');
                                }}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg py-6">
                                <Download className="w-5 h-5 mr-2" />
                                Download Complete package.json
                            </Button>
                            <Alert className="bg-green-900/20 border-green-500/50">
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                                <AlertDescription className="text-xs text-green-300">
                                    This is a complete, ready-to-use package.json. Just download it and replace your broken one!
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Prerequisites */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Prerequisites</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                <div>
                                    <p className="text-white font-semibold">Exported Project</p>
                                    <p className="text-sm text-slate-400">You need the exported app (Builder plan required)</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                <div>
                                    <p className="text-white font-semibold">Node.js Installed</p>
                                    <p className="text-sm text-slate-400">Version 18+ recommended</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                <div>
                                    <p className="text-white font-semibold">Windows Build Environment</p>
                                    <p className="text-sm text-slate-400">Build on Windows or use wine on Mac/Linux</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Build Steps */}
                    {buildSteps.map((step, index) => (
                        <Card key={index} className="bg-slate-900/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <Badge className="bg-blue-500/20 text-blue-400">Step {index + 1}</Badge>
                                    {step.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-slate-400">{step.description}</p>
                                {step.command.startsWith('#') ? (
                                    <p className="text-sm text-amber-400 font-mono">{step.command}</p>
                                ) : (
                                    <div className="relative">
                                        <pre className="bg-slate-800 p-3 rounded-md font-mono text-sm text-green-400">
                                            {step.command}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="absolute top-2 right-2"
                                            onClick={() => copyToClipboard(step.command, `step-${index}`)}
                                        >
                                            {copied === `step-${index}` ? 
                                                <CheckCircle2 className="w-4 h-4 text-green-400" /> : 
                                                <Copy className="w-4 h-4" />
                                            }
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {/* Electron Main File */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Terminal className="w-5 h-5" />
                                electron-main.js
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-slate-400">
                                Create this file in your project root:
                            </p>
                            
                            <Button
                                onClick={() => {
                                    const blob = new Blob([electronMainJs], { type: 'text/javascript' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'electron-main.js';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    a.remove();
                                    toast.success('electron-main.js downloaded!');
                                }}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                <Download className="w-4 h-4 mr-2" />
                                Download electron-main.js
                            </Button>

                            <details className="bg-slate-800 rounded-md p-3">
                                <summary className="text-sm text-slate-300 cursor-pointer hover:text-white">
                                    View code (optional)
                                </summary>
                                <div className="relative mt-3">
                                    <pre className="font-mono text-xs text-slate-300 max-h-96 overflow-y-auto">
                                        {electronMainJs}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(electronMainJs, 'electron-main')}
                                    >
                                        {copied === 'electron-main' ? 
                                            <CheckCircle2 className="w-4 h-4 text-green-400" /> : 
                                            <Copy className="w-4 h-4" />
                                        }
                                    </Button>
                                </div>
                            </details>
                        </CardContent>
                    </Card>

                    {/* Package.json Configuration */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Terminal className="w-5 h-5" />
                                package.json Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-slate-400">
                                Download this configuration and merge it into your existing package.json:
                            </p>
                            
                            <Button
                                onClick={() => {
                                    const blob = new Blob([packageJsonAdditions], { type: 'application/json' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'package-electron-config.json';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    a.remove();
                                    toast.success('Configuration downloaded! Merge into your package.json');
                                }}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                                <Download className="w-4 h-4 mr-2" />
                                Download package.json Config
                            </Button>

                            <Alert className="bg-amber-900/20 border-amber-500/50">
                                <AlertDescription className="text-xs text-amber-300">
                                    ⚠️ Don't replace your entire package.json! Copy the "main", "scripts", "build", and "devDependencies" sections into your existing file.
                                </AlertDescription>
                            </Alert>

                            <details className="bg-slate-800 rounded-md p-3">
                                <summary className="text-sm text-slate-300 cursor-pointer hover:text-white">
                                    View configuration (optional)
                                </summary>
                                <div className="relative mt-3">
                                    <pre className="font-mono text-xs text-slate-300 max-h-96 overflow-y-auto">
                                        {packageJsonAdditions}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(packageJsonAdditions, 'package-json')}
                                    >
                                        {copied === 'package-json' ? 
                                            <CheckCircle2 className="w-4 h-4 text-green-400" /> : 
                                            <Copy className="w-4 h-4" />
                                        }
                                    </Button>
                                </div>
                            </details>
                        </CardContent>
                    </Card>

                    {/* Final Build */}
                    <Card className="bg-slate-900/50 border-green-700/50">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                Build Your Installer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-400 mb-2">
                                    <strong className="text-white">Test in development:</strong>
                                </p>
                                <div className="relative mb-4">
                                    <pre className="bg-slate-800 p-3 rounded-md font-mono text-sm text-green-400">
                                        npm run electron:dev
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard('npm run electron:dev', 'electron-dev')}
                                    >
                                        {copied === 'electron-dev' ? 
                                            <CheckCircle2 className="w-4 h-4 text-green-400" /> : 
                                            <Copy className="w-4 h-4" />
                                        }
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-slate-400 mb-2">
                                    <strong className="text-white">Build production installer:</strong>
                                </p>
                                <div className="relative">
                                    <pre className="bg-slate-800 p-3 rounded-md font-mono text-sm text-green-400">
                                        npm run electron:build
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard('npm run electron:build', 'electron-build')}
                                    >
                                        {copied === 'electron-build' ? 
                                            <CheckCircle2 className="w-4 h-4 text-green-400" /> : 
                                            <Copy className="w-4 h-4" />
                                        }
                                    </Button>
                                </div>
                            </div>

                            <Alert className="bg-green-900/20 border-green-500/50">
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                                <AlertDescription className="text-sm text-green-300">
                                    Your Windows installer will be created in <code className="text-green-200">/release</code> folder!
                                    Look for <code className="text-green-200">ROD Wallet Setup 1.0.0.exe</code>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Troubleshooting */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Troubleshooting</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-white font-semibold">Build fails with "Cannot find module":</p>
                                    <p className="text-slate-400">• Run <code className="text-purple-400">npm install</code> again</p>
                                    <p className="text-slate-400">• Ensure all paths in electron-main.js are correct</p>
                                </div>
                                <div>
                                    <p className="text-white font-semibold">Installer doesn't include app icon:</p>
                                    <p className="text-slate-400">• Create a <code className="text-purple-400">/build</code> folder</p>
                                    <p className="text-slate-400">• Add <code className="text-purple-400">icon.ico</code> file (256x256 minimum)</p>
                                </div>
                                <div>
                                    <p className="text-white font-semibold">App launches but shows blank screen:</p>
                                    <p className="text-slate-400">• Run <code className="text-purple-400">npm run build</code> before <code className="text-purple-400">electron:build</code></p>
                                    <p className="text-slate-400">• Check that dist folder exists with built files</p>
                                </div>
                                <div>
                                    <p className="text-white font-semibold">RPC proxy won't connect:</p>
                                    <p className="text-slate-400">• Verify local-rpc-proxy.js has correct credentials</p>
                                    <p className="text-slate-400">• Ensure ROD Core is running with RPC enabled</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Distribution Note */}
                    <Alert className="bg-purple-900/20 border-purple-500/50">
                        <AlertDescription className="text-sm text-purple-300">
                            <strong>Distribution:</strong> The generated installer can be distributed to other Windows users.
                            They'll need to have their own ROD Core node running, or you can modify the installer to include it.
                        </AlertDescription>
                    </Alert>
                </div>
            </DialogContent>
        </Dialog>
    );
}