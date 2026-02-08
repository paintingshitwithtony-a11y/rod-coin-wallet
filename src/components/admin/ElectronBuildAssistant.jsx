import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Copy, CheckCircle, AlertCircle, Package, Terminal, Settings, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ElectronBuildAssistant() {
    const [open, setOpen] = useState(false);

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const downloadPackageJson = () => {
        const packageConfig = {
            "name": "rod-wallet",
            "version": "1.0.0",
            "description": "ROD Cryptocurrency Wallet",
            "main": "electron-main.js",
            "author": "Your Name",
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
                "win": {
                    "target": "nsis",
                    "icon": "build/icon.ico",
                    "sign": null
                },
                "mac": {
                    "target": "dmg",
                    "icon": "build/icon.icns"
                },
                "linux": {
                    "target": "AppImage",
                    "icon": "build/icon.png"
                },
                "files": [
                    "dist/**/*",
                    "electron-main.js",
                    "package.json"
                ]
            },
            "devDependencies": {
                "electron": "^40.0.0",
                "electron-builder": "^26.0.0"
            }
        };

        const blob = new Blob([JSON.stringify(packageConfig, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'package.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('package.json downloaded');
    };

    const downloadElectronMain = () => {
        const electronMainCode = `const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'build/icon.png')
    });

    // Load the built app
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});`;

        const blob = new Blob([electronMainCode], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'electron-main.js';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('electron-main.js downloaded');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Package className="h-4 w-4" />
                    Electron Build Assistant
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Electron Build Assistant
                    </DialogTitle>
                    <DialogDescription>
                        Step-by-step guide to create Windows/Mac/Linux installers for your ROD Wallet
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="quickstart" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
                        <TabsTrigger value="build">Build Steps</TabsTrigger>
                        <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="quickstart" className="space-y-4">
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Download Required Files</AlertTitle>
                            <AlertDescription>
                                Get pre-configured files to skip manual setup
                            </AlertDescription>
                        </Alert>

                        <div className="grid gap-3">
                            <Button onClick={downloadPackageJson} className="gap-2">
                                <Download className="h-4 w-4" />
                                Download package.json (with build config)
                            </Button>
                            <Button onClick={downloadElectronMain} variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Download electron-main.js
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Quick Build Commands</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium mb-1">1. Install dependencies:</p>
                                    <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm flex justify-between items-center">
                                        <span>npm install electron electron-builder --save-dev</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => copyToClipboard('npm install electron electron-builder --save-dev', 'Command')}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium mb-1">2. Build the installer:</p>
                                    <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm flex justify-between items-center">
                                        <span>npm run electron:build</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => copyToClipboard('npm run electron:build', 'Command')}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Your installer will be in the <code className="bg-slate-100 px-1 rounded">release</code> folder
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="build" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Terminal className="h-4 w-4" />
                                    Complete Build Process
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Step 1: Export Your Project</h4>
                                    <p className="text-sm text-slate-600">From Base44 dashboard, export your project files</p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Step 2: Install Electron</h4>
                                    <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm">
                                        npm install electron electron-builder --save-dev
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Step 3: Add electron-main.js</h4>
                                    <p className="text-sm text-slate-600">Download using the Quick Start tab or create it manually</p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Step 4: Update package.json</h4>
                                    <p className="text-sm text-slate-600">Add build configuration (use downloaded file from Quick Start)</p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Step 5: Build</h4>
                                    <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm">
                                        npm run build && npm run electron:build
                                    </div>
                                </div>

                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertTitle>Build Output</AlertTitle>
                                    <AlertDescription>
                                        Find your installer in the <strong>release</strong> folder:
                                        <ul className="list-disc ml-5 mt-2 space-y-1">
                                            <li>Windows: <code>ROD Wallet Setup.exe</code></li>
                                            <li>Mac: <code>ROD Wallet.dmg</code></li>
                                            <li>Linux: <code>ROD Wallet.AppImage</code></li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="troubleshooting" className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Common Build Errors & Solutions</AlertTitle>
                        </Alert>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Error: "Cannot create symbolic link"</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm text-slate-600">Windows permissions issue during code signing</p>
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                    <p className="text-sm font-semibold mb-2">Solution: Disable code signing</p>
                                    <p className="text-sm mb-2">Add to package.json under "build":</p>
                                    <pre className="bg-slate-900 text-slate-100 p-2 rounded text-xs overflow-x-auto">
{`"win": {
  "target": "nsis",
  "sign": null
}`}
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Error: "Application entry file not found"</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm text-slate-600">electron-main.js is missing or in wrong location</p>
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                    <p className="text-sm font-semibold mb-2">Solution:</p>
                                    <ul className="list-disc ml-5 space-y-1 text-sm">
                                        <li>Download electron-main.js from Quick Start tab</li>
                                        <li>Place it in your project root directory</li>
                                        <li>Ensure package.json has: <code>"main": "electron-main.js"</code></li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Error: "Cannot find module 'electron'"</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm text-slate-600">Electron not installed</p>
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                    <p className="text-sm font-semibold mb-2">Solution:</p>
                                    <div className="bg-slate-900 text-slate-100 p-2 rounded text-sm font-mono">
                                        npm install electron --save-dev
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Blank Window After Build</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm text-slate-600">App not loading correctly in Electron</p>
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                    <p className="text-sm font-semibold mb-2">Solutions:</p>
                                    <ul className="list-disc ml-5 space-y-1 text-sm">
                                        <li>Ensure you ran <code>npm run build</code> before <code>electron:build</code></li>
                                        <li>Check that dist folder exists with index.html</li>
                                        <li>Verify electron-main.js loads from correct path</li>
                                        <li>Open DevTools in Electron (Ctrl+Shift+I) to see console errors</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Advanced Configuration
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Custom App Icon</h4>
                                    <p className="text-sm text-slate-600">Add custom icons for each platform:</p>
                                    <ul className="list-disc ml-5 space-y-1 text-sm text-slate-600">
                                        <li>Windows: Create <code>build/icon.ico</code> (256x256px)</li>
                                        <li>Mac: Create <code>build/icon.icns</code></li>
                                        <li>Linux: Create <code>build/icon.png</code> (512x512px)</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Code Signing (Optional)</h4>
                                    <p className="text-sm text-slate-600">For production apps, you may want to sign your installer:</p>
                                    <ul className="list-disc ml-5 space-y-1 text-sm text-slate-600">
                                        <li>Windows: Requires code signing certificate</li>
                                        <li>Mac: Requires Apple Developer ID</li>
                                        <li>Prevents security warnings on user machines</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Auto-Update Configuration</h4>
                                    <p className="text-sm text-slate-600">Add auto-update functionality:</p>
                                    <pre className="bg-slate-900 text-slate-100 p-2 rounded text-xs overflow-x-auto">
{`"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "rod-wallet"
}`}
                                    </pre>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Multi-Platform Builds</h4>
                                    <p className="text-sm text-slate-600">Build for all platforms (requires respective OS):</p>
                                    <div className="bg-slate-900 text-slate-100 p-2 rounded text-sm font-mono space-y-1">
                                        <div>electron-builder --win --x64</div>
                                        <div>electron-builder --mac</div>
                                        <div>electron-builder --linux</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>Need More Help?</AlertTitle>
                            <AlertDescription>
                                Visit the{' '}
                                <a
                                    href="https://www.electron.build/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                >
                                    Electron Builder Documentation
                                </a>
                                {' '}for comprehensive guides
                            </AlertDescription>
                        </Alert>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}