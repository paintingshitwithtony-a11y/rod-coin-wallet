/**
 * WalletRestore — Restores a wallet from a backup file only.
 *
 * Seed phrase restore is NOT supported: ROD Core uses an internal key model
 * and there is no confirmed BIP39/BIP44 derivation path for this coin.
 * Seed import via the Import Wallet → Private Key tab is the correct path if
 * you already have the derived WIF key.
 *
 * File restore expects the JSON format produced by WalletBackup:
 * { wallet_address, encrypted_data, wallet_name }
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function WalletRestore({ account, onClose, onRestored }) {
    const [loading, setLoading] = useState(false);
    const [walletName, setWalletName] = useState('');
    const [backupFile, setBackupFile] = useState(null);
    const [parsedBackup, setParsedBackup] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBackupFile(file);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.wallet_address || !data.encrypted_data) {
                    toast.error('Invalid backup file — missing required fields');
                    setParsedBackup(null);
                    return;
                }
                setParsedBackup(data);
                if (!walletName && data.wallet_name) setWalletName(data.wallet_name);
                toast.success(`Backup loaded: ${data.wallet_address.slice(0, 12)}...`);
            } catch {
                toast.error('Could not parse backup file — must be valid JSON');
                setParsedBackup(null);
            }
        };
        reader.readAsText(file);
    };

    const handleRestoreFromFile = async () => {
        if (!parsedBackup) { toast.error('Please select a valid backup file'); return; }
        if (!walletName.trim()) { toast.error('Please enter a wallet name'); return; }

        // Duplicate check
        if (account.wallet_address === parsedBackup.wallet_address) {
            toast.error('This address is your primary account address');
            return;
        }
        const existing = await base44.entities.Wallet.filter({ account_id: account.id });
        if (existing.some(w => w.wallet_address === parsedBackup.wallet_address)) {
            toast.error('This wallet address is already in your account');
            return;
        }

        setLoading(true);
        try {
            const wallet = await base44.entities.Wallet.create({
                account_id: account.id,
                name: walletName.trim(),
                wallet_address: parsedBackup.wallet_address,
                encrypted_private_key: parsedBackup.encrypted_data,
                encrypted_seed_phrase: parsedBackup.encrypted_seed_phrase || null,
                balance: 0,
                is_active: false,
                wallet_type: 'imported',
                color: 'from-green-500 to-green-700'
            });

            toast.success(`Wallet "${walletName}" restored successfully!`);
            onRestored(wallet);
        } catch (err) {
            toast.error('Failed to restore wallet: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-purple-400" />
                        Restore Wallet from Backup
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300/90 text-sm">
                            Select a <strong>.json</strong> backup file exported from this app via Wallet Backup.
                            The encrypted key will be restored into your wallet list and can be used for sending.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Wallet Name *</Label>
                        <Input
                            value={walletName}
                            onChange={(e) => setWalletName(e.target.value)}
                            placeholder="e.g., Restored Cold Storage"
                            className="bg-slate-800 border-slate-700 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Backup File (.json) *</Label>
                        <Input
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="bg-slate-800 border-slate-700 text-white"
                        />
                        {parsedBackup && (
                            <p className="text-xs text-green-400 font-mono">
                                Address: {parsedBackup.wallet_address}
                            </p>
                        )}
                    </div>

                    <Alert className="bg-amber-500/10 border-amber-500/30">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-amber-300/80 text-sm">
                            The backup file contains your encrypted private key. Keep backup files secure and offline.
                        </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-slate-700 text-slate-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRestoreFromFile}
                            disabled={loading || !parsedBackup || !walletName.trim()}
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Restoring...</>
                            ) : (
                                <><Upload className="w-4 h-4 mr-2" />Restore Wallet</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}