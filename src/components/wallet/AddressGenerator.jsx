import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Plus, Copy, CheckCircle2, RefreshCw, QrCode, 
    Shield, Key, Sparkles, Download, Clock, AlertCircle, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateRODAddress } from './Base58';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import SaveAddressAsWallet from './SaveAddressAsWallet';

export default function AddressGenerator({ onAddressGenerated, account }) {
    const [addresses, setAddresses] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [nodePassphrase, setNodePassphrase] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [showPrivateKeys, setShowPrivateKeys] = useState(false);
    const [selectedAddressToSave, setSelectedAddressToSave] = useState(null);

    const generateAddress = async () => {
        setGenerating(true);
        try {
            const label = `Address ${addresses.length + 1}`;
            const response = await base44.functions.invoke('createSpendableSignupWallet', {
                label,
                passphrase: nodePassphrase.trim() || undefined
            });
            const { address, wif } = response.data;
            const validation = await validateRODAddress(address);
            
            const newAddress = {
                id: Date.now(),
                address,
                publicKeyHash: address,
                privateKey: wif,
                privateKeyViewed: false,
                privateKeyAcknowledged: false,
                isValid: validation.valid,
                createdAt: new Date().toISOString(),
                label,
                importStatus: 'pending'
            };

            setAddresses(prev => [newAddress, ...prev]);

            toast.success('Spendable ROD wallet generated. View and acknowledge the private key before saving.');
        } catch (error) {
            toast.error(error?.response?.data?.error || error?.message || 'Failed to generate spendable wallet');
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

    const downloadPrivateKeyTxt = (addr) => {
        const content = `ROD Wallet Private Key Backup\n\nAddress: ${addr.address}\nPrivate Key (WIF): ${addr.privateKey}\nCreated: ${new Date(addr.createdAt).toLocaleString()}\n\nKeep this file private. Anyone with this key can spend funds from this wallet.`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rod-private-key-${addr.address.slice(0, 8)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Private key TXT downloaded');
    };

    const exportAddresses = () => {
        if (addresses.some((addr) => !addr.privateKeyViewed || !addr.privateKeyAcknowledged)) {
            toast.error('View and acknowledge every private key before exporting.');
            return;
        }

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

    const handleShowPrivateKeys = () => {
        setShowPrivateKeys((current) => {
            const next = !current;
            if (next) {
                setAddresses((items) => items.map((item) => ({ ...item, privateKeyViewed: true })));
            }
            return next;
        });
    };

    const setAddressAcknowledged = (addressId, checked) => {
        setAddresses((items) => items.map((item) => item.id === addressId ? { ...item, privateKeyAcknowledged: checked } : item));
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            Spendable Wallet Generator
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                            Generate spendable ROD Core wallets with node-exported WIF private keys
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            type="password"
                            value={nodePassphrase}
                            onChange={(e) => setNodePassphrase(e.target.value)}
                            placeholder="Node passphrase if locked"
                            className="w-56 bg-slate-800/50 border-slate-700 text-white"
                        />
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
                            Generate Spendable Wallet
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
                                <p className="text-slate-500">No spendable wallets generated yet</p>
                                <p className="text-sm text-slate-600 mt-1">Click "Generate Spendable Wallet" to create your first ROD Core wallet</p>
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
                                        onClick={handleShowPrivateKeys}
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
                                                <div className="flex items-center gap-2 mb-4">
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
                                                            <div className="flex flex-col sm:flex-row gap-2 shrink-0 mt-4">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => copyToClipboard(addr.privateKey, `pk-${addr.id}`)}
                                                                    className="text-slate-400 hover:text-white"
                                                                    title="Copy private key"
                                                                >
                                                                    {copiedId === `pk-${addr.id}` ? (
                                                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                                    ) : (
                                                                        <Copy className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => downloadPrivateKeyTxt(addr)}
                                                                    className="border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:text-white"
                                                                >
                                                                    <Download className="w-4 h-4 mr-2" />
                                                                    TXT
                                                                </Button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>
                                                
                                                <p className="text-xs text-slate-500 mt-2">
                                                    Created {new Date(addr.createdAt).toLocaleString()}
                                                </p>
                                                {showPrivateKeys && (
                                                    <label className="mt-3 flex items-start gap-2 text-xs text-red-100 cursor-pointer rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={addr.privateKeyAcknowledged || false}
                                                            onChange={(e) => setAddressAcknowledged(addr.id, e.target.checked)}
                                                            className="mt-0.5 accent-red-500"
                                                        />
                                                        <span>I viewed and saved this private key securely and understand app storage is insecure.</span>
                                                    </label>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        if (!addr.privateKeyViewed || !addr.privateKeyAcknowledged) {
                                                            toast.error('Show, save, and acknowledge this private key before saving the wallet.');
                                                            setShowPrivateKeys(true);
                                                            setAddresses((items) => items.map((item) => item.id === addr.id ? { ...item, privateKeyViewed: true } : item));
                                                            return;
                                                        }
                                                        setSelectedAddressToSave(addr);
                                                    }}
                                                    className={`mt-3 bg-blue-600 hover:bg-blue-700 ${(!addr.privateKeyViewed || !addr.privateKeyAcknowledged) ? 'opacity-60' : ''}`}
                                                >
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Save as Wallet
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
            
            {/* Save Address as Wallet Modal */}
            {selectedAddressToSave && (
                <SaveAddressAsWallet
                    address={selectedAddressToSave}
                    account={account}
                    onClose={() => setSelectedAddressToSave(null)}
                    onSaved={(wallet) => {
                        setSelectedAddressToSave(null);
                        if (onAddressGenerated) {
                            // Trigger parent refresh
                            window.dispatchEvent(new CustomEvent('walletCreated', { detail: wallet }));
                        }
                    }}
                />
            )}
            
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
                                New wallets are generated by ROD Core via RPC, so every address has a matching spendable WIF private key.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}