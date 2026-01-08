import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, Key } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function WalletRestore({ account, onClose, onRestored }) {
    const [loading, setLoading] = useState(false);
    const [seedPhrase, setSeedPhrase] = useState('');
    const [walletName, setWalletName] = useState('');
    const [backupFile, setBackupFile] = useState(null);

    const handleRestoreFromSeed = async () => {
        if (!seedPhrase.trim() || !walletName.trim()) {
            toast.error('Please enter wallet name and seed phrase');
            return;
        }

        const words = seedPhrase.trim().split(/\s+/);
        if (words.length !== 12) {
            toast.error('Seed phrase must be exactly 12 words');
            return;
        }

        setLoading(true);
        try {
            // In production, derive wallet from seed phrase
            // For now, create a placeholder wallet
            toast.info('Seed phrase restoration is under development');
            
            // Placeholder: Create wallet with dummy data
            // Real implementation would use BIP39/BIP44 to derive keys from seed
            
            setLoading(false);
        } catch (err) {
            toast.error('Failed to restore wallet from seed');
            setLoading(false);
        }
    };

    const handleRestoreFromFile = async () => {
        if (!backupFile || !walletName.trim()) {
            toast.error('Please select a backup file and enter wallet name');
            return;
        }

        setLoading(true);
        try {
            const fileContent = await backupFile.text();
            const backupData = JSON.parse(fileContent);

            // Validate backup structure
            if (!backupData.wallet_address || !backupData.encrypted_data) {
                throw new Error('Invalid backup file format');
            }

            // Create restored wallet
            const wallet = await base44.entities.Wallet.create({
                account_id: account.id,
                name: walletName.trim(),
                wallet_address: backupData.wallet_address,
                encrypted_private_key: backupData.encrypted_data,
                encrypted_seed_phrase: backupData.seed_phrase,
                additional_addresses: [],
                balance: 0,
                is_active: false,
                wallet_type: 'standard',
                color: 'from-green-500 to-green-700'
            });

            toast.success('Wallet restored successfully!');
            onRestored(wallet);
        } catch (err) {
            console.error('Restore error:', err);
            toast.error('Failed to restore wallet from file');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-purple-400" />
                        Restore Wallet
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="seed" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                        <TabsTrigger value="seed">Seed Phrase</TabsTrigger>
                        <TabsTrigger value="file">Backup File</TabsTrigger>
                    </TabsList>

                    <TabsContent value="seed" className="space-y-4">
                        <div className="space-y-3">
                            <div>
                                <Label className="text-slate-300">Wallet Name</Label>
                                <Input
                                    value={walletName}
                                    onChange={(e) => setWalletName(e.target.value)}
                                    placeholder="e.g., Restored Wallet"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-300">12-Word Seed Phrase</Label>
                                <Textarea
                                    value={seedPhrase}
                                    onChange={(e) => setSeedPhrase(e.target.value)}
                                    placeholder="Enter your 12-word recovery phrase separated by spaces"
                                    className="bg-slate-800 border-slate-700 text-white h-24"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    {seedPhrase.trim().split(/\s+/).filter(Boolean).length} / 12 words
                                </p>
                            </div>

                            <Button
                                onClick={handleRestoreFromSeed}
                                disabled={loading}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Restoring...
                                    </>
                                ) : (
                                    <>
                                        <Key className="w-4 h-4 mr-2" />
                                        Restore from Seed
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="file" className="space-y-4">
                        <div className="space-y-3">
                            <div>
                                <Label className="text-slate-300">Wallet Name</Label>
                                <Input
                                    value={walletName}
                                    onChange={(e) => setWalletName(e.target.value)}
                                    placeholder="e.g., Restored Wallet"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-300">Backup File</Label>
                                <div className="mt-2">
                                    <Input
                                        type="file"
                                        accept=".json"
                                        onChange={(e) => setBackupFile(e.target.files[0])}
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                                {backupFile && (
                                    <p className="text-xs text-green-400 mt-2">
                                        Selected: {backupFile.name}
                                    </p>
                                )}
                            </div>

                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <AlertDescription className="text-blue-300/90 text-xs">
                                    Select the JSON backup file you downloaded earlier.
                                </AlertDescription>
                            </Alert>

                            <Button
                                onClick={handleRestoreFromFile}
                                disabled={loading}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Restoring...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Restore from File
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                <Button variant="outline" onClick={onClose} className="w-full border-slate-700">
                    Cancel
                </Button>
            </DialogContent>
        </Dialog>
    );
}