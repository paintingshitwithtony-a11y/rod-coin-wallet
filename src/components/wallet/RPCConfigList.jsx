import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Wifi, WifiOff, AlertCircle, Activity, Edit, RefreshCw, Trash2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const isAdminConfig = (config) =>
    config.name?.endsWith('(Default)') || config.name === 'ROD Core (from secrets)';

const getStatusIcon = (status) => {
    switch (status) {
        case 'connected': return <Wifi className="w-4 h-4 text-green-400" />;
        case 'disconnected': return <WifiOff className="w-4 h-4 text-red-400" />;
        case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
        default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
};

const getStatusColor = (status) => {
    switch (status) {
        case 'connected': return 'border-green-500/50 bg-green-500/10';
        case 'disconnected': return 'border-red-500/50 bg-red-500/10';
        case 'error': return 'border-red-500/50 bg-red-500/10';
        default: return 'border-slate-700/50 bg-slate-800/50';
    }
};

export default function RPCConfigList({ configs, loading, testing, onEdit, onTest, onDelete, onActivate }) {
    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (configs.length === 0) {
        return (
            <Alert className="bg-slate-800/50 border-slate-700">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                <AlertDescription className="text-slate-400">
                    No RPC configurations yet. Add one to connect to a ROD Core node.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-2">
            {configs.map((config) => {
                const adminConfig = isAdminConfig(config);
                return (
                    <motion.div
                        key={config.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => !config.is_active && onActivate(config)}
                        className={`p-4 rounded-lg border transition-all ${getStatusColor(config.connection_status)} ${
                            !config.is_active ? 'cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/70' : ''
                        }`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1">
                                {getStatusIcon(config.connection_status)}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium text-white">{config.name}</h4>
                                        {adminConfig && (
                                            <Badge variant="outline" className="text-xs border-slate-500/50 text-slate-400 gap-1">
                                                <Lock className="w-2.5 h-2.5" /> Admin
                                            </Badge>
                                        )}
                                        {config.connection_type === 'electrum' && (
                                            <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">Electrum</Badge>
                                        )}
                                        {config.connection_type === 'api' && (
                                            <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">API</Badge>
                                        )}
                                        {config.connection_type === 'curl' && (
                                            <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-400">cURL</Badge>
                                        )}
                                        {config.is_active && (
                                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">Active</Badge>
                                        )}
                                        {!config.is_active && !adminConfig && (
                                            <span className="text-xs text-slate-500">Click to activate</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono">
                                        {config.use_ssl ? 'https://' : 'http://'}{config.host}:{config.port}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                                {!adminConfig && (
                                    <Button size="icon" variant="ghost" onClick={() => onEdit(config)} className="text-slate-400 hover:text-blue-400">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                )}
                                <Button size="icon" variant="ghost" onClick={() => onTest(config)} disabled={testing[config.id]} className="text-slate-400 hover:text-white">
                                    {testing[config.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                </Button>
                                {!adminConfig && (
                                    <Button size="icon" variant="ghost" onClick={() => onDelete(config)} disabled={config.is_active} className="text-red-400 hover:text-red-300 disabled:opacity-30">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
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
                );
            })}
        </div>
    );
}