import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Plus, Copy, CheckCircle2, RefreshCw, 
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
            toast.success('Wallet generated! Click "Save as Wallet".');
        } catch (error) {
            toast.error(error?.response?.data?.error || error?.message || 'Failed to generate wallet');
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveWallet = (addr) => {
        // Force acknowledgment
        setAddresses(items => items.map(item => 
            item.id === addr.id ? { ...item, privateKeyViewed: true, privateKeyAcknowledged: true } : item
        ));
        setSelectedAddressToSave(addr);
    };

    return (
        <div className="space-y-6 pb-28">
            <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            Spendable Wallet Generator
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                            Generate spendable ROD Core wallets with node-exported WIF private keys
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        <Input
                            type="password"
                            value={nodePassphrase}
                            onChange={(e) => setNodePassphrase(e.target.value)}
                            placeholder="Node passphrase if locked"
                            className="w-56 bg-slate-800/50 border-slate-700 text-white"
                        />
                        <Button
                            onClick={generateAddress}
                            disabled={generating}
                            className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 whitespace-nowrap"
                        >
                            {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Generate Spendable Wallet
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <AnimatePresence>
                        {addresses.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                                <Key className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                                <p className="text-slate-500">No wallets generated yet</p>
                                <p className="text-sm text-slate-600 mt-1">Click the button above to create one</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                {addresses.map((addr) => (
                                    <motion.div key={addr.id} className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700">
                                        <div className="font-mono text-amber-400 break-all mb-3">{addr.address}</div>
                                        
                                        <Button
                                            onClick={() => handleSaveWallet(addr)}
                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            Save as Wallet
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>

            {selectedAddressToSave && (
                <SaveAddressAsWallet
                    address={selectedAddressToSave}
                    account={account}
                    onClose={() => setSelectedAddressToSave(null)}
                    onSaved={(wallet) => {
                        setSelectedAddressToSave(null);
                        if (onAddressGenerated) onAddressGenerated(wallet);
                    }}
                />
            )}
        </div>
    );
}