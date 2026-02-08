import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Shield, Settings, Plug, CheckCircle2, XCircle, Loader2,
    Save, Trash2, Plus, ArrowLeft, AlertCircle, Server, Copy, Pencil
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PortForwardingGuide from '../components/admin/PortForwardingGuide';
import RPCSetupWizard from '../components/wallet/RPCSetupWizard';
import LocalProxySetupGuide from '../components/admin/LocalProxySetupGuide';
import LocalDevSetup from '../components/admin/LocalDevSetup';
import WindowsInstallerGuide from '../components/admin/WindowsInstallerGuide';
import ElectronBuildAssistant from '../components/admin/ElectronBuildAssistant';
import NetworkScanner from '../components/admin/NetworkScanner';
import QuickConnect from '../components/admin/QuickConnect';

export default function Admin() {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState([]);
    const [testing, setTesting] = useState(null);
    const [showNewConfig, setShowNewConfig] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    
    // New config form
    const [newConfig, setNewConfig] = useState({
        name: '',
        connection_type: 'rpc',
        host: '',
        port: '',
        username: '',
        password: '',
        use_ssl: false
    });

    useEffect(() => {
        loadAccount();
        loadConfigs();
    }, []);

    const loadAccount = async () => {
        try {
            const savedSession = localStorage.getItem('rod_wallet_session');
            if (!savedSession) {
                toast.error('Please log in');
                return;
            }

            const session = JSON.parse(savedSession);
            const accounts = await base44.entities.WalletAccount.filter({ id: session.id });
            
            if (accounts.length > 0) {
                setAccount(accounts[0]);
            }
        } catch (err) {
            toast.error('Failed to load account');
        } finally {
            setLoading(false);
        }
    };

    const loadConfigs = async () => {
        try {
            const savedSession = localStorage.getItem('rod_wallet_session');
            if (!savedSession) return;

            const session = JSON.parse(savedSession);
            const configList = await base44.entities.RPCConfiguration.filter(
                { account_id: session.id },
                '-created_date'
            );
            setConfigs(configList);
        } catch (err) {
            console.error('Failed to load configs:', err);
        }
    };

    const handleTestConnection = async (config) => {
        setTesting(config.id);
        try {
            console.log('Testing RPC connection for:', config);
            const response = await base44.functions.invoke('checkRPCStatus', {});
            
            console.log('RPC Status response:', response.data);
            
            if (response.data.connected) {
                toast.success('Connection successful!');
                await base44.entities.RPCConfiguration.update(config.id, {
                    connection_status: 'connected',
                    last_connected: new Date().toISOString(),
                    node_info: response.data.nodeInfo || null
                });
                loadConfigs();
            } else {
                const errorMsg = response.data.error || response.data.message || 'Unknown error';
                console.error('Connection failed:', errorMsg);
                console.error('Full response:', response.data);
                toast.error('Connection failed: ' + errorMsg);
                await base44.entities.RPCConfiguration.update(config.id, {
                    connection_status: 'error'
                });
                loadConfigs();
            }
        } catch (err) {
            console.error('Test connection error:', err);
            console.error('Error stack:', err.stack);
            toast.error('Test failed: ' + err.message);
        } finally {
            setTesting(null);
        }
    };

    const handleSetActive = async (config) => {
        try {
            // Deactivate all configs
            await Promise.all(
                configs.map(c => 
                    base44.entities.RPCConfiguration.update(c.id, { is_active: false })
                )
            );

            // Activate selected config
            await base44.entities.RPCConfiguration.update(config.id, { is_active: true });
            
            toast.success(`${config.name} is now active`);
            loadConfigs();
        } catch (err) {
            toast.error('Failed to set active configuration');
        }
    };

    const handleCreateConfig = async () => {
        if (!newConfig.name.trim() || !newConfig.host.trim() || !newConfig.port.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            await base44.entities.RPCConfiguration.create({
                account_id: account.id,
                ...newConfig,
                connection_status: 'untested'
            });

            toast.success('Configuration created successfully');
            setShowNewConfig(false);
            setNewConfig({
                name: '',
                connection_type: 'rpc',
                host: '',
                port: '',
                username: '',
                password: '',
                use_ssl: false
            });
            loadConfigs();
        } catch (err) {
            toast.error('Failed to create configuration');
        }
    };

    const handleUpdateConfig = async () => {
        if (!editingConfig || !newConfig.name.trim() || !newConfig.host.trim() || !newConfig.port.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            await base44.entities.RPCConfiguration.update(editingConfig.id, {
                ...newConfig,
                connection_status: 'untested'
            });

            toast.success('Configuration updated successfully');
            setEditingConfig(null);
            setNewConfig({
                name: '',
                connection_type: 'rpc',
                host: '',
                port: '',
                username: '',
                password: '',
                use_ssl: false
            });
            loadConfigs();
        } catch (err) {
            toast.error('Failed to update configuration');
        }
    };

    const handleDeleteConfig = async (config) => {
        if (!confirm(`Delete configuration "${config.name}"?`)) return;

        try {
            await base44.entities.RPCConfiguration.delete(config.id);
            toast.success('Configuration deleted');
            loadConfigs();
        } catch (err) {
            toast.error('Failed to delete configuration');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected': return 'text-green-400 border-green-500/50 bg-green-500/10';
            case 'error': return 'text-red-400 border-red-500/50 bg-red-500/10';
            case 'disconnected': return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
            default: return 'text-slate-400 border-slate-500/50 bg-slate-500/10';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected': return <CheckCircle2 className="w-4 h-4" />;
            case 'error': return <XCircle className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('Wallet')}>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Shield className="w-8 h-8 text-purple-400" />
                                Admin Panel
                            </h1>
                            <p className="text-slate-400 text-sm">Configure RPC nodes and system settings</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                        Admin Access
                    </Badge>
                </div>

                <Tabs defaultValue="rpc" className="space-y-6">
                    <TabsList className="bg-slate-800/50 border border-slate-700">
                        <TabsTrigger value="rpc">RPC Configuration</TabsTrigger>
                        <TabsTrigger value="settings">System Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="rpc" className="space-y-6">
                        {/* Quick Actions */}
                        <div className="flex gap-3 flex-wrap">
                            {account?.rpc_host && account?.rpc_port && (
                                <Button
                                    onClick={async () => {
                                        try {
                                            await base44.entities.RPCConfiguration.create({
                                                account_id: account.id,
                                                name: 'From Wallet Config',
                                                connection_type: 'rpc',
                                                host: account.rpc_host,
                                                port: account.rpc_port,
                                                username: account.rpc_username || '',
                                                password: account.rpc_password || '',
                                                use_ssl: false,
                                                connection_status: 'untested'
                                            });
                                            toast.success('Configuration created from wallet data');
                                            loadConfigs();
                                        } catch (err) {
                                            toast.error('Failed to create configuration: ' + err.message);
                                        }
                                    }}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Use Wallet RPC Config
                                </Button>
                            )}
                            <Button
                                onClick={async () => {
                                    try {
                                        const results = await Promise.all(
                                            configs.map(config => 
                                                base44.functions.invoke('checkRPCStatus', {})
                                                    .then(res => ({ config, ...res.data }))
                                                    .catch(() => ({ config, connected: false }))
                                            )
                                        );
                                        
                                        await Promise.all(
                                            results.map(({ config, connected }) =>
                                                base44.entities.RPCConfiguration.update(config.id, {
                                                    connection_status: connected ? 'connected' : 'error',
                                                    last_connected: connected ? new Date().toISOString() : config.last_connected
                                                })
                                            )
                                        );
                                        
                                        toast.success('All connections tested');
                                        loadConfigs();
                                    } catch (err) {
                                        toast.error('Test failed: ' + err.message);
                                    }
                                }}
                                variant="outline"
                                className="border-blue-500/50 text-blue-400">
                                <Plug className="w-4 h-4 mr-2" />
                                Test All Connections
                            </Button>
                            <Button
                                onClick={() => {
                                    const configsData = configs.map(c => ({
                                        name: c.name,
                                        connection_type: c.connection_type,
                                        host: c.host,
                                        port: c.port,
                                        use_ssl: c.use_ssl
                                    }));
                                    const blob = new Blob([JSON.stringify(configsData, null, 2)], { type: 'application/json' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'rpc-configs-export.json';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    a.remove();
                                    toast.success('Configurations exported');
                                }}
                                variant="outline"
                                className="border-purple-500/50 text-purple-400">
                                Export Configs
                            </Button>
                        </div>

                        {/* RPC Overview */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card className="bg-gradient-to-br from-purple-900/50 to-slate-900/80 border-purple-500/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 mb-1">Total Configs</p>
                                            <p className="text-2xl font-bold text-white">{configs.length}</p>
                                        </div>
                                        <Server className="w-8 h-8 text-purple-400/50" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-green-900/50 to-slate-900/80 border-green-500/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 mb-1">Active</p>
                                            <p className="text-2xl font-bold text-white">
                                                {configs.filter(c => c.is_active).length}
                                            </p>
                                        </div>
                                        <CheckCircle2 className="w-8 h-8 text-green-400/50" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-900/50 to-slate-900/80 border-blue-500/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 mb-1">Connected</p>
                                            <p className="text-2xl font-bold text-white">
                                                {configs.filter(c => c.connection_status === 'connected').length}
                                            </p>
                                        </div>
                                        <Plug className="w-8 h-8 text-blue-400/50" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-amber-900/50 to-slate-900/80 border-amber-500/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 mb-1">Offline</p>
                                            <p className="text-2xl font-bold text-white">
                                                {configs.filter(c => c.connection_status === 'error' || c.connection_status === 'disconnected').length}
                                            </p>
                                        </div>
                                        <XCircle className="w-8 h-8 text-amber-400/50" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Quick Connect */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <QuickConnect 
                                accountId={account?.id}
                                onSuccess={loadConfigs}
                            />
                            <NetworkScanner 
                                onNodeSelected={(nodeConfig) => {
                                    setNewConfig({
                                        ...newConfig,
                                        ...nodeConfig
                                    });
                                    setShowNewConfig(true);
                                }}
                            />
                        </div>

                        {/* Setup Wizard, Local Proxy, and Port Forwarding Guide */}
                        <div className="flex gap-3 flex-wrap">
                            <Button
                                onClick={() => setShowWizard(true)}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                                <Server className="w-4 h-4 mr-2" />
                                Setup Wizard
                            </Button>
                            <LocalProxySetupGuide />
                            <LocalDevSetup account={account} />
                            <WindowsInstallerGuide />
                            <ElectronBuildAssistant />
                            <Button
                                onClick={() => {
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
                                    toast.success('vite.config.js downloaded');
                                }}
                                variant="outline"
                                className="border-green-500/50 text-green-400">
                                Download vite.config.js
                            </Button>
                            <Button
                                onClick={() => {
                                    const electronMain = `const { app, BrowserWindow } = require('electron');
                            const path = require('path');

                            let mainWindow;

                            function createWindow() {
                            mainWindow = new BrowserWindow({
                            width: 1400,
                            height: 900,
                            webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                            webSecurity: true
                            },
                            icon: path.join(__dirname, 'build/icon.png')
                            });

                            // Load your Base44 hosted app
                            mainWindow.loadURL('https://your-app.base44.io');

                            mainWindow.on('closed', () => {
                            mainWindow = null;
                            });
                            }

                            app.whenReady().then(createWindow);

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
                                    const blob = new Blob([electronMain], { type: 'text/javascript' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'electron-main.js';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    a.remove();
                                    toast.success('electron-main.js downloaded');
                                }}
                                variant="outline"
                                className="border-purple-500/50 text-purple-400">
                                Download electron-main.js (Hybrid)
                            </Button>
                            <Button
                                onClick={() => {
                                    const packageJson = {
                                        "name": "rod-wallet",
                                        "version": "1.0.0",
                                        "main": "electron-main.js",
                                        "scripts": {
                                            "dev": "vite",
                                            "build": "vite build",
                                            "electron:dev": "electron .",
                                            "electron:build": "npm run build && electron-builder"
                                        },
                                        "dependencies": {
                                            "react": "^18.2.0",
                                            "react-dom": "^18.2.0",
                                            "@tanstack/react-query": "^5.84.1",
                                            "@radix-ui/react-dialog": "^1.1.6",
                                            "@radix-ui/react-tabs": "^1.1.3",
                                            "@radix-ui/react-label": "^2.1.2",
                                            "@radix-ui/react-slot": "^1.1.2",
                                            "@radix-ui/react-select": "^2.1.6",
                                            "@radix-ui/react-toast": "^1.2.2",
                                            "@radix-ui/react-scroll-area": "^1.2.3",
                                            "lucide-react": "^0.475.0",
                                            "class-variance-authority": "^0.7.1",
                                            "clsx": "^2.1.1",
                                            "tailwind-merge": "^3.0.2",
                                            "sonner": "^2.0.1",
                                            "react-router-dom": "^6.26.0",
                                            "recharts": "^2.15.4",
                                            "date-fns": "^3.6.0"
                                        },
                                        "devDependencies": {
                                            "vite": "^7.0.0",
                                            "@vitejs/plugin-react": "^4.0.0",
                                            "electron": "^28.0.0",
                                            "electron-builder": "^24.0.0",
                                            "tailwindcss": "^3.4.0",
                                            "autoprefixer": "^10.4.0",
                                            "postcss": "^8.4.0",
                                            "tailwindcss-animate": "^1.0.7"
                                        },
                                        "build": {
                                            "appId": "com.rodwallet.app",
                                            "productName": "ROD Wallet",
                                            "directories": {
                                                "output": "release"
                                            },
                                            "files": ["dist/**/*", "electron-main.js"],
                                            "win": {
                                                "target": ["nsis"],
                                                "icon": "build/icon.ico",
                                                "signingHashAlgorithms": []
                                            }
                                        }
                                    };
                                    const blob = new Blob([JSON.stringify(packageJson, null, 2)], { type: 'application/json' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'package.json';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    a.remove();
                                    toast.success('package.json downloaded - run npm install again');
                                }}
                                variant="outline"
                                className="border-blue-500/50 text-blue-400">
                                Download package.json
                            </Button>
                            <PortForwardingGuide 
                                onConfigCreated={(configData) => {
                                    setNewConfig({
                                        ...newConfig,
                                        ...configData
                                    });
                                    setShowNewConfig(true);
                                    toast.success('Config template created - please add your RPC credentials');
                                }}
                            />
                        </div>

                        {/* Create/Edit Config */}
                        {!showNewConfig && !editingConfig ? (
                            <Button
                                onClick={() => setShowNewConfig(true)}
                                className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                Add New RPC Configuration
                            </Button>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="bg-slate-900/80 border-purple-500/30">
                                    <CardHeader>
                                        <CardTitle className="text-white flex items-center gap-2">
                                            {editingConfig ? (
                                                <>
                                                    <Settings className="w-5 h-5 text-blue-400" />
                                                    Edit RPC Configuration
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-5 h-5 text-purple-400" />
                                                    New RPC Configuration
                                                </>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <Label className="text-slate-300">Configuration Name *</Label>
                                                <Input
                                                    value={newConfig.name}
                                                    onChange={(e) => setNewConfig({...newConfig, name: e.target.value})}
                                                    placeholder="e.g., Local Node"
                                                    className="bg-slate-800 border-slate-700 text-white"
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-slate-300">Connection Type</Label>
                                                <select
                                                    value={newConfig.connection_type}
                                                    onChange={(e) => setNewConfig({...newConfig, connection_type: e.target.value})}
                                                    className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white">
                                                    <option value="rpc">Full Node RPC</option>
                                                    <option value="electrum">Electrum Server</option>
                                                    <option value="api">API Key</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <Label className="text-slate-300">Host *</Label>
                                                <Input
                                                    value={newConfig.host}
                                                    onChange={(e) => setNewConfig({...newConfig, host: e.target.value})}
                                                    placeholder="localhost or IP"
                                                    className="bg-slate-800 border-slate-700 text-white"
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-slate-300">Port *</Label>
                                                <Input
                                                    value={newConfig.port}
                                                    onChange={(e) => setNewConfig({...newConfig, port: e.target.value})}
                                                    placeholder="9766"
                                                    className="bg-slate-800 border-slate-700 text-white"
                                                />
                                            </div>
                                        </div>

                                        {newConfig.connection_type === 'rpc' && (
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <Label className="text-slate-300">RPC Username</Label>
                                                    <Input
                                                        value={newConfig.username}
                                                        onChange={(e) => setNewConfig({...newConfig, username: e.target.value})}
                                                        placeholder="rpcuser"
                                                        className="bg-slate-800 border-slate-700 text-white"
                                                    />
                                                </div>

                                                <div>
                                                    <Label className="text-slate-300">RPC Password</Label>
                                                    <Input
                                                        type="password"
                                                        value={newConfig.password}
                                                        onChange={(e) => setNewConfig({...newConfig, password: e.target.value})}
                                                        placeholder="••••••••"
                                                        className="bg-slate-800 border-slate-700 text-white"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="use_ssl"
                                                checked={newConfig.use_ssl}
                                                onChange={(e) => setNewConfig({...newConfig, use_ssl: e.target.checked})}
                                                className="w-4 h-4"
                                            />
                                            <Label htmlFor="use_ssl" className="text-slate-300">Use SSL/TLS</Label>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowNewConfig(false);
                                                    setEditingConfig(null);
                                                    setNewConfig({
                                                        name: '',
                                                        connection_type: 'rpc',
                                                        host: '',
                                                        port: '',
                                                        username: '',
                                                        password: '',
                                                        use_ssl: false
                                                    });
                                                }}
                                                className="flex-1 border-slate-700">
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={editingConfig ? handleUpdateConfig : handleCreateConfig}
                                                className="flex-1 bg-purple-600 hover:bg-purple-700">
                                                <Save className="w-4 h-4 mr-2" />
                                                {editingConfig ? 'Update Configuration' : 'Create Configuration'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Existing Configurations */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Existing Configurations</h3>
                            
                            {configs.length === 0 ? (
                                <Alert className="bg-slate-900/50 border-slate-700">
                                    <AlertCircle className="h-4 w-4 text-slate-400" />
                                    <AlertDescription className="text-slate-400">
                                        No RPC configurations yet. Create one to get started.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                configs.map((config, index) => (
                                    <motion.div
                                        key={config.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}>
                                        <Card className={`bg-slate-900/80 ${config.is_active ? 'border-purple-500/50' : 'border-slate-700'}`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                                                            <Server className="w-6 h-6 text-white" />
                                                        </div>
                                                        
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-semibold text-white">{config.name}</h4>
                                                                {config.is_active && (
                                                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                                <Badge variant="outline" className={getStatusColor(config.connection_status)}>
                                                                    {getStatusIcon(config.connection_status)}
                                                                    {config.connection_status}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-slate-400">
                                                                {config.connection_type.toUpperCase()} • {config.host}:{config.port}
                                                                {config.use_ssl && ' • SSL'}
                                                            </p>
                                                            {config.node_info && (
                                                                <p className="text-xs text-slate-500 mt-1">
                                                                    Block {config.node_info.blocks?.toLocaleString()} • {config.node_info.chain}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                       <Button
                                                           size="sm"
                                                           variant="outline"
                                                           onClick={() => {
                                                               setEditingConfig(config);
                                                               setNewConfig({
                                                                   name: config.name,
                                                                   connection_type: config.connection_type,
                                                                   host: config.host,
                                                                   port: config.port,
                                                                   username: config.username || '',
                                                                   password: config.password || '',
                                                                   use_ssl: config.use_ssl || false
                                                               });
                                                               setShowNewConfig(false);
                                                           }}
                                                           className="border-slate-700 text-blue-400 hover:text-blue-300">
                                                           <Pencil className="w-4 h-4" />
                                                       </Button>

                                                       <Button
                                                           size="sm"
                                                           variant="outline"
                                                           onClick={() => handleTestConnection(config)}
                                                           disabled={testing === config.id}
                                                           className="border-slate-700">
                                                           {testing === config.id ? (
                                                               <Loader2 className="w-4 h-4 animate-spin" />
                                                           ) : (
                                                               <>
                                                                   <Plug className="w-4 h-4 mr-1" />
                                                                   Test
                                                               </>
                                                           )}
                                                       </Button>

                                                       {!config.is_active ? (
                                                           <Button
                                                               size="sm"
                                                               onClick={() => handleSetActive(config)}
                                                               className="bg-purple-600 hover:bg-purple-700">
                                                               Activate
                                                           </Button>
                                                       ) : (
                                                           <Button
                                                               size="sm"
                                                               variant="outline"
                                                               onClick={async () => {
                                                                   try {
                                                                       await base44.entities.RPCConfiguration.update(config.id, { is_active: false });
                                                                       toast.success('Configuration deactivated');
                                                                       loadConfigs();
                                                                   } catch (err) {
                                                                       toast.error('Failed to deactivate');
                                                                   }
                                                               }}
                                                               className="border-amber-500/50 text-amber-400">
                                                               Deactivate
                                                           </Button>
                                                       )}

                                                       <Button
                                                           size="sm"
                                                           variant="outline"
                                                           onClick={() => {
                                                               navigator.clipboard.writeText(JSON.stringify({
                                                                   name: config.name,
                                                                   host: config.host,
                                                                   port: config.port,
                                                                   connection_type: config.connection_type,
                                                                   use_ssl: config.use_ssl
                                                               }, null, 2));
                                                               toast.success('Config copied to clipboard');
                                                           }}
                                                           className="border-slate-700 text-blue-400 hover:text-blue-300">
                                                           <Copy className="w-4 h-4" />
                                                       </Button>

                                                       <Button
                                                           size="sm"
                                                           variant="outline"
                                                           onClick={() => handleDeleteConfig(config)}
                                                           className="border-slate-700 text-red-400 hover:text-red-300">
                                                           <Trash2 className="w-4 h-4" />
                                                       </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card className="bg-slate-900/80 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-purple-400" />
                                    System Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-400">Additional system settings coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Setup Wizard Dialog */}
            <Dialog open={showWizard} onOpenChange={setShowWizard}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-700" aria-describedby="wizard-description">
                    <div className="sr-only" id="wizard-description">
                        Step-by-step wizard to configure your ROD Core node connection
                    </div>
                    <RPCSetupWizard 
                        onComplete={(wizardConfig) => {
                            setShowWizard(false);
                            setNewConfig({
                                name: wizardConfig.name || 'Wizard Config',
                                connection_type: 'rpc',
                                host: wizardConfig.host || wizardConfig.rpcbind || '127.0.0.1',
                                port: wizardConfig.port || wizardConfig.rpcport || '9766',
                                username: wizardConfig.username || wizardConfig.rpcuser || '',
                                password: wizardConfig.password || wizardConfig.rpcpassword || '',
                                use_ssl: false
                            });
                            setShowNewConfig(true);
                            toast.success('Configuration ready - review and save below');
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}