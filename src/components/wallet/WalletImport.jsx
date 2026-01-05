import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    Wallet, Plus, CheckCircle2, AlertCircle, 
    Loader2, Download, Key
} from 'lucide-react';
import { motion } from 'framer-motion';
import { validateRODAddress } from './Base58';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function WalletImport({ account, onWalletImported }) {
    const [address, setAddress] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [label, setLabel] = useState('');
    const [validating, setValidating] = useState(false);
    const [addressValid, setAddressValid] = useState(null);
    const [importing, setImporting] = useState(false);

    const validateAddress = async (addr) => {
        if (!addr || addr.length < 26) {
            setAddressValid(null);
            return;
        }
        
        setValidating(true);
        const result = await validateRODAddress(addr);
        setAddressValid(result.valid);
        setValidating(false);
        
        if (!result.valid) {
            toast.error(`Invalid address: ${result.error}`);
        }
    };

    const handleImport = async () => {
        if (!addressValid) {
            toast.error('Please enter a valid ROD address');
            return;
        }

        if (!label.trim()) {
            toast.error('Please enter a label for this wallet');
            return;
        }

        setImporting(true);
        try {
            // Get current account data
            const accounts = await base44.entities.WalletAccount.filter({ id: account.id });
            if (accounts.length === 0) {
                toast.error('Account not found');
                return;
            }

            const currentAccount = accounts[0];
            const additionalAddresses = currentAccount.additional_addresses || [];

            // Check if address already exists
            if (currentAccount.wallet_address === address) {
                toast.error('This is your primary address');
                setImporting(false);
                return;
            }

            if (additionalAddresses.some(addr => addr.address === address)) {
                toast.error('This address is already added');
                setImporting(false);
                return;
            }

            // Add new address
            const newAddress = {
                address: address,
                public_key_hash: '',
                label: label.trim(),
                created_at: new Date().toISOString(),
                private_key: privateKey.trim() || null,
                imported: true
            };

            additionalAddresses.push(newAddress);

            // Update account
            await base44.entities.WalletAccount.update(account.id, {
                additional_addresses: additionalAddresses
            });

            toast.success(`Wallet "${label}" imported successfully!`);
            
            // Reset form
            setAddress('');
            setPrivateKey('');
            setLabel('');
            setAddressValid(null);

            if (onWalletImported) {
                onWalletImported(newAddress);
            }
        } catch (error) {
            toast.error('Failed to import wallet');
            console.error(error);
        } finally {
            setImporting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl max-w-2xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                            <Download className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Import Wallet</CardTitle>
                            <CardDescription className="text-slate-400">
                                Add an existing ROD wallet by address
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300/80 text-sm">
                            Import wallets you control to monitor balances and receive funds. 
                            Provide the private key only if you want to send transactions from this address.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Wallet Address *</Label>
                        <div className="relative">
                            <Input
                                value={address}
                                onChange={(e) => {
                                    setAddress(e.target.value);
                                    validateAddress(e.target.value);
                                }}
                                placeholder="Enter ROD address (R...)"
                                className="bg-slate-800/50 border-slate-700 text-white pr-10 font-mono"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {validating ? (
                                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                ) : addressValid === true ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                ) : addressValid === false ? (
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Label *</Label>
                        <Input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="e.g., My Trading Wallet, Cold Storage"
                            className="bg-slate-800/50 border-slate-700 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label className="text-slate-300">Private Key (Optional)</Label>
                            <Key className="w-4 h-4 text-slate-500" />
                        </div>
                        <Input
                            type="password"
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            placeholder="Enter private key if you want to send from this address"
                            className="bg-slate-800/50 border-slate-700 text-white font-mono"
                        />
                        <p className="text-xs text-slate-500">
                            Private key is optional. Without it, you can only receive and monitor this wallet.
                        </p>
                    </div>

                    <Alert className="bg-amber-500/10 border-amber-500/30">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-amber-300/80 text-sm">
                            Never share your private key with anyone. Your keys are encrypted and stored securely.
                        </AlertDescription>
                    </Alert>

                    <Button
                        onClick={handleImport}
                        disabled={!addressValid || !label.trim() || importing}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12"
                    >
                        {importing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Import Wallet
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </motion.div>
    );
}