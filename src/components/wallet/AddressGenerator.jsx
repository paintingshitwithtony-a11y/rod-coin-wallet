import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Plus, Copy, CheckCircle2, RefreshCw, QrCode, 
    Shield, Key, Sparkles, Download, Clock, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateNewRODAddress, validateRODAddress, generatePrivateKey } from './Base58';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AddressGenerator({ onAddressGenerated }) {
    const [addresses, setAddresses] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [showPrivateKeys, setShowPrivateKeys] = useState(false);

    const generateAddress = async () => {
        setGenerating(true);
        try {
            const { address, publicKeyHash } = await generateNewRODAddress();
            const privateKey = generatePrivateKey();
            
            // Validate the generated address
            const validation = await validateRODAddress(address);
            
            const newAddress = {
                id: Date.now(),
                address,
                publicKeyHash,
                privateKey,
                isValid: validation.valid,
                createdAt: new Date().toISOString(),
                label: `Address ${addresses.length + 1}`,
                importStatus: 'pending'
            };

            setAddresses(prev => [newAddress, ...prev]);

            // Save to account (will persist and auto-import on next check)
            if (onAddressGenerated) {
                onAddressGenerated(newAddress);
            }

            // Import address into ROD Core node so it can track transactions
            try {
                const result = await base44.functions.invoke('importAddress', {
                    address,
                    label: newAddress.label
                });

                if (result.data.success) {
                    newAddress.importStatus = 'imported';
                    setAddresses(prev => prev.map(a => 
                        a.address === address ? { ...a, importStatus: 'imported' } : a
                    ));
                    toast.success('Address generated and imported to blockchain');
                } else {
                    newAddress.importStatus = 'failed';
                    setAddresses(prev => prev.map(a => 
                        a.address === address ? { ...a, importStatus: 'failed' } : a
                    ));
                    toast.warning('Address generated but import failed', {
                        description: result.data.message || 'Check RPC connection'
                    });
                }
            } catch (importError) {
                newAddress.importStatus = 'pending';
                toast.warning('Address saved - RPC import pending', {
                    description: 'Will auto-import when connected'
                });
            }
        } catch (error) {
            toast.error('Failed to generate address');
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = async (text, id) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const exportAddresses = () => {
        const exportData = addresses.map(addr => ({
            address: addr.address,
            privateKey: addr.privateKey,
            createdAt: addr.createdAt
        }));
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rod-addresses-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Addresses exported');
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            Address Generator
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                            Generate valid ROD Core wallet addresses (Base58Check encoded)
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {addresses.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportAddresses}
                                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        )}
                        <Button
                            onClick={generateAddress}
                            disabled={generating}
                            className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                        >
                            {generating ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            Generate Address
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <AnimatePresence>
                        {addresses.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                                    <Key className="w-10 h-10 text-slate-600" />
                                </div>
                                <p className="text-slate-500">No addresses generated yet</p>
                                <p className="text-sm text-slate-600 mt-1">Click "Generate Address" to create your first ROD address</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-slate-400">
                                        {addresses.length} address{addresses.length !== 1 ? 'es' : ''} generated
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowPrivateKeys(!showPrivateKeys)}
                                        className="text-slate-400 hover:text-slate-300"
                                    >
                                        <Shield className="w-4 h-4 mr-2" />
                                        {showPrivateKeys ? 'Hide' : 'Show'} Private Keys
                                    </Button>
                                </div>
                                
                                {addresses.map((addr, index) => (
                                    <motion.div
                                        key={addr.id}
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-medium text-slate-300">{addr.label}</span>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={addr.isValid ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}
                                                    >
                                                        {addr.isValid ? (
                                                            <>
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Valid
                                                            </>
                                                        ) : 'Invalid'}
                                                    </Badge>
                                                    {addr.importStatus === 'imported' && (
                                                        <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Imported
                                                        </Badge>
                                                    )}
                                                    {addr.importStatus === 'pending' && (
                                                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Pending Import
                                                        </Badge>
                                                    )}
                                                    {addr.importStatus === 'failed' && (
                                                        <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">
                                                            <AlertCircle className="w-3 h-3 mr-1" />
                                                            Import Failed
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-slate-500">
                                                        {addr.address.length} chars
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <code className="flex-1 text-sm text-amber-400 bg-slate-900/50 px-3 py-2 rounded-lg font-mono break-all">
                                                            {addr.address}
                                                        </code>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => copyToClipboard(addr.address, `addr-${addr.id}`)}
                                                            className="shrink-0 text-slate-400 hover:text-white"
                                                        >
                                                            {copiedId === `addr-${addr.id}` ? (
                                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                            ) : (
                                                                <Copy className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                    
                                                    {showPrivateKeys && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <div className="flex-1">
                                                                <span className="text-xs text-slate-500 mb-1 block">Private Key</span>
                                                                <code className="text-xs text-red-400/80 bg-slate-900/50 px-3 py-2 rounded-lg font-mono break-all block">
                                                                    {addr.privateKey}
                                                                </code>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => copyToClipboard(addr.privateKey, `pk-${addr.id}`)}
                                                                className="shrink-0 text-slate-400 hover:text-white mt-4"
                                                            >
                                                                {copiedId === `pk-${addr.id}` ? (
                                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                                ) : (
                                                                    <Copy className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </motion.div>
                                                    )}
                                                </div>
                                                
                                                <p className="text-xs text-slate-500 mt-2">
                                                    Created {new Date(addr.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
            
            {/* Info Card */}
            <Card className="bg-slate-900/40 border-slate-700/50">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-1">Address Format</h4>
                            <p className="text-xs text-slate-500">
                                ROD addresses use Base58Check encoding with version byte 0x3C (60). 
                                Valid addresses are 26-35 characters, start with 'R', and include a 4-byte checksum.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}