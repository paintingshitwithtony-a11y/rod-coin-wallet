import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
    FileSearch, Upload, Download, Save, FolderOpen, 
    CheckCircle2, AlertCircle, Info, Edit, X
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function RODConfEditor({ account, onClose }) {
    const [confPath, setConfPath] = useState('');
    const [confContent, setConfContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [savedPath, setSavedPath] = useState(null);
    const [parsedConfig, setParsedConfig] = useState({});

    useEffect(() => {
        loadSavedPath();
    }, []);

    const loadSavedPath = async () => {
        try {
            const accounts = await base44.entities.WalletAccount.filter({ id: account.id });
            if (accounts.length > 0 && accounts[0].rod_conf_path) {
                setSavedPath(accounts[0].rod_conf_path);
                setConfPath(accounts[0].rod_conf_path);
            }
        } catch (err) {
            console.error('Failed to load saved path:', err);
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const content = await file.text();
            setConfContent(content);
            parseConfig(content);
            setIsEditing(true);
            toast.success('rod.conf file loaded');
        } catch (err) {
            toast.error('Failed to read file: ' + err.message);
        }
    };

    const parseConfig = (content) => {
        const config = {};
        const lines = content.split('\n');
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    config[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        
        setParsedConfig(config);
    };

    const updateConfigValue = (key, value) => {
        setParsedConfig(prev => ({ ...prev, [key]: value }));
        
        // Update content
        const lines = confContent.split('\n');
        let updated = false;
        
        const newLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith(key + '=')) {
                updated = true;
                return `${key}=${value}`;
            }
            return line;
        });
        
        if (!updated) {
            newLines.push(`${key}=${value}`);
        }
        
        setConfContent(newLines.join('\n'));
    };

    const handleSavePath = async () => {
        if (!confPath.trim()) {
            toast.error('Please enter a file path');
            return;
        }

        try {
            await base44.entities.WalletAccount.update(account.id, {
                rod_conf_path: confPath
            });
            setSavedPath(confPath);
            toast.success('File path saved for future reference');
        } catch (err) {
            toast.error('Failed to save path: ' + err.message);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([confContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rod.conf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('rod.conf downloaded');
    };

    const getCommonPaths = () => {
        const os = navigator.platform.toLowerCase();
        if (os.includes('win')) {
            return [
                '%APPDATA%\\ROD\\rod.conf',
                'C:\\Users\\YourUsername\\AppData\\Roaming\\ROD\\rod.conf'
            ];
        } else if (os.includes('mac')) {
            return [
                '~/Library/Application Support/ROD/rod.conf',
                '/Users/YourUsername/Library/Application Support/ROD/rod.conf'
            ];
        } else {
            return [
                '~/.rod/rod.conf',
                '/home/YourUsername/.rod/rod.conf'
            ];
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl bg-slate-950 border-slate-700 max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <FileSearch className="w-5 h-5 text-purple-400" />
                        ROD Core Config Editor
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* File Path Section */}
                    <div className="space-y-3">
                        <Label className="text-white">Config File Location</Label>
                        <div className="flex gap-2">
                            <Input
                                value={confPath}
                                onChange={(e) => setConfPath(e.target.value)}
                                placeholder="Enter path to rod.conf"
                                className="bg-slate-900 border-slate-700 text-white flex-1"
                            />
                            <Button
                                onClick={handleSavePath}
                                variant="outline"
                                className="border-purple-500/50 text-purple-400">
                                <Save className="w-4 h-4 mr-2" />
                                Save Path
                            </Button>
                        </div>
                        {savedPath && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Saved: {savedPath}
                            </Badge>
                        )}
                    </div>

                    {/* Common Paths */}
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <Info className="w-4 h-4 text-blue-400" />
                        <AlertDescription className="text-blue-300">
                            <strong className="block mb-2">Common locations:</strong>
                            <div className="space-y-1 text-sm">
                                {getCommonPaths().map((path, i) => (
                                    <div key={i} className="font-mono text-blue-400">{path}</div>
                                ))}
                            </div>
                        </AlertDescription>
                    </Alert>

                    {/* File Upload */}
                    <div className="space-y-3">
                        <Label className="text-white">Load Existing Config</Label>
                        <div className="flex items-center gap-3">
                            <label className="flex-1">
                                <input
                                    type="file"
                                    accept=".conf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-input"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-slate-700 text-slate-300"
                                    onClick={() => document.getElementById('file-input').click()}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Browse & Load rod.conf
                                </Button>
                            </label>
                        </div>
                    </div>

                    {/* Editor */}
                    {isEditing && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-white">Quick Edit Mode</Label>
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                                    <Edit className="w-3 h-3 mr-1" />
                                    Editing
                                </Badge>
                            </div>

                            {/* Key Config Fields */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label className="text-slate-300">RPC User</Label>
                                    <Input
                                        value={parsedConfig.rpcuser || ''}
                                        onChange={(e) => updateConfigValue('rpcuser', e.target.value)}
                                        className="bg-slate-900 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-300">RPC Password</Label>
                                    <Input
                                        value={parsedConfig.rpcpassword || ''}
                                        onChange={(e) => updateConfigValue('rpcpassword', e.target.value)}
                                        type="password"
                                        className="bg-slate-900 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-300">RPC Port</Label>
                                    <Input
                                        value={parsedConfig.rpcport || '9766'}
                                        onChange={(e) => updateConfigValue('rpcport', e.target.value)}
                                        className="bg-slate-900 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-300">RPC Bind</Label>
                                    <Input
                                        value={parsedConfig.rpcbind || '127.0.0.1'}
                                        onChange={(e) => updateConfigValue('rpcbind', e.target.value)}
                                        className="bg-slate-900 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-300">RPC Allow IP</Label>
                                    <Input
                                        value={parsedConfig.rpcallowip || '127.0.0.1'}
                                        onChange={(e) => updateConfigValue('rpcallowip', e.target.value)}
                                        className="bg-slate-900 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-300">Server</Label>
                                    <select
                                        value={parsedConfig.server || '1'}
                                        onChange={(e) => updateConfigValue('server', e.target.value)}
                                        className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-white">
                                        <option value="1">Enabled</option>
                                        <option value="0">Disabled</option>
                                    </select>
                                </div>
                            </div>

                            {/* Raw Editor */}
                            <div className="space-y-2">
                                <Label className="text-white">Advanced: Edit Raw Config</Label>
                                <Textarea
                                    value={confContent}
                                    onChange={(e) => {
                                        setConfContent(e.target.value);
                                        parseConfig(e.target.value);
                                    }}
                                    className="bg-slate-900 border-slate-700 text-white font-mono text-sm min-h-[300px]"
                                    placeholder="# ROD Core Configuration File"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleDownload}
                                    className="bg-purple-600 hover:bg-purple-700">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Updated Config
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setConfContent('');
                                        setParsedConfig({});
                                        toast.info('Editor closed');
                                    }}
                                    variant="outline"
                                    className="border-slate-700">
                                    Clear
                                </Button>
                            </div>

                            <Alert className="bg-amber-500/10 border-amber-500/30">
                                <AlertCircle className="w-4 h-4 text-amber-400" />
                                <AlertDescription className="text-amber-300 text-sm">
                                    <strong>Important:</strong> After downloading, manually place the file at: <span className="font-mono text-amber-400">{savedPath || 'your rod.conf location'}</span>
                                    <br />Then restart ROD Core for changes to take effect.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}