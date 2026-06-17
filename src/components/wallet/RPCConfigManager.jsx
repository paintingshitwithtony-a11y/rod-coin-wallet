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
    // ... (all your state variables stay the same - I kept them short for space)
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [testing, setTesting] = useState({});
    const [editingConfig, setEditingConfig] = useState(null);
    const [formData, setFormData] = useState({
        name: '', connection_type: 'rpc', host: 'localhost', port: '9766',
        username: '', password: '', api_key: '', curl_command: '', use_ssl: false
    });
    const [saving, setSaving] = useState(false);
    const [fixingProtocols, setFixingProtocols] = useState(false);
    // ... other states (portCheckPorts, scanConfig, etc.) remain the same

    // ... (keep all your existing functions: loadConfigurations, testConnection, etc.)

    // Add this function if it's missing
    const fixProtocols = async () => {
        setFixingProtocols(true);
        try {
            const response = await base44.functions.invoke('fixAllRPCConfigs', {});
            const fixed = response.data?.fixed ?? 0;
            const msg = fixed > 0 
                ? `Fixed ${fixed} configuration(s) - old Bitcoin ports removed` 
                : 'No issues found';
            toast.success(msg);
            await loadConfigurations();
        } catch (err) {
            toast.error('Fix failed: ' + (err?.message || 'Unknown error'));
        } finally {
            setFixingProtocols(false);
        }
    };

    return (
        <>
            {/* ... your troubleshooting dialog ... */}

            <Dialog open onOpenChange={onClose}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-[95vw] md:max-w-5xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <Server className="w-6 h-6 text-purple-400" />
                                    RPC Node Management
                                </DialogTitle>
                                <DialogDescription>Manage ROD Core RPC connections</DialogDescription>
                            </div>
                            {configs.some(c => c.connection_status === 'connected') && (
                                <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Buttons Row - Fix Protocols is now clearly here */}
                        <div className="flex flex-wrap gap-2">
                            {/* ... your other buttons ... */}

                            <Button
                                onClick={fixProtocols}
                                disabled={fixingProtocols}
                                variant="outline"
                                className="border-amber-600 text-amber-400 hover:bg-amber-600/10"
                            >
                                {fixingProtocols ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                )}
                                {fixingProtocols ? 'Fixing...' : '🔧 Fix Protocols'}
                            </Button>

                            {/* Other buttons like Use ROD Secrets, Auto-Detect, etc. */}
                        </div>

                        {/* Rest of your UI (Add form, Port Checker, etc.) stays the same */}

                        <RPCConfigList
                            configs={configs}
                            loading={loading}
                            testing={testing}
                            onEdit={handleEditConfig}
                            onTest={testConnection}
                            onDelete={deleteConfig}
                            onActivate={setActiveConfig}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}