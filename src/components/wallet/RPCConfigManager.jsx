import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
    Trash2, RefreshCw, Activity, Server, Wifi, WifiOff, Terminal, Copy, Upload, Edit, Download, FileJson, Link, Settings, Shield
} from 'lucide-react';
import RPCConfigList from './RPCConfigList';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import RPCTroubleshooter from './RPCTroubleshooter';
import UseDefaultRPCButton from './UseDefaultRPCButton';
import GetBlockSetupGuide from './GetBlockSetupGuide';

export default function RPCConfigManager({ account, onClose, onConnectionSuccess }) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [testing, setTesting] = useState({});
    const [editingConfig, setEditingConfig] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        connection_type: 'rpc',
        host: 'localhost',
        port: '9766',
        username: '',
        password: '',
        api_key: '',
        curl_command: '',
        use_ssl: false
    });
    const [saving, setSaving] = useState(false);
    const [showCommandHelp, setShowCommandHelp] = useState(false);
    const [importing, setImporting] = useState(false);
    const [showScanConfig, setShowScanConfig] = useState(false);
    const [showEndpointInfo, setShowEndpointInfo] = useState(false);
    const [showFreeRPCGuide, setShowFreeRPCGuide] = useState(false);
    const [showPortChecker, setShowPortChecker] = useState(false);
    const [portCheckHost, setPortCheckHost] = useState('localhost');
    const [portCheckPorts, setPortCheckPorts] = useState('9766, 8332, 8333, 18332, 18333');
    const [portCheckResults, setPortCheckResults] = useState([]);
    const [checkingPorts, setCheckingPorts] = useState(false);
    const [showPortOpener, setShowPortOpener] = useState(false);
    const [portToOpen, setPortToOpen] = useState('9766');
    const [troubleshootingError, setTroubleshootingError] = useState(null);
    const [troubleshootingConfig, setTroubleshootingConfig] = useState(null);
    const [scanConfig, setScanConfig] = useState({
        ports: '9766, 8332, 8333',
        usernames: '__cookie__, roduser, rod',
        passwords: ', rodpassword, rod'
    });
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [advancedSettings, setAdvancedSettings] = useState({
        enable_listtransactions: true,
        enable_listreceivedbyaddress: true,
        enable_gettransaction: true,
        enable_sendtoaddress: true,
        enable_importaddress: true,
        custom_timeout: 30,
        max_connections: 10
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
        // Load saved advanced settings
        const savedAdvanced = localStorage.getItem('rod_advanced_rpc_settings');
        if (savedAdvanced) {
            try {
                setAdvancedSettings(JSON.parse(savedAdvanced));
            } catch (e) {
                // Invalid saved settings, ignore
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
            // Temporarily activate this config for testing
            const originalActive = configs.find(c => c.is_active);
            await base44.entities.RPCConfiguration.update(config.id, { is_active: true });
            
            // Use backend proxy to test (avoids CORS)
            const response = await base44.functions.invoke('checkRPCStatus', {});
            
            // Restore original active config
            if (originalActive && originalActive.id !== config.id) {
                await base44.entities.RPCConfiguration.update(config.id, { is_active: false });
                await base44.entities.RPCConfiguration.update(originalActive.id, { is_active: true });
            }

            if (response.data.connected) {
                await base44.entities.RPCConfiguration.update(config.id, {
                    connection_status: 'connected',
                    last_connected: new Date().toISOString(),
                    node_info: response.data.nodeInfo || {}
                });
                toast.success(`Connected to ${config.name}!`);

                if (onConnectionSuccess) {
                    onConnectionSuccess();
                }
            } else {
                await base44.entities.RPCConfiguration.update(config.id, {
                    connection_status: 'error',
                    last_connected: null
                });
                const errorMsg = response.data.error || 'Unknown error';
                toast.error(`Connection failed: ${errorMsg}`);
                
                // Show troubleshooter for connection errors
                setTroubleshootingError(errorMsg);
                setTroubleshootingConfig(config);
            }

            await loadConfigurations();
        } catch (err) {
            await base44.entities.RPCConfiguration.update(config.id, {
                connection_status: 'error',
                last_connected: null
            });
            toast.error(`Test failed: ${err.message}`);
            
            // Show troubleshooter for connection errors
            setTroubleshootingError(err.message);
            setTroubleshootingConfig(config);
            
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

            // Trigger wallet refresh when switching active config
            if (onConnectionSuccess) {
                onConnectionSuccess();
            }
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
            port: '9766',
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
                                curl_command: config.curl_command || '',
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
                curl_command: '',
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
            curl_command: config.curl_command || '',
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
        
        // Parse user-provided ports (default to 9766 if not specified)
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

    const isAdminConfig = (config) =>
        config.name?.endsWith('(Default)') || config.name === 'ROD Core (from secrets)';

    const handleEditConfig = (config) => {
        if (isAdminConfig(config)) {
            toast.error('This configuration is managed by the admin and cannot be edited.');
            return;
        }
        setEditingConfig(config);
        setFormData({
            name: config.name,
            connection_type: config.connection_type || 'rpc',
            host: config.host,
            port: config.port,
            username: config.username || '',
            password: config.password || '',
            api_key: config.api_key || '',
            curl_command: config.curl_command || '',
            use_ssl: config.use_ssl || false
        });
        setShowAddForm(true);
    };

    const validateAndTestConnection = async () => {
        // Validate required fields
        if (!formData.name || !formData.host) {
            toast.error('Please fill in required fields');
            return false;
        }

        if (formData.connection_type !== 'api' && !formData.port) {
            toast.error('Port is required');
            return false;
        }

        if (formData.connection_type === 'curl' && !formData.curl_command) {
            toast.error('cURL command required');
            return false;
        }

        if (formData.connection_type === 'rpc' && (!formData.username || !formData.password)) {
            toast.error('Username and password required for RPC connections');
            return false;
        }

        if (formData.connection_type === 'api' && !formData.api_key) {
            toast.error('API key required for API connections');
            return false;
        }

        toast.success('Configuration validated - will test after saving');
        return true;
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        
        // Validate and test connection first
        const isValid = await validateAndTestConnection();
        if (!isValid) {
            setSaving(false);
            return;
        }
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
                    curl_command: formData.curl_command || '',
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
                    curl_command: formData.curl_command || '',
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

            setFormData({ name: '', connection_type: 'rpc', host: 'localhost', port: '9650', username: '', password: '', api_key: '', curl_command: '', use_ssl: false });
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
        <>
            {troubleshootingError && (
                <RPCTroubleshooter
                    error={troubleshootingError}
                    config={troubleshootingConfig}
                    onRetry={() => {
                        setTroubleshootingError(null);
                        setTroubleshootingConfig(null);
                        if (troubleshootingConfig) {
                            testConnection(troubleshootingConfig);
                        }
                    }}
                    onClose={() => {
                        setTroubleshootingError(null);
                        setTroubleshootingConfig(null);
                    }}
                />
            )}
            <Dialog open onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-[95vw] md:max-w-5xl max-h-[80vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <Server className="w-6 h-6 text-purple-400" />
                                RPC Node Management
                            </DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Manage multiple ROD Core RPC connections
                            </DialogDescription>
                        </div>
                        {configs.some(c => c.connection_status === 'connected') && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
                                Connected
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Auto-detect button */}
                    <div className="flex gap-1 md:gap-2 flex-wrap overflow-x-hidden">
                        <Button
                            className="text-xs md:text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    const response = await base44.functions.invoke('setupRODNodeFromSecrets', {});
                                    
                                    if (response.data.success) {
                                        toast.success('ROD Core node configured from secrets');
                                        await loadConfigurations();
                                        
                                        // Auto-test the new connection
                                        const newConfigs = await base44.entities.RPCConfiguration.filter({
                                            account_id: account.id,
                                            name: 'ROD Core (from secrets)'
                                        });
                                        if (newConfigs.length > 0) {
                                            setTimeout(() => testConnection(newConfigs[0]), 500);
                                        }
                                    } else {
                                        toast.error(response.data.message || 'Failed to configure from secrets');
                                    }
                                } catch (err) {
                                    toast.error(err.message || 'Failed to configure from secrets');
                                    console.error('Setup error:', err);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Server className="w-4 h-4 mr-2" />
                            )}
                            Use ROD Secrets
                        </Button>
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
                                setFormData({ name: '', connection_type: 'rpc', host: 'localhost', port: '9766', username: '', password: '', api_key: '', curl_command: '', use_ssl: false });
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
                        <Button
                            onClick={() => setShowEndpointInfo(!showEndpointInfo)}
                            variant="outline"
                            className="border-green-600 text-green-400 hover:bg-green-600/10"
                        >
                            <Link className="w-4 h-4 mr-2" />
                            RPC Endpoint
                        </Button>
                        <Button
                            onClick={() => setShowFreeRPCGuide(!showFreeRPCGuide)}
                            variant="outline"
                            className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                        >
                            <Server className="w-4 h-4 mr-2" />
                            FreeRPC.com Setup
                        </Button>
                        <Button
                            onClick={() => setShowPortChecker(!showPortChecker)}
                            variant="outline"
                            className="border-amber-600 text-amber-400 hover:bg-amber-600/10"
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            Port Checker
                        </Button>
                        <Button
                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-600/10"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Advanced
                        </Button>
                        <Button
                            onClick={() => setShowPortOpener(!showPortOpener)}
                            variant="outline"
                            className="border-green-600 text-green-400 hover:bg-green-600/10"
                        >
                            <Plug className="w-4 h-4 mr-2" />
                            Open Ports
                        </Button>
                        <UseDefaultRPCButton
                            account={account}
                            onSuccess={async () => {
                                await loadConfigurations();
                                if (onConnectionSuccess) onConnectionSuccess();
                            }}
                        />
                    </div>

                    {/* Advanced RPC Settings */}
                    {showAdvancedSettings && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 space-y-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Settings className="w-5 h-5 text-red-400" />
                                <h4 className="text-white font-medium">Advanced RPC Settings</h4>
                            </div>

                            <Alert className="bg-red-500/10 border-red-500/30">
                                <Shield className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-300/80 text-sm">
                                    <strong>⚠️ Warning:</strong> These settings control which RPC methods are allowed. 
                                    Disabling methods can break wallet functionality. Only modify if you understand the implications.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <h5 className="text-white font-medium text-sm">RPC Method Permissions</h5>
                                    
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
                                        <div className="flex-1">
                                            <Label className="text-slate-300 text-sm font-medium">listtransactions</Label>
                                            <p className="text-xs text-slate-500 mt-1">Required for transaction history and "Import Full History" feature</p>
                                        </div>
                                        <Switch
                                            checked={advancedSettings.enable_listtransactions}
                                            onCheckedChange={(checked) => setAdvancedSettings({ ...advancedSettings, enable_listtransactions: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
                                        <div className="flex-1">
                                            <Label className="text-slate-300 text-sm font-medium">listreceivedbyaddress</Label>
                                            <p className="text-xs text-slate-500 mt-1">Required for checking deposits and receiving payments</p>
                                        </div>
                                        <Switch
                                            checked={advancedSettings.enable_listreceivedbyaddress}
                                            onCheckedChange={(checked) => setAdvancedSettings({ ...advancedSettings, enable_listreceivedbyaddress: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
                                        <div className="flex-1">
                                            <Label className="text-slate-300 text-sm font-medium">gettransaction</Label>
                                            <p className="text-xs text-slate-500 mt-1">Required for viewing transaction details</p>
                                        </div>
                                        <Switch
                                            checked={advancedSettings.enable_gettransaction}
                                            onCheckedChange={(checked) => setAdvancedSettings({ ...advancedSettings, enable_gettransaction: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
                                        <div className="flex-1">
                                            <Label className="text-slate-300 text-sm font-medium">sendtoaddress</Label>
                                            <p className="text-xs text-slate-500 mt-1">Required for sending payments (⚠️ Critical for wallet functionality)</p>
                                        </div>
                                        <Switch
                                            checked={advancedSettings.enable_sendtoaddress}
                                            onCheckedChange={(checked) => setAdvancedSettings({ ...advancedSettings, enable_sendtoaddress: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
                                        <div className="flex-1">
                                            <Label className="text-slate-300 text-sm font-medium">importaddress</Label>
                                            <p className="text-xs text-slate-500 mt-1">Required for importing wallet addresses to RPC node</p>
                                        </div>
                                        <Switch
                                            checked={advancedSettings.enable_importaddress}
                                            onCheckedChange={(checked) => setAdvancedSettings({ ...advancedSettings, enable_importaddress: checked })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h5 className="text-white font-medium text-sm">Connection Settings</h5>
                                    
                                    <div className="space-y-2">
                                        <Label className="text-slate-300 text-sm">Request Timeout (seconds)</Label>
                                        <Input
                                            type="number"
                                            value={advancedSettings.custom_timeout}
                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, custom_timeout: parseInt(e.target.value) || 30 })}
                                            min="5"
                                            max="300"
                                            className="bg-slate-900 border-slate-600"
                                        />
                                        <p className="text-xs text-slate-500">Timeout for RPC requests (5-300 seconds)</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-300 text-sm">Max Concurrent Connections</Label>
                                        <Input
                                            type="number"
                                            value={advancedSettings.max_connections}
                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, max_connections: parseInt(e.target.value) || 10 })}
                                            min="1"
                                            max="50"
                                            className="bg-slate-900 border-slate-600"
                                        />
                                        <p className="text-xs text-slate-500">Maximum number of simultaneous RPC connections (1-50)</p>
                                    </div>
                                </div>

                                <Alert className="bg-amber-500/10 border-amber-500/30">
                                    <AlertCircle className="h-4 w-4 text-amber-400" />
                                    <AlertDescription className="text-amber-300/80 text-xs">
                                        <strong>Note:</strong> These settings are stored locally and affect how the wallet interacts with the RPC node. 
                                        Your node's own configuration may override some of these settings.
                                    </AlertDescription>
                                </Alert>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => {
                                            localStorage.setItem('rod_advanced_rpc_settings', JSON.stringify(advancedSettings));
                                            toast.success('Advanced settings saved');
                                        }}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Save Settings
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const defaultSettings = {
                                                enable_listtransactions: true,
                                                enable_listreceivedbyaddress: true,
                                                enable_gettransaction: true,
                                                enable_sendtoaddress: true,
                                                enable_importaddress: true,
                                                custom_timeout: 30,
                                                max_connections: 10
                                            };
                                            setAdvancedSettings(defaultSettings);
                                            localStorage.setItem('rod_advanced_rpc_settings', JSON.stringify(defaultSettings));
                                            toast.success('Reset to defaults');
                                        }}
                                        variant="outline"
                                        className="border-slate-600 text-slate-300"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Reset Defaults
                                    </Button>
                                </div>

                                <Alert className="bg-red-500/10 border-red-500/30">
                                    <Shield className="h-4 w-4 text-red-400" />
                                    <AlertDescription className="text-red-300/80 text-xs">
                                        <strong>Security Note:</strong>
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                            <li>Disabling <code className="text-amber-400">sendtoaddress</code> will prevent sending transactions</li>
                                            <li>Disabling <code className="text-amber-400">listtransactions</code> will break transaction history</li>
                                            <li>Only disable methods if your RPC provider restricts them</li>
                                            <li>Changes take effect immediately for new connections</li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </motion.div>
                    )}

                    {/* Port Opener */}
                    {showPortOpener && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 space-y-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Plug className="w-5 h-5 text-green-400" />
                                <h4 className="text-white font-medium">Open Local Ports</h4>
                            </div>

                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <AlertCircle className="h-4 w-4 text-blue-400" />
                                <AlertDescription className="text-blue-300/80 text-sm">
                                    Generate commands to open firewall ports on your local machine. Run these commands with administrator/sudo privileges.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Port to Open</Label>
                                <Input
                                    value={portToOpen}
                                    onChange={(e) => setPortToOpen(e.target.value)}
                                    placeholder="9766"
                                    className="bg-slate-900 border-slate-600 font-mono text-sm"
                                />
                                <p className="text-xs text-slate-500">ROD Core default: 9766</p>
                            </div>

                            <Tabs defaultValue="windows" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                                    <TabsTrigger value="windows">Windows</TabsTrigger>
                                    <TabsTrigger value="linux">Linux</TabsTrigger>
                                    <TabsTrigger value="macos">macOS</TabsTrigger>
                                </TabsList>

                                <TabsContent value="windows" className="space-y-3 mt-3">
                                    <div>
                                        <Label className="text-slate-300 text-sm mb-2 block">Windows Firewall Command</Label>
                                        <p className="text-xs text-slate-400 mb-2">Run as Administrator in PowerShell or Command Prompt:</p>
                                        <div className="relative group">
                                            <pre className="bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-green-500/20">
{`netsh advfirewall firewall add rule name="ROD Core RPC" dir=in action=allow protocol=TCP localport=${portToOpen}`}</pre>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`netsh advfirewall firewall add rule name="ROD Core RPC" dir=in action=allow protocol=TCP localport=${portToOpen}`);
                                                    toast.success('Command copied');
                                                }}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <Alert className="bg-amber-500/10 border-amber-500/30">
                                        <AlertCircle className="h-4 w-4 text-amber-400" />
                                        <AlertDescription className="text-amber-300/80 text-xs">
                                            <strong>Steps:</strong>
                                            <ol className="list-decimal list-inside mt-2 space-y-1">
                                                <li>Right-click Start menu → "Windows PowerShell (Admin)"</li>
                                                <li>Paste the command above</li>
                                                <li>Press Enter and confirm with Yes if prompted</li>
                                            </ol>
                                        </AlertDescription>
                                    </Alert>
                                </TabsContent>

                                <TabsContent value="linux" className="space-y-3 mt-3">
                                    <div>
                                        <Label className="text-slate-300 text-sm mb-2 block">UFW (Ubuntu/Debian)</Label>
                                        <div className="relative group mb-3">
                                            <pre className="bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-green-500/20">
{`sudo ufw allow ${portToOpen}/tcp`}</pre>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`sudo ufw allow ${portToOpen}/tcp`);
                                                    toast.success('Command copied');
                                                }}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-slate-300 text-sm mb-2 block">iptables (CentOS/RHEL)</Label>
                                        <div className="relative group">
                                            <pre className="bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-green-500/20">
{`sudo iptables -A INPUT -p tcp --dport ${portToOpen} -j ACCEPT
sudo service iptables save`}</pre>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`sudo iptables -A INPUT -p tcp --dport ${portToOpen} -j ACCEPT\nsudo service iptables save`);
                                                    toast.success('Command copied');
                                                }}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <Alert className="bg-blue-500/10 border-blue-500/30">
                                        <AlertCircle className="h-4 w-4 text-blue-400" />
                                        <AlertDescription className="text-blue-300/80 text-xs">
                                            Run in terminal with sudo privileges. Check which firewall you're using with <code className="text-amber-400">sudo ufw status</code> or <code className="text-amber-400">sudo systemctl status firewalld</code>
                                        </AlertDescription>
                                    </Alert>
                                </TabsContent>

                                <TabsContent value="macos" className="space-y-3 mt-3">
                                    <div>
                                        <Label className="text-slate-300 text-sm mb-2 block">macOS Firewall (GUI)</Label>
                                        <Alert className="bg-blue-500/10 border-blue-500/30">
                                            <AlertCircle className="h-4 w-4 text-blue-400" />
                                            <AlertDescription className="text-blue-300/80 text-xs">
                                                <strong>Steps:</strong>
                                                <ol className="list-decimal list-inside mt-2 space-y-1">
                                                    <li>Open System Preferences → Security & Privacy → Firewall</li>
                                                    <li>Click the lock icon to make changes</li>
                                                    <li>Click "Firewall Options"</li>
                                                    <li>Click "+" and select ROD Core application</li>
                                                    <li>Set to "Allow incoming connections"</li>
                                                </ol>
                                            </AlertDescription>
                                        </Alert>
                                    </div>

                                    <div>
                                        <Label className="text-slate-300 text-sm mb-2 block">pfctl (Advanced)</Label>
                                        <div className="relative group">
                                            <pre className="bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-green-500/20">
{`echo "pass in proto tcp from any to any port ${portToOpen}" | sudo pfctl -ef -`}</pre>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`echo "pass in proto tcp from any to any port ${portToOpen}" | sudo pfctl -ef -`);
                                                    toast.success('Command copied');
                                                }}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">Note: This is temporary and will reset on reboot</p>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <Alert className="bg-red-500/10 border-red-500/30">
                                <Shield className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-300/80 text-xs">
                                    <strong>⚠️ Security Warning:</strong>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Only open ports on trusted networks (home/office)</li>
                                        <li>Never expose RPC ports to the public internet without authentication</li>
                                        <li>Use strong passwords/API keys for RPC connections</li>
                                        <li>Consider using VPN for remote access instead</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    {/* Port Checker */}
                    {showPortChecker && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 space-y-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Activity className="w-5 h-5 text-amber-400" />
                                <h4 className="text-white font-medium">Port Checker</h4>
                            </div>

                            <Alert className="bg-amber-500/10 border-amber-500/30">
                                <AlertCircle className="h-4 w-4 text-amber-400" />
                                <AlertDescription className="text-amber-300/80 text-sm">
                                    Check if specific ports are open on your computer. Useful for debugging RPC connection issues.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Host</Label>
                                    <Input
                                        value={portCheckHost}
                                        onChange={(e) => setPortCheckHost(e.target.value)}
                                        placeholder="localhost or 127.0.0.1"
                                        className="bg-slate-900 border-slate-600 font-mono text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Ports to Check (comma-separated)</Label>
                                    <Input
                                        value={portCheckPorts}
                                        onChange={(e) => setPortCheckPorts(e.target.value)}
                                        placeholder="9650, 8332, 8333"
                                        className="bg-slate-900 border-slate-600 font-mono text-sm"
                                    />
                                    <p className="text-xs text-slate-500">Common ROD ports: 9766 (mainnet), 8332/8333 (Bitcoin-style), 18332/18333 (testnet)</p>
                                </div>

                                <Button
                                    onClick={async () => {
                                        setCheckingPorts(true);
                                        setPortCheckResults([]);
                                        const ports = portCheckPorts.split(',').map(p => p.trim()).filter(p => p);
                                        const results = [];

                                        for (const port of ports) {
                                            try {
                                                const response = await base44.functions.invoke('checkPort', {
                                                    host: portCheckHost,
                                                    port
                                                });
                                                results.push(response.data);
                                            } catch (err) {
                                                results.push({
                                                    open: false,
                                                    host: portCheckHost,
                                                    port,
                                                    message: 'Failed to check port'
                                                });
                                            }
                                        }

                                        setPortCheckResults(results);
                                        setCheckingPorts(false);
                                    }}
                                    disabled={checkingPorts}
                                    className="w-full bg-amber-600 hover:bg-amber-700"
                                >
                                    {checkingPorts ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Checking Ports...
                                        </>
                                    ) : (
                                        <>
                                            <Activity className="w-4 h-4 mr-2" />
                                            Check Ports
                                        </>
                                    )}
                                </Button>

                                {portCheckResults.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        <Label className="text-slate-300">Results:</Label>
                                        <div className="space-y-2">
                                            {portCheckResults.map((result, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-lg border ${
                                                        result.open
                                                            ? 'bg-green-500/10 border-green-500/30'
                                                            : 'bg-red-500/10 border-red-500/30'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            {result.open ? (
                                                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                                            ) : (
                                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                                            )}
                                                            <div>
                                                                <p className="text-white font-mono text-sm">
                                                                    {result.host}:{result.port}
                                                                </p>
                                                                <p className={`text-xs ${result.open ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {result.message}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge className={result.open ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}>
                                                            {result.open ? 'OPEN' : 'CLOSED'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

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
                                    placeholder="9766, 8332, 8333"
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

                    {/* FreeRPC.com Setup Guide */}
                    {showFreeRPCGuide && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 space-y-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Server className="w-5 h-5 text-blue-400" />
                                <h4 className="text-white font-medium">FreeRPC.com Setup Guide</h4>
                            </div>

                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <AlertCircle className="h-4 w-4 text-blue-400" />
                                <AlertDescription className="text-blue-300/80 text-sm">
                                    FreeRPC.com provides free RPC proxy services for ROD Core. Follow these steps to set it up.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-4">
                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                    <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">1</span>
                                        Visit FreeRPC.com
                                    </h5>
                                    <p className="text-slate-300 text-sm mb-2">
                                        Go to <a href="https://freerpc.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">https://freerpc.com</a> and create an account or log in.
                                    </p>
                                </div>

                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                    <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">2</span>
                                        Create a New RPC Endpoint
                                    </h5>
                                    <div className="space-y-2 text-sm text-slate-300">
                                        <p>In your FreeRPC.com dashboard:</p>
                                        <ul className="list-disc list-inside space-y-1 ml-4">
                                            <li>Click "Add New Endpoint" or "Create RPC"</li>
                                            <li>Select <strong className="text-white">ROD Core</strong> as the blockchain</li>
                                            <li>Choose a plan (Free tier available)</li>
                                            <li>Give it a name (e.g., "My ROD Wallet")</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                    <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">3</span>
                                        Copy Your RPC Credentials
                                    </h5>
                                    <div className="space-y-2 text-sm text-slate-300">
                                        <p>After creating the endpoint, FreeRPC.com will provide you with:</p>
                                        <div className="mt-2 p-3 bg-slate-900 rounded border border-slate-700 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500 w-20">URL:</span>
                                                <code className="text-amber-400">https://rod.freerpc.com</code>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500 w-20">Port:</span>
                                                <code className="text-amber-400">443</code>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500 w-20">API Key:</span>
                                                <code className="text-amber-400">your_api_key_here</code>
                                            </div>
                                        </div>
                                        <p className="text-amber-400 text-xs mt-2">⚠️ Keep your API key secure and don't share it publicly</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30">
                                    <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm">4</span>
                                        Add to Your Wallet
                                    </h5>
                                    <div className="space-y-3">
                                        <p className="text-sm text-slate-300">Configure your FreeRPC connection directly below:</p>
                                        
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300 text-sm">Configuration Name</Label>
                                                <Input
                                                    value={formData.name || 'FreeRPC ROD'}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value, connection_type: 'api' })}
                                                    placeholder="FreeRPC ROD"
                                                    className="bg-slate-900 border-slate-600 text-white"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300 text-sm">Host</Label>
                                                    <Input
                                                        value={formData.host || 'rod.freerpc.com'}
                                                        onChange={(e) => setFormData({ ...formData, host: e.target.value, connection_type: 'api' })}
                                                        placeholder="rod.freerpc.com"
                                                        className="bg-slate-900 border-slate-600 text-white font-mono text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300 text-sm">Port</Label>
                                                    <Input
                                                        value={formData.port || '443'}
                                                        onChange={(e) => setFormData({ ...formData, port: e.target.value, connection_type: 'api' })}
                                                        placeholder="443"
                                                        className="bg-slate-900 border-slate-600 text-white"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-slate-300 text-sm">API Key (from FreeRPC.com)</Label>
                                                <Input
                                                    type="password"
                                                    value={formData.api_key || ''}
                                                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value, connection_type: 'api' })}
                                                    placeholder="Paste your FreeRPC API key here"
                                                    className="bg-slate-900 border-slate-600 text-white font-mono text-sm"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
                                                <Label className="text-slate-300 text-sm">Use SSL/TLS</Label>
                                                <Switch
                                                    checked={formData.use_ssl ?? true}
                                                    onCheckedChange={(checked) => setFormData({ ...formData, use_ssl: checked, connection_type: 'api' })}
                                                />
                                            </div>

                                            <Button
                                                onClick={handleSaveConfig}
                                                disabled={saving || !formData.api_key}
                                                className="w-full bg-green-600 hover:bg-green-700 h-11"
                                            >
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Saving & Testing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        Save & Test Connection
                                                    </>
                                                )}
                                            </Button>

                                            {!formData.api_key && (
                                                <Alert className="bg-amber-500/10 border-amber-500/30">
                                                    <AlertCircle className="h-4 w-4 text-amber-400" />
                                                    <AlertDescription className="text-amber-300/80 text-xs">
                                                        Please enter your API key from FreeRPC.com to continue
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Alert className="bg-amber-500/10 border-amber-500/30">
                                <AlertCircle className="h-4 w-4 text-amber-400" />
                                <AlertDescription className="text-amber-300/80 text-xs">
                                    <strong>Note:</strong> FreeRPC.com may have rate limits on free plans. Check their documentation for current limits and pricing.
                                </AlertDescription>
                            </Alert>
                            </motion.div>
                            )}

                            {/* GetBlock.io Setup */}
                            <GetBlockSetupGuide
                                account={account}
                                configs={configs}
                                onConfigsChanged={async () => await loadConfigurations()}
                            />

                            {/* RPC Endpoint Info */}
                    {showEndpointInfo && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 space-y-3"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Link className="w-5 h-5 text-green-400" />
                                <h4 className="text-white font-medium">RPC Endpoint URL</h4>
                            </div>

                            <Alert className="bg-green-500/10 border-green-500/30">
                                <AlertCircle className="h-4 w-4 text-green-400" />
                                <AlertDescription className="text-green-300/80 text-sm">
                                    Use this endpoint to connect to your wallet via RPC. Authentication is handled automatically using your session.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label className="text-slate-300 text-sm">Endpoint URL</Label>
                                <div className="relative group">
                                    <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm break-all border border-green-500/20">
                                        {window.location.origin}/functions/rpcProxy
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/functions/rpcProxy`);
                                            toast.success('Endpoint URL copied');
                                        }}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-slate-300 font-medium">Example: cURL Request</p>
                                <div className="relative group">
                                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-green-500/20">
{`curl -X POST ${window.location.origin}/functions/rpcProxy \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \\
  -d '{
    "jsonrpc": "1.0",
    "id": "test",
    "method": "getblockchaininfo",
    "params": []
  }'`}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`curl -X POST ${window.location.origin}/functions/rpcProxy \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \\\n  -d '{\n    "jsonrpc": "1.0",\n    "id": "test",\n    "method": "getblockchaininfo",\n    "params": []\n  }'`);
                                            toast.success('Example copied');
                                        }}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <AlertCircle className="h-4 w-4 text-blue-400" />
                                <AlertDescription className="text-blue-300/80 text-xs">
                                    <strong>How it works:</strong>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>The endpoint forwards your RPC requests to your active configuration</li>
                                        <li>Authentication is handled automatically using your logged-in session</li>
                                        <li>Supports all standard ROD Core RPC methods</li>
                                        <li>Works with RPC, Electrum, API, and cURL connection types</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <p className="text-sm text-slate-300 font-medium">Example: JavaScript/Node.js</p>
                                <div className="relative group">
                                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-green-500/20">
{`const response = await fetch('${window.location.origin}/functions/rpcProxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SESSION_TOKEN'
  },
  body: JSON.stringify({
    jsonrpc: '1.0',
    id: 'test',
    method: 'getblockchaininfo',
    params: []
  })
});

const data = await response.json();
console.log(data.result);`}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`const response = await fetch('${window.location.origin}/functions/rpcProxy', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer YOUR_SESSION_TOKEN'\n  },\n  body: JSON.stringify({\n    jsonrpc: '1.0',\n    id: 'test',\n    method: 'getblockchaininfo',\n    params: []\n  })\n});\n\nconst data = await response.json();\nconsole.log(data.result);`);
                                            toast.success('Example copied');
                                        }}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                            <Alert className="bg-amber-500/10 border-amber-500/30">
                                <AlertCircle className="h-4 w-4 text-amber-400" />
                                <AlertDescription className="text-amber-300/80 text-xs">
                                    <strong>Note:</strong> Replace <code className="text-amber-400">YOUR_SESSION_TOKEN</code> with your actual session token. You can find it in your browser's localStorage under the key <code className="text-amber-400">rod_wallet_session</code>.
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
                                <TabsList className="grid w-full grid-cols-4 bg-slate-800">
                                    <TabsTrigger value="rpc">RPC</TabsTrigger>
                                    <TabsTrigger value="electrum">Electrum</TabsTrigger>
                                    <TabsTrigger value="api">API Key</TabsTrigger>
                                    <TabsTrigger value="curl">cURL</TabsTrigger>
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
                                            Connect to ROD mainnet using your API key (simplest option). The connection will be routed through a secure proxy endpoint.
                                        </AlertDescription>
                                    </Alert>
                                </TabsContent>

                                <TabsContent value="curl" className="space-y-3 mt-3">
                                    <Alert className="bg-orange-500/10 border-orange-500/30">
                                        <AlertCircle className="h-4 w-4 text-orange-400" />
                                        <AlertDescription className="text-orange-300/80 text-xs">
                                            Paste your cURL command for custom RPC connections
                                        </AlertDescription>
                                    </Alert>
                                </TabsContent>
                                </Tabs>
                            
                            <div className="space-y-2">
                                <Label className="text-slate-300">Quick Setup - Paste Endpoint URL (Optional)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="https://go.getblock.io/abc123 or http://localhost:9650"
                                        className="bg-slate-900 border-slate-600 font-mono text-sm"
                                        onPaste={(e) => {
                                            const url = e.clipboardData.getData('text');
                                            try {
                                                const parsed = new URL(url);
                                                const isHttps = parsed.protocol === 'https:';
                                                const hasPath = parsed.pathname && parsed.pathname !== '/';
                                                const host = hasPath 
                                                    ? parsed.hostname + parsed.pathname.replace(/\/$/, '')
                                                    : parsed.hostname;
                                                // Only set port if explicitly provided, or if no path and no port (localhost case)
                                                const port = parsed.port || (hasPath ? '' : (isHttps ? '443' : '80'));
                                                
                                                // Determine connection type based on URL
                                                const hasAuth = parsed.username || parsed.password;
                                                const connectionType = hasAuth ? 'rpc' : 'api';
                                                
                                                setFormData({
                                                    ...formData,
                                                    host: host,
                                                    port: port,
                                                    use_ssl: isHttps,
                                                    connection_type: connectionType,
                                                    username: parsed.username || '',
                                                    password: parsed.password || '',
                                                    name: formData.name || `${parsed.hostname} Connection`
                                                });
                                                
                                                toast.success('URL parsed - no username/password needed');
                                                e.target.value = '';
                                            } catch (err) {
                                                toast.error('Invalid URL format');
                                            }
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Paste endpoint URL - credentials extracted automatically if present</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Configuration Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={
                                        formData.connection_type === 'curl' ? 'e.g., Custom cURL Connection' :
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
                                            '9766'
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
                            {formData.connection_type === 'curl' && (
                                <div className="space-y-2">
                                    <Label className="text-slate-300">cURL Command</Label>
                                    <Textarea
                                        value={formData.curl_command}
                                        onChange={(e) => setFormData({ ...formData, curl_command: e.target.value })}
                                        placeholder={`curl -X POST http://localhost:9650 \\\n  -H "Content-Type: application/json" \\\n  -u username:password \\\n  -d '{"jsonrpc":"1.0","id":"test","method":"getblockchaininfo","params":[]}'`}
                                        className="bg-slate-900 border-slate-600 font-mono text-xs min-h-[120px]"
                                    />
                                    <p className="text-xs text-slate-500">Paste your full cURL command including headers and authentication</p>
                                </div>
                            )}
                            {formData.connection_type === 'api' && (
                                <>
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
                                    <Alert className="bg-blue-500/10 border-blue-500/30">
                                        <AlertCircle className="h-4 w-4 text-blue-400" />
                                        <AlertDescription className="text-blue-300/80 text-xs">
                                            Connections will use the secure proxy endpoint: <code className="text-amber-400">/functions/rpcProxy</code>
                                        </AlertDescription>
                                    </Alert>
                                </>
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
                                            autoComplete="off"
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
                                            autoComplete="new-password"
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
                                    setFormData({ name: '', connection_type: 'rpc', host: 'localhost', port: '9766', username: '', password: '', api_key: '', curl_command: '', use_ssl: false });
                                }} variant="outline" className="border-slate-600">
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Configurations list */}
                    <RPCConfigList
                        configs={configs}
                        loading={loading}
                        testing={testing}
                        onEdit={handleEditConfig}
                        onTest={testConnection}
                        onDelete={deleteConfig}
                        onActivate={setActiveConfig}
                    />

                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300/80 text-sm">
                            Active configuration is used for all transactions. Use Save/Load buttons to backup and restore configurations (.json or .conf files).
                        </AlertDescription>
                    </Alert>
                    </div>
                    </DialogContent>
                    </Dialog>
                    </>
                    );
                    }