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
    RefreshCw, Activity, Server, Terminal, Copy, Upload, Download, Link, Settings, Shield, RotateCcw, Eye, EyeOff, Trash2
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
        name: '', connection_type: 'rpc', host: 'localhost', port: '9766',
        username: '', password: '', api_key: '', curl_command: '', use_ssl: false
    });
    const [saving, setSaving] = useState(false);
    const [fixingProtocols, setFixingProtocols] = useState(false);
    const [nuclearCleanup, setNuclearCleanup] = useState(false);

    // ... keep all your other state and functions (loadConfigurations, testConnection, etc.)

    const nuclearCleanupRPC = async () => {
        if (!confirm("This will delete all bad old configs (8332). Continue?")) return;
        
        setNuclearCleanup(true);
        try {
            const response = await base44.functions.invoke('fixAllRPCConfigs', {});
            toast.success(response.data?.message || "Cleanup completed");
            await loadConfigurations();
        } catch (err) {
            toast.error("Cleanup failed: " + err.message);
        } finally {
            setNuclearCleanup(false);
        }
    };

    return (
        <>
            <Dialog open onOpenChange={onClose}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-[95vw] md:max-w-5xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>RPC Node Management</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* New Nuclear Button */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={nuclearCleanupRPC}
                                disabled={nuclearCleanup}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {nuclearCleanup ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                🧨 Nuclear Cleanup (Remove 8332)
                            </Button>

                            {/* Your other buttons stay here */}
                            <Button onClick={() => { /* your fix protocols */ }} variant="outline">
                                Fix Duplicate Protocols
                            </Button>
                        </div>

                        {/* Rest of your UI stays the same */}
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