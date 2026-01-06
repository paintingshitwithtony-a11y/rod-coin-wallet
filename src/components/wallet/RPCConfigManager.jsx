import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plug, Plus, CheckCircle2, AlertCircle, Loader2,
    Trash2, RefreshCw, Activity, Server, Wifi, WifiOff, Terminal, Copy, Upload
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RPCConfigManager({ account, onClose }) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [testing, setTesting] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        host: 'localhost',
        port: '9650',
        username: '',
        password: ''
    });
    const [saving, setSaving] = useState(false);
    const [showCommandHelp, setShowCommandHelp] = useState(false);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        loadConfigurations();
    }, []);

    const loadConfigurations = async () => {
        try {
            const items = await base44.entities.RPCConfiguration.filter(
                { account_id: account.id },
                '-created_date'
            );
            setConfigs(items);
        } catch (err) {
            console.error('Failed to load RPC configs:', err);
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async (config) => {
        setTesting(prev => ({ ...prev, [config.id]: true }));
        
        try {
            const rpcUrl = `http://${config.host}:${config.port}`;
            const rpcAuth = btoa(`${config.username}:${config.password}`);
            
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${rpcAuth}`
                },
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'test',
                    method: 'getblockchaininfo',
                    params: []
                }),
                signal: AbortSignal.timeout(5000)
            });

            const data = await response.json();

            if (data.error) {
                await base44.entities.RPCConfiguration.update(config.id, {
                    connection_status: 'error',
                    last_connected: null
                });
                toast.error(`Connection failed: ${data.error.message}`);
            } else {
                await base44.entities.RPCConfiguration.update(config.id, {
                    connection_status: 'connected',
                    last_connected: new Date().toISOString(),
                    node_info: {
                        blocks: data.result.blocks,
                        chain: data.result.chain,
                        version: data.result.version
                    }
                });
                toast.success(`Connected to ${config.name}!`);
            }
            
            await loadConfigurations();
        } catch (err) {
            await base44.entities.RPCConfiguration.update(config.id, {
                connection_status: 'disconnected',
                last_connected: null
            });
            toast.error(`Connection timeout: ${config.name}`);
            await loadConfigurations();
        } finally {
            setTesting(prev => ({ ...prev, [config.id]: false }));
        }
    };

    const setActiveConfig = async (config) => {
        try {
            // Deactivate all others
            for (const cfg of configs) {
                if (cfg.is_active && cfg.id !== config.id) {
                    await base44.entities.RPCConfiguration.update(cfg.id, {
                        is_active: false
                    });
                }
            }

            // Activate selected
            await base44.entities.RPCConfiguration.update(config.id, {
                is_active: true
            });

            // Update account with active RPC
            await base44.entities.WalletAccount.update(account.id, {
                rpc_host: config.host,
                rpc_port: config.port,
                rpc_username: config.username,
                rpc_password: config.password
            });

            toast.success(`Switched to ${config.name}`);
            await loadConfigurations();
        } catch (err) {
            toast.error('Failed to switch configuration');
        }
    };

    const deleteConfig = async (config) => {
        if (!confirm(`Delete "${config.name}"?`)) return;
        
        try {
            await base44.entities.RPCConfiguration.delete(config.id);
            toast.success('Configuration deleted');
            await loadConfigurations();
        } catch (err) {
            toast.error('Failed to delete configuration');
        }
    };

    const parseConfigFile = (fileContent) => {
        const lines = fileContent.split('\n');
        const config = {
            host: 'localhost',
            port: '9650',
            username: '',
            password: '',
            isCookie: false
        };

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || !trimmed) continue;

            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=').trim();

            switch (key.trim().toLowerCase()) {
                case 'rpcport':
                    config.port = value;
                    break;
                case 'rpcbind':
                    config.host = value === '0.0.0.0' ? 'localhost' : value;
                    break;
                case 'rpcuser':
                    config.username = value;
                    break;
                case 'rpcpassword':
                    config.password = value;
                    break;
            }
        }

        // Detect cookie auth (no rpcuser/rpcpassword set)
        if (!config.username && !config.password) {
            config.username = '__cookie__';
            config.isCookie = true;
        }

        return config;
    };

    const handleImportConfig = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const content = await file.text();
            const parsed = parseConfigFile(content);

            setFormData({
                name: parsed.isCookie ? 'Imported Config (Cookie Auth)' : 'Imported Config',
                host: parsed.host,
                port: parsed.port,
                username: parsed.username,
                password: parsed.password
            });

            setShowAddForm(true);
            if (parsed.isCookie) {
                toast.success('Config imported! Using cookie auth - paste .cookie file content as password.');
            } else {
                toast.success('Config imported successfully!');
            }
        } catch (err) {
            toast.error('Failed to parse config file');
        } finally {
            setImporting(false);
            event.target.value = '';
        }
    };

    const connectToCoinbin = async () => {
        setSaving(true);
        toast.info('Connecting to Coinbin ROD Core...');

        const coinbinConfig = {
            host: 'coinbin.info',
            port: '9650',
            username: 'rodcoinrpc',
            password: 'rodcoinrpc'
        };

        try {
            const rpcAuth = btoa(`${coinbinConfig.username}:${coinbinConfig.password}`);
            const response = await fetch(`http://${coinbinConfig.host}:${coinbinConfig.port}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${rpcAuth}`
                },
                body: JSON.stringify({
                    jsonrpc: '1.0',
                    id: 'coinbin_test',
                    method: 'getblockchaininfo',
                    params: []
                }),
                signal: AbortSignal.timeout(5000)
            });

            const data = await response.json();
            if (!data.error && data.result) {
                setFormData({
                    name: 'Coinbin ROD Core',
                    host: coinbinConfig.host,
                    port: coinbinConfig.port,
                    username: coinbinConfig.username,
                    password: coinbinConfig.password
                });
                toast.success('Coinbin node verified! Click "Add Configuration" to save.');
                setShowAddForm(true);
            } else {
                toast.error('Failed to connect to Coinbin node');
            }
        } catch (err) {
            toast.error('Coinbin connection timeout. Check your internet connection.');
        } finally {
            setSaving(false);
        }
    };

    const autoDetectLocal = async () => {
        setSaving(true);
        toast.info('Detecting local ROD Core wallet...');
        
        // Cookie-based auth (modern method) - try first
        const cookieConfigs = [
            { host: 'localhost', port: '9650', username: '__cookie__', password: '', isCookie: true },
            { host: '127.0.0.1', port: '9650', username: '__cookie__', password: '', isCookie: true },
        ];

        // Legacy auth (fallback)
        const legacyConfigs = [
            { host: 'localhost', port: '9650', username: 'roduser', password: 'rodpassword' },
            { host: '127.0.0.1', port: '9650', username: 'roduser', password: 'rodpassword' },
            { host: 'localhost', port: '8332', username: 'roduser', password: 'rodpassword' },
        ];

        let detected = null;

        // Try cookie auth first
        for (const cfg of cookieConfigs) {
            try {
                const rpcAuth = btoa(`${cfg.username}:${cfg.password}`);
                const response = await fetch(`http://${cfg.host}:${cfg.port}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${rpcAuth}`
                    },
                    body: JSON.stringify({
                        jsonrpc: '1.0',
                        id: 'detect',
                        method: 'getblockchaininfo',
                        params: []
                    }),
                    signal: AbortSignal.timeout(3000)
                });

                const data = await response.json();
                if (!data.error && data.result) {
                    detected = {
                        ...cfg,
                        nodeInfo: data.result
                    };
                    break;
                }
            } catch (err) {
                continue;
            }
        }

        // If cookie auth didn't work, try legacy
        if (!detected) {
            for (const cfg of legacyConfigs) {
                try {
                    const rpcAuth = btoa(`${cfg.username}:${cfg.password}`);
                    const response = await fetch(`http://${cfg.host}:${cfg.port}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Basic ${rpcAuth}`
                        },
                        body: JSON.stringify({
                            jsonrpc: '1.0',
                            id: 'detect',
                            method: 'getblockchaininfo',
                            params: []
                        }),
                        signal: AbortSignal.timeout(3000)
                    });

                    const data = await response.json();
                    if (!data.error && data.result) {
                        detected = {
                            ...cfg,
                            nodeInfo: data.result
                        };
                        break;
                    }
                } catch (err) {
                    continue;
                }
            }
        }

        if (detected) {
            setFormData({
                name: detected.isCookie ? 'Local ROD Core (Cookie Auth)' : 'Local ROD Core',
                host: detected.host,
                port: detected.port,
                username: detected.username,
                password: detected.password
            });
            if (detected.isCookie) {
                toast.success(`Detected with cookie auth! Paste .cookie file content as password.`);
            } else {
                toast.success(`Detected ROD Core on ${detected.host}:${detected.port}!`);
            }
            setShowAddForm(true);
        } else {
            toast.warning('No local ROD Core wallet detected. Add manually.');
            setShowAddForm(true);
        }
        
        setSaving(false);
    };

    const handleAddConfig = async () => {
        if (!formData.name || !formData.host || !formData.port || !formData.username || !formData.password) {
            toast.error('Please fill in all fields');
            return;
        }

        setSaving(true);
        try {
            const newConfig = await base44.entities.RPCConfiguration.create({
                account_id: account.id,
                name: formData.name,
                host: formData.host,
                port: formData.port,
                username: formData.username,
                password: formData.password,
                is_active: configs.length === 0,
                connection_status: 'untested'
            });

            if (configs.length === 0) {
                await base44.entities.WalletAccount.update(account.id, {
                    rpc_host: formData.host,
                    rpc_port: formData.port,
                    rpc_username: formData.username,
                    rpc_password: formData.password
                });
            }

            toast.success('Configuration added');
            setFormData({ name: '', host: 'localhost', port: '9650', username: '', password: '' });
            setShowAddForm(false);
            await loadConfigurations();

            // Auto-test new connection
            testConnection(newConfig);
        } catch (err) {
            toast.error('Failed to add configuration');
        } finally {
            setSaving(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected':
                return <Wifi className="w-4 h-4 text-green-400" />;
            case 'disconnected':
                return <WifiOff className="w-4 h-4 text-red-400" />;
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-400" />;
            default:
                return <Activity className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected':
                return 'border-green-500/50 bg-green-500/10';
            case 'disconnected':
                return 'border-red-500/50 bg-red-500/10';
            case 'error':
                return 'border-red-500/50 bg-red-500/10';
            default:
                return 'border-slate-700/50 bg-slate-800/50';
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Server className="w-6 h-6 text-purple-400" />
                        RPC Node Management
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Manage multiple ROD Core RPC connections
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Auto-detect button */}
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            onClick={autoDetectLocal}
                            disabled={saving}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Activity className="w-4 h-4 mr-2" />
                            )}
                            Auto-Detect
                        </Button>
                        <Button
                            onClick={connectToCoinbin}
                            disabled={saving}
                            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Server className="w-4 h-4 mr-2" />
                            )}
                            Coinbin Node
                        </Button>
                        <Button
                            onClick={() => document.getElementById('config-file-input').click()}
                            disabled={importing}
                            variant="outline"
                            className="border-slate-600"
                        >
                            {importing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4 mr-2" />
                            )}
                            Import Config
                        </Button>
                        <input
                            id="config-file-input"
                            type="file"
                            accept=".conf"
                            onChange={handleImportConfig}
                            className="hidden"
                        />
                        <Button
                            onClick={() => setShowAddForm(!showAddForm)}
                            variant="outline"
                            className="border-slate-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Manually
                        </Button>
                        <Button
                            onClick={() => setShowCommandHelp(!showCommandHelp)}
                            variant="outline"
                            className="border-slate-600"
                        >
                            <Terminal className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Command line help */}
                    {showCommandHelp && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Terminal className="w-5 h-5 text-green-400" />
                                <h4 className="text-white font-medium">Start ROD Core with RPC</h4>
                            </div>

                            <Alert className="bg-blue-500/10 border-blue-500/30 mb-3">
                                <AlertCircle className="h-4 w-4 text-blue-400" />
                                <AlertDescription className="text-blue-300/80 text-sm">
                                    <strong>Recommended:</strong> Use cookie-based authentication (no rpcuser/rpcpassword needed) or rpcauth for better security.
                                </AlertDescription>
                            </Alert>
                            
                            <div className="space-y-2">
                                <p className="text-sm text-slate-300 font-medium">
                                    Method 1: Cookie Authentication (Recommended)
                                </p>
                                <p className="text-xs text-slate-400 mb-1">
                                    Windows:
                                </p>
                                <div className="relative group">
                                    <pre className="bg-slate-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
                                        rod-qt.exe -server -rpcport=9650 -rpcbind=127.0.0.1 -rpcallowip=127.0.0.1
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => {
                                            navigator.clipboard.writeText('rod-qt.exe -server -rpcport=9650 -rpcbind=127.0.0.1 -rpcallowip=127.0.0.1');
                                            toast.success('Command copied');
                                        }}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-400 mb-1">
                                    Linux/Mac:
                                </p>
                                <div className="relative group">
                                    <pre className="bg-slate-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
                                        ./rodd -server -rpcport=9650 -rpcbind=127.0.0.1 -rpcallowip=127.0.0.1
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => {
                                            navigator.clipboard.writeText('./rodd -server -rpcport=9650 -rpcbind=127.0.0.1 -rpcallowip=127.0.0.1');
                                            toast.success('Command copied');
                                        }}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 italic mt-1">
                                    Note: With cookie auth, use "__cookie__" as username and the content of .cookie file as password
                                </p>
                            </div>

                            <div className="space-y-2 mt-4">
                                <p className="text-sm text-slate-300 font-medium">
                                    Method 2: Legacy Username/Password (Still Works)
                                </p>
                                <p className="text-xs text-slate-400 mb-1">
                                    rod.conf configuration:
                                </p>
                                <div className="relative group">
                                    <pre className="bg-slate-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
{`server=1
rpcuser=roduser
rpcpassword=rodpassword
rpcport=9650
rpcbind=127.0.0.1
rpcallowip=127.0.0.1`}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => {
                                            navigator.clipboard.writeText('server=1\nrpcuser=roduser\nrpcpassword=rodpassword\nrpcport=9650\nrpcbind=127.0.0.1\nrpcallowip=127.0.0.1');
                                            toast.success('Configuration copied');
                                        }}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <AlertCircle className="h-4 w-4 text-blue-400" />
                                <AlertDescription className="text-blue-300/80 text-sm">
                                    Change the username and password to match your saved configuration. After starting with these settings, use "Auto-Detect" above.
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    {/* Add form */}
                    {showAddForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3"
                        >
                            <div className="space-y-2">
                                <Label className="text-slate-300">Configuration Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Local Node, Mining Pool"
                                    className="bg-slate-900 border-slate-600"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Host</Label>
                                    <Input
                                        value={formData.host}
                                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                        placeholder="localhost"
                                        className="bg-slate-900 border-slate-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Port</Label>
                                    <Input
                                        value={formData.port}
                                        onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                                        placeholder="9650"
                                        className="bg-slate-900 border-slate-600"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Username</Label>
                                    <Input
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="__cookie__ or roduser"
                                        className="bg-slate-900 border-slate-600"
                                    />
                                    <p className="text-xs text-slate-500">Use "__cookie__" for cookie auth</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Password</Label>
                                    <Input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder=".cookie content or password"
                                        className="bg-slate-900 border-slate-600"
                                    />
                                    <p className="text-xs text-slate-500">Paste .cookie file content if using cookie auth</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleAddConfig} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                    Add Configuration
                                </Button>
                                <Button onClick={() => setShowAddForm(false)} variant="outline" className="border-slate-600">
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Configurations list */}
                    <div className="space-y-2">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                            </div>
                        ) : configs.length === 0 ? (
                            <Alert className="bg-slate-800/50 border-slate-700">
                                <AlertCircle className="h-4 w-4 text-slate-400" />
                                <AlertDescription className="text-slate-400">
                                    No RPC configurations yet. Add one to connect to a ROD Core node.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            configs.map((config) => (
                                <motion.div
                                    key={config.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => !config.is_active && setActiveConfig(config)}
                                    className={`p-4 rounded-lg border transition-all ${getStatusColor(config.connection_status)} ${
                                        !config.is_active ? 'cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/70' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-3 flex-1">
                                            {getStatusIcon(config.connection_status)}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-white">{config.name}</h4>
                                                    {config.is_active && (
                                                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                                                            Active
                                                        </Badge>
                                                    )}
                                                    {!config.is_active && (
                                                        <span className="text-xs text-slate-500">Click to activate</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 font-mono">
                                                    {config.host}:{config.port}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => testConnection(config)}
                                                disabled={testing[config.id]}
                                                className="text-slate-400 hover:text-white"
                                            >
                                                {testing[config.id] ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => deleteConfig(config)}
                                                disabled={config.is_active}
                                                className="text-red-400 hover:text-red-300 disabled:opacity-30"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    {config.node_info && (
                                        <div className="flex gap-4 text-xs text-slate-400 mt-2 pt-2 border-t border-slate-700/50">
                                            <span>Blocks: {config.node_info.blocks?.toLocaleString()}</span>
                                            <span>Chain: {config.node_info.chain}</span>
                                            {config.last_connected && (
                                                <span>Connected: {new Date(config.last_connected).toLocaleTimeString()}</span>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>

                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300/80 text-sm">
                            Active configuration is used for all transactions. Test connections before switching.
                        </AlertDescription>
                    </Alert>
                </div>
            </DialogContent>
        </Dialog>
    );
}