import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * WalletRestore — restore a wallet from a JSON backup file only.
 *
 * Seed-phrase restoration has been intentionally removed because:
 *  - ROD/SpaceXpanse uses a Bitcoin Core-derived wallet model with its own internal
 *    key derivation.  It does NOT use a standard BIP39/BIP44 mnemonic scheme.
 *  - Any "seed phrase" support in this app would be app-specific and not
 *    compatible with keys the node generated.
 *  - The previous deriveFromSeed backend was using a simple SHA-256 hash of the
 *    phrase — not a valid derivation scheme — and must not be used.
 *
 * If the user has a WIF private key they want to import for spending, use
 * WalletImport → Spendable (Private Key) tab instead.
 */
export default function WalletRestore({ account, onClose, onRestored }) {
    const [loading, setLoading] = useState(false);
    const [walletName, setWalletName] = useState('');
    const [backupFile, setBackupFile] = useState(null);

    const handleRestoreFromFile = async () => {
        if (!backupFile || !walletName.trim()) {
            toast.error('Please select a backup file and enter a wallet name');
            return;
        }

        setLoading(true);
        const fileContent = await backupFile.text();
        let backupData;
        try {
            backupData = JSON.parse(fileContent);
        } catch {
            toast.error('Invalid backup file — could not parse JSON');
            setLoading(false);
            return;
        }

        if (!backupData.wallet_address || !backupData.encrypted_data) {
            toast.error('Invalid backup format — expected wallet_address and encrypted_data fields');
            setLoading(false);
            return;
        }

        // Verify no duplicate
        const existing = await base44.entities.Wallet.filter({ account_id: account.id });
        if (existing.find(w => w.wallet_address === backupData.wallet_address)) {
            toast.error('This wallet address is already in your account');
            setLoading(false);
            return;
        }

        const wallet = await base44.entities.Wallet.create({
            account_id: account.id,
            name: walletName.trim(),
            wallet_address: backupData.wallet_address,
            encrypted_private_key: backupData.encrypted_data,
            balance: 0,
            is_active: false,
            wallet_type: 'standard',
            color: 'from-green-500 to-green-700'
        });

        toast.success('Wallet restored from backup file.');
        setLoading(false);
        onRestored(wallet);
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

                <div className="space-y-4 py-2">
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300/80 text-sm">
                            Select the <code className="text-blue-200">.json</code> backup file you previously 
                            downloaded from this app. Only backups created by this app are supported.
                        </AlertDescription>
                    </Alert>

                    <Alert className="bg-amber-500/10 border-amber-500/30">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-amber-300/80 text-sm">
                            <strong>No seed-phrase restore.</strong> ROD Core wallets use their own internal 
                            key derivation, not BIP39 mnemonics. To restore a wallet using only a private key, 
                            use <strong>Import Wallet → Spendable (Private Key)</strong> instead.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Wallet Name</Label>
                        <Input
                            value={walletName}
                            onChange={(e) => setWalletName(e.target.value)}
                            placeholder="e.g., Restored Wallet"
                            className="bg-slate-800 border-slate-700 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Backup File (.json)</Label>
                        <Input
                            type="file"
                            accept=".json"
                            onChange={(e) => setBackupFile(e.target.files[0])}
                            className="bg-slate-800 border-slate-700 text-white"
                        />
                        {backupFile && (
                            <p className="text-xs text-green-400">Selected: {backupFile.name}</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRestoreFromFile}
                            disabled={loading || !backupFile || !walletName.trim()}
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Restoring...</>
                            ) : (
                                <><Upload className="w-4 h-4 mr-2" />Restore from File</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}