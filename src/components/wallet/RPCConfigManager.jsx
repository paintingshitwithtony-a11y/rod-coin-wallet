import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plug, Plus, CheckCircle2, AlertCircle, Loader2,
    Trash2, RefreshCw, Activity, Server, Wifi, WifiOff, Terminal, Copy, Upload, Edit, Download, FileJson
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RPCConfigManager({ account, onClose }) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [testing, setTesting] = useState({});
    const [editingConfig, setEditingConfig] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        connection_type: 'rpc',
        host: 'localhost',
        port: '9650',
        username: '',
        password: '',
        api_key: '',
        use_ssl: false
    });
    const [saving, setSaving] = useState(false);
    const [showCommandHelp, setShowCommandHelp] = useState(false);
    const [importing, setImporting] = useState(false);
    const [showScanConfig, setShowScanConfig] = useState(false);
    const [scanConfig, setScanConfig] = useState({
        ports: '9650, 8332, 8333',
        usernames: '__cookie__, roduser, rod',
        passwords: ', rodpassword, rod'
    });

    useEffect(() => {
        loadConfigurations();
        // Load saved scan config
        const saved = localStorage.getItem('rod_scan_config');
        if (saved) {
            try {
                setScanConfig(JSON.parse(saved));
            } catch (e) {
                // Invalid saved config, ignore
            }
        }
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
            const protocol = config.use_ssl ? 'https' : 'http';
            const rpcUrl = `${protocol}://${config.host}:${config.port}`;
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add authentication based on connection type
            if (config.connection_type === 'api' && config.api_key) {
                headers['X-API-Key'] = config.api_key;
            } else if (config.connection_type === 'rpc') {
                headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
            }
            
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers,
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
            
            // Try to parse as JSON first (bulk import)
            try {
                const jsonData = JSON.parse(content);
                if (Array.isArray(jsonData)) {
                    // Bulk import multiple configs
                    let imported = 0;
                    for (const config of jsonData) {
                        if (config.name && config.host && config.port) {
                            await base44.entities.RPCConfiguration.create({
                                account_id: account.id,
                                name: config.name,
                                connection_type: config.connection_type || 'rpc',
                                host: config.host,
                                port: config.port,
                                username: config.username || '',
                                password: config.password || '',
                                api_key: config.api_key || '',
                                use_ssl: config.use_ssl || false,
                                is_active: false,
                                connection_status: 'untested'
                            });
                            imported++;
                        }
                    }
                    toast.success(`Imported ${imported} configuration(s)`);
                    await loadConfigurations();
                    setImporting(false);
                    event.target.value = '';
                    return;
                }
            } catch (e) {
                // Not JSON, try .conf format
            }
            
            // Parse as .conf file
            const parsed = parseConfigFile(content);

            setFormData({
                name: parsed.isCookie ? 'Imported Config (Cookie Auth)' : 'Imported Config',
                connection_type: 'rpc',
                host: parsed.host,
                port: parsed.port,
                username: parsed.username,
                password: parsed.password,
                api_key: '',
                use_ssl: false
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

    const handleExportConfigs = () => {
        if (configs.length === 0) {
            toast.error('No configurations to export');
            return;
        }

        const exportData = configs.map(config => ({
            name: config.name,
            connection_type: config.connection_type || 'rpc',
            host: config.host,
            port: config.port,
            username: config.username || '',
            password: config.password || '',
            api_key: config.api_key || '',
            use_ssl: config.use_ssl || false
        }));

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rod-rpc-configs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        
        toast.success('Configurations exported successfully');
    };

    const autoDetectLocal = async () => {
        setSaving(true);
        toast.info('Scanning for local ROD Core wallet...');
        
        // Parse user-provided ports
        const ports = scanConfig.ports.split(',').map(p => p.trim()).filter(p => p);
        
        // Parse user-provided credentials
        const usernames = scanConfig.usernames.split(',').map(u => u.trim()).filter(u => u);
        const passwords = scanConfig.passwords.split(',').map(p => p.trim());
        
        // Create credential pairs (match by index, passwords can be empty)
        const credentials = usernames.map((username, idx) => ({
            username,
            password: passwords[idx] || '',
            isCookie: username === '__cookie__'
        }));
        
        const hosts = ['localhost', '127.0.0.1'];

        let detected = null;
        let totalAttempts = 0;
        const maxAttempts = hosts.length * ports.length * credentials.length;

        // Try all combinations
        for (const host of hosts) {
            for (const port of ports) {
                for (const cred of credentials) {
                    totalAttempts++;
                    
                    // Update progress
                    if (totalAttempts % 5 === 0) {
                        toast.info(`Scanning... ${totalAttempts}/${maxAttempts} attempts`);
                    }

                    try {
                        const rpcAuth = btoa(`${cred.username}:${cred.password}`);
                        const response = await fetch(`http://${host}:${port}`, {
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
                            signal: AbortSignal.timeout(2000)
                        });

                        const data = await response.json();
                        if (!data.error && data.result) {
                            detected = {
                                host,
                                port,
                                username: cred.username,
                                password: cred.password,
                                isCookie: cred.isCookie,
                                nodeInfo: data.result
                            };
                            break;
                        }
                    } catch (err) {
                        continue;
                    }
                }
                if (detected) break;
            }
            if (detected) break;
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
                toast.success(`Found on ${detected.host}:${detected.port} with cookie auth!`);
            } else {
                toast.success(`Found ROD Core on ${detected.host}:${detected.port}!`);
            }
            setShowAddForm(true);
        } else {
            toast.warning('No local ROD Core wallet detected. Add manually.');
            setShowAddForm(true);
        }
        
        setSaving(false);
    };

    const handleEditConfig = (config) => {
        setEditingConfig(config);
        setFormData({
            name: config.name,
            connection_type: config.connection_type || 'rpc',
            host: config.host,
            port: config.port,
            username: config.username || '',
            password: config.password || '',
            api_key: config.api_key || '',
            use_ssl: config.use_ssl || false
        });
        setShowAddForm(true);
    };

    const handleSaveConfig = async () => {
        if (!formData.name || !formData.host || !formData.port) {
            toast.error('Please fill in required fields');
            return;
        }
        
        // For RPC, require username and password
        if (formData.connection_type === 'rpc' && (!formData.username || !formData.password)) {
            toast.error('Username and password required for RPC connection');
            return;
        }
        
        // For API, require API key
        if (formData.connection_type === 'api' && !formData.api_key) {
            toast.error('API key required for API connection');
            return;
        }

        setSaving(true);
        try {
            if (editingConfig) {
                // Update existing config
                await base44.entities.RPCConfiguration.update(editingConfig.id, {
                    name: formData.name,
                    connection_type: formData.connection_type,
                    host: formData.host,
                    port: formData.port,
                    username: formData.username || '',
                    password: formData.password || '',
                    api_key: formData.api_key || '',
                    use_ssl: formData.use_ssl,
                    connection_status: 'untested'
                });

                // If this was the active config, update account too
                if (editingConfig.is_active) {
                    await base44.entities.WalletAccount.update(account.id, {
                        rpc_host: formData.host,
                        rpc_port: formData.port,
                        rpc_username: formData.username,
                        rpc_password: formData.password
                    });
                }

                toast.success('Configuration updated');
            } else {
                // Create new config
                const newConfig = await base44.entities.RPCConfiguration.create({
                    account_id: account.id,
                    name: formData.name,
                    connection_type: formData.connection_type,
                    host: formData.host,
                    port: formData.port,
                    username: formData.username || '',
                    password: formData.password || '',
                    api_key: formData.api_key || '',
                    use_ssl: formData.use_ssl,
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
                
                // Auto-test new connection
                setTimeout(() => testConnection(newConfig), 500);
            }

            setFormData({ name: '', connection_type: 'rpc', host: 'localhost', port: '9650', username: '', password: '', api_key: '', use_ssl: false });
            setEditingConfig(null);
            setShowAddForm(false);
            await loadConfigurations();
        } catch (err) {
            toast.error(editingConfig ? 'Failed to update configuration' : 'Failed to add configuration');
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
                            onClick={() => setShowScanConfig(!showScanConfig)}
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
                            onClick={() => document.getElementById('config-file-input').click()}
                            disabled={importing}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:text-white"
                        >
                            {importing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4 mr-2" />
                            )}
                            Load
                        </Button>
                        <input
                            id="config-file-input"
                            type="file"
                            accept=".conf,.json"
                            onChange={handleImportConfig}
                            className="hidden"
                        />
                        <Button
                            onClick={handleExportConfigs}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:text-white"
                            disabled={configs.length === 0}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                        <Button
                            onClick={() => {
                                setEditingConfig(null);
                                setFormData({ name: '', connection_type: 'rpc', host: 'localhost', port: '9650', username: '', password: '', api_key: '', use_ssl: false });
                                setShowAddForm(!showAddForm);
                            }}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Manually
                        </Button>
                        <Button
                            onClick={() => setShowCommandHelp(!showCommandHelp)}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:text-white"
                        >
                            <Terminal className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Scan configuration */}
                    {showScanConfig && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-white font-medium">Scan Configuration</h4>
                            </div>

                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <AlertCircle className="h-4 w-4 text-blue-400" />
                                <AlertDescription className="text-blue-300/80 text-sm">
                                    Configure which ports and credentials to try. Use comma-separated values.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Ports to Scan</Label>
                                <Input
                                    value={scanConfig.ports}
                                    onChange={(e) => setScanConfig({ ...scanConfig, ports: e.target.value })}
                                    placeholder="9650, 8332, 8333"
                                    className="bg-slate-900 border-slate-600 font-mono text-sm"
                                />
                                <p className="text-xs text-slate-500">Comma-separated port numbers</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Usernames to Try</Label>
                                <Input
                                    value={scanConfig.usernames}
                                    onChange={(e) => setScanConfig({ ...scanConfig, usernames: e.target.value })}
                                    placeholder="__cookie__, roduser, rod"
                                    className="bg-slate-900 border-slate-600 font-mono text-sm"
                                />
                                <p className="text-xs text-slate-500">Use __cookie__ for cookie auth</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Passwords to Try (matching order)</Label>
                                <Input
                                    value={scanConfig.passwords}
                                    onChange={(e) => setScanConfig({ ...scanConfig, passwords: e.target.value })}
                                    placeholder=", rodpassword, rod"
                                    className="bg-slate-900 border-slate-600 font-mono text-sm"
                                />
                                <p className="text-xs text-slate-500">Matches usernames by position. Leave empty for no password (e.g., cookie auth)</p>
                            </div>

                            <div className="flex gap-2">
                                <Button 
                                    onClick={() => {
                                        localStorage.setItem('rod_scan_config', JSON.stringify(scanConfig));
                                        toast.success('Scan configuration saved');
                                    }}
                                    variant="outline"
                                    className="border-green-600 text-green-400 hover:bg-green-600/10"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Save Config
                                </Button>
                                <Button 
                                    onClick={() => {
                                        autoDetectLocal();
                                    }}
                                    disabled={saving}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Activity className="w-4 h-4 mr-2" />
                                    )}
                                    Start Scan
                                </Button>
                            </div>
                        </motion.div>
                    )}

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

                    {/* Add/Edit form */}
                    {showAddForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3"
                        >
                            <h4 className="text-white font-medium">
                                {editingConfig ? 'Edit Configuration' : 'Add New Configuration'}
                            </h4>
                            
                            <Tabs value={formData.connection_type} onValueChange={(val) => setFormData({ ...formData, connection_type: val })}>
                                <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                                    <TabsTrigger value="rpc">Full Node (RPC)</TabsTrigger>
                                    <TabsTrigger value="electrum">Electrum Server</TabsTrigger>
                                    <TabsTrigger value="api">API Key</TabsTrigger>
                                </TabsList>

                                <TabsContent value="rpc" className="space-y-3 mt-3">
                                    <Alert className="bg-blue-500/10 border-blue-500/30">
                                        <AlertCircle className="h-4 w-4 text-blue-400" />
                                        <AlertDescription className="text-blue-300/80 text-xs">
                                            Connect to a full ROD Core node via RPC
                                        </AlertDescription>
                                    </Alert>
                                </TabsContent>

                                <TabsContent value="electrum" className="space-y-3 mt-3">
                                    <Alert className="bg-purple-500/10 border-purple-500/30">
                                        <AlertCircle className="h-4 w-4 text-purple-400" />
                                        <AlertDescription className="text-purple-300/80 text-xs">
                                            Connect to an Electrum server (lightweight, no full node required)
                                        </AlertDescription>
                                    </Alert>
                                </TabsContent>

                                <TabsContent value="api" className="space-y-3 mt-3">
                                    <Alert className="bg-green-500/10 border-green-500/30">
                                        <AlertCircle className="h-4 w-4 text-green-400" />
                                        <AlertDescription className="text-green-300/80 text-xs">
                                            Connect to ROD mainnet using your API key (simplest option)
                                        </AlertDescription>
                                    </Alert>
                                </TabsContent>
                            </Tabs>
                            
                            <div className="space-y-2">
                                <Label className="text-slate-300">Configuration Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={
                                        formData.connection_type === 'api' ? 'e.g., ROD Mainnet API' :
                                        formData.connection_type === 'electrum' ? 'e.g., Public Electrum Server' : 
                                        'e.g., Local Node, Mining Pool'
                                    }
                                    className="bg-slate-900 border-slate-600"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Host</Label>
                                    <Input
                                        value={formData.host}
                                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                        placeholder={
                                            formData.connection_type === 'api' ? 'api.rod-mainnet.com' :
                                            formData.connection_type === 'electrum' ? 'electrum.example.com' : 
                                            'localhost'
                                        }
                                        className="bg-slate-900 border-slate-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Port</Label>
                                    <Input
                                        value={formData.port}
                                        onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                                        placeholder={
                                            formData.connection_type === 'api' ? '443' :
                                            formData.connection_type === 'electrum' ? '50002' : 
                                            '9650'
                                        }
                                        className="bg-slate-900 border-slate-600"
                                    />
                                </div>
                                </div>
                            
                            {(formData.connection_type === 'electrum' || formData.connection_type === 'api') && (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
                                    <Label className="text-slate-300">Use SSL/TLS</Label>
                                    <Switch
                                        checked={formData.use_ssl}
                                        onCheckedChange={(checked) => setFormData({ ...formData, use_ssl: checked })}
                                    />
                                </div>
                            )}
                            {formData.connection_type === 'api' && (
                                <div className="space-y-2">
                                    <Label className="text-slate-300">API Key</Label>
                                    <Input
                                        type="password"
                                        value={formData.api_key}
                                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                        placeholder="Enter your ROD mainnet API key"
                                        className="bg-slate-900 border-slate-600"
                                    />
                                    <p className="text-xs text-slate-500">Your API key will be encrypted and stored securely</p>
                                </div>
                            )}
                            {formData.connection_type === 'rpc' && (
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
                            )}
                            <div className="flex gap-2">
                                <Button onClick={handleSaveConfig} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : editingConfig ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                    {editingConfig ? 'Update Configuration' : 'Add Configuration'}
                                </Button>
                                <Button onClick={() => {
                                    setShowAddForm(false);
                                    setEditingConfig(null);
                                    setFormData({ name: '', connection_type: 'rpc', host: 'localhost', port: '9650', username: '', password: '', api_key: '', use_ssl: false });
                                }} variant="outline" className="border-slate-600">
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
                                                    {config.connection_type === 'electrum' && (
                                                        <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">
                                                            Electrum
                                                        </Badge>
                                                    )}
                                                    {config.connection_type === 'api' && (
                                                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
                                                            API
                                                        </Badge>
                                                    )}
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
                                                    {config.use_ssl ? 'SSL://' : ''}{config.host}:{config.port}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleEditConfig(config)}
                                                className="text-slate-400 hover:text-blue-400"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
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
                            Active configuration is used for all transactions. Use Save/Load buttons to backup and restore configurations (.json or .conf files).
                        </AlertDescription>
                    </Alert>
                </div>
            </DialogContent>
        </Dialog>
    );
}