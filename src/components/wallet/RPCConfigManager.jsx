import React, { useState, useEffect } from 'react';
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
    RefreshCw, Activity, Server, Terminal, Copy, Upload, Download, Link, Settings, Shield, RotateCcw, Eye, EyeOff
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
    const [currentUser, setCurrentUser] = useState(null);
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
    const [portCheckPorts, setPortCheckPorts] = useState('443, 9766, 11999');
    const [portCheckResults, setPortCheckResults] = useState([]);
    const [checkingPorts, setCheckingPorts] = useState(false);
    const [showPortOpener, setShowPortOpener] = useState(false);
    const [portToOpen, setPortToOpen] = useState('9766');
    const [troubleshootingError, setTroubleshootingError] = useState(null);
    const [troubleshootingConfig, setTroubleshootingConfig] = useState(null);
    const [fixingProtocols, setFixingProtocols] = useState(false);
    const [scanConfig, setScanConfig] = useState({
        ports: '443, 9766, 11999',
        usernames: '__cookie__, roduser, rod',
        passwords: ', rodpassword, rod'
    });
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [advancedSettings, setAdvancedSettings] = useState({
        enable_listtransactions: true,
        enable_listreceivedbyaddress: true,
        enable_gettransaction: true,
        enable_sendtoaddress: true,
        enable_importaddress: true,
        custom_timeout: 30,
        max_connections: 10
    });

    const getWalletSessionPayload = () => {
        const savedSession = localStorage.getItem('rod_wallet_session');
        if (!savedSession) return {};
        try {
            const session = JSON.parse(savedSession);
            return {
                account_id: session.id,
                session_token: session.sessionToken
            };
        } catch (_error) {
            return {};
        }
    };

    useEffect(() => {
        const initUser = async () => {
            try {
                const user = await base44.auth.me();
                setCurrentUser(user);
            } catch (e) {
                console.error("Failed to get user", e);
            }
        };
        initUser();
        loadConfigurations();

        const saved = localStorage.getItem('rod_scan_config');
        if (saved) {
            try { setScanConfig(JSON.parse(saved)); } catch (e) {}
        }
        const savedAdvanced = localStorage.getItem('rod_advanced_rpc_settings');
        if (savedAdvanced) {
            try { setAdvancedSettings(JSON.parse(savedAdvanced)); } catch (e) {}
        }
    }, []);

    const loadConfigurations = async () => {
        try {
            const response = await base44.functions.invoke('manageRPCConfig', { action: 'list', ...getWalletSessionPayload() });
            setConfigs(response.data?.configs || []);
        } catch (err) {
            console.error('Failed to load RPC configs:', err);
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async (config) => { /* ... keep your original testConnection function ... */ };
    const setActiveConfig = async (config) => { /* ... keep original ... */ };
    const deleteConfig = async (config) => { /* ... keep original ... */ };
    const parseConfigFile = (fileContent) => { /* ... keep original ... */ };
    const handleImportConfig = async (event) => { /* ... keep original ... */ };
    const handleExportConfigs = () => { /* ... keep original ... */ };
    const autoDetectLocal = async () => { /* ... keep original ... */ };
    const isAdminConfig = (config) => config.name?.endsWith('(Default)') || config.name === 'ROD Core (from secrets)';
    const handleEditConfig = (config) => { /* ... keep original ... */ };
    const validateAndTestConnection = async () => { /* ... keep original ... */ };

    const handleSaveConfig = async () => {
        setSaving(true);
        const isValid = await validateAndTestConnection();
        if (!isValid) {
            setSaving(false);
            return;
        }

        try {
            let cleanedHost = formData.host.replace(/^https?:\/\//gi, '').replace(/\/+$/, '');
            while (cleanedHost.match(/^https?:\/\//i)) {
                cleanedHost = cleanedHost.replace(/^https?:\/\//i, '');
            }

            if (editingConfig) {
                const updateData = {
                    name: formData.name,
                    connection_type: formData.connection_type,
                    host: cleanedHost,
                    port: formData.port,
                    username: formData.username || '',
                    password: formData.password || '',
                    api_key: formData.api_key || '',
                    curl_command: formData.curl_command || '',
                    use_ssl: formData.use_ssl,
                    connection_status: 'untested'
                };

                await base44.functions.invoke('manageRPCConfig', {
                    action: 'update',
                    ...getWalletSessionPayload(),
                    config_id: editingConfig.id,
                    config: updateData
                });
                toast.success('Configuration updated');
            } else {
                const createResponse = await base44.functions.invoke('manageRPCConfig', {
                    action: 'create',
                    ...getWalletSessionPayload(),
                    config: {
                        name: formData.name,
                        connection_type: formData.connection_type,
                        host: cleanedHost,
                        port: formData.port,
                        username: formData.username || '',
                        password: formData.password || '',
                        api_key: formData.api_key || '',
                        curl_command: formData.curl_command || '',
                        use_ssl: formData.use_ssl,
                        is_active: configs.length === 0,
                        connection_status: 'untested'
                    }
                });
                toast.success('Configuration added');
                if (createResponse.data?.config) {
                    setTimeout(() => testConnection(createResponse.data.config), 500);
                }
            }

            setFormData({
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
            setEditingConfig(null);
            setShowAddForm(false);
            await loadConfigurations();
        } catch (err) {
            toast.error(editingConfig ? 'Failed to update' : 'Failed to add');
        } finally {
            setSaving(false);
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
                        if (troubleshootingConfig) testConnection(troubleshootingConfig);
                    }}
                    onClose={() => {
                        setTroubleshootingError(null);
                        setTroubleshootingConfig(null);
                    }}
                />
            )}

            <Dialog open onOpenChange={onClose}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-[95vw] md:max-w-5xl max-h-[80vh] overflow-y-auto">
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

                    {/* All your UI elements (buttons, forms, tabs, etc.) go here */}
                    {/* Paste the rest of your original JSX from the <div className="space-y-4"> down if you want, but the critical fixes are already applied above. */}

                    <RPCConfigList
                        configs={configs}
                        loading={loading}
                        testing={testing}
                        onEdit={handleEditConfig}
                        onTest={testConnection}
                        onDelete={deleteConfig}
                        onActivate={setActiveConfig}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}