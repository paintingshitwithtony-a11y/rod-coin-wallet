import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, CheckCircle2, Eye, EyeOff, AlertCircle, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletBackup({ wallet, account, onClose }) {
    const [showSeed, setShowSeed] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopySeed = async () => {
        // In production, decrypt the seed phrase first
        const seedPhrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
        await navigator.clipboard.writeText(seedPhrase);
        setCopied(true);
        toast.success('Seed phrase copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadBackup = () => {
        const backupData = {
            wallet_name: wallet.name,
            wallet_address: wallet.wallet_address,
            backup_date: new Date().toISOString(),
            encrypted_data: wallet.encrypted_private_key,
            seed_phrase: wallet.encrypted_seed_phrase
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rod-wallet-backup-${wallet.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success('Wallet backup downloaded');
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-purple-400" />
                        Backup Wallet: {wallet.name}
                    </DialogTitle>
                </DialogHeader>

                <Alert className="bg-amber-500/10 border-amber-500/30">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <AlertDescription className="text-amber-300/90">
                        Keep your backup secure! Anyone with access to your seed phrase or backup file can control your wallet.
                    </AlertDescription>
                </Alert>

                <Tabs defaultValue="seed" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                        <TabsTrigger value="seed">Seed Phrase</TabsTrigger>
                        <TabsTrigger value="file">Backup File</TabsTrigger>
                    </TabsList>

                    <TabsContent value="seed" className="space-y-4">
                        <div className="space-y-3">
                            <p className="text-sm text-slate-400">
                                Your 12-word recovery phrase. Write it down and store it safely offline.
                            </p>

                            <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-500 font-medium">Recovery Phrase</span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowSeed(!showSeed)}
                                        className="text-slate-400"
                                    >
                                        {showSeed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>

                                {showSeed ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'].map((word, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 rounded bg-slate-900">
                                                <span className="text-xs text-slate-600">{i + 1}.</span>
                                                <span className="text-sm text-white font-mono">{word}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-600">
                                        <Key className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm">Click the eye icon to reveal</p>
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleCopySeed}
                                variant="outline"
                                className="w-full border-slate-700"
                                disabled={!showSeed}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Seed Phrase
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="file" className="space-y-4">
                        <div className="space-y-3">
                            <p className="text-sm text-slate-400">
                                Download an encrypted backup file of your wallet. Keep it safe and secure.
                            </p>

                            <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <Download className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Encrypted Wallet Backup</p>
                                        <p className="text-xs text-slate-500">JSON format</p>
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs text-slate-400">
                                    <div className="flex justify-between">
                                        <span>Wallet Name:</span>
                                        <span className="text-white">{wallet.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Address:</span>
                                        <span className="text-amber-400 font-mono">{wallet.wallet_address.slice(0, 12)}...</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Encryption:</span>
                                        <span className="text-green-400">AES-256-GCM</span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleDownloadBackup}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Backup File
                            </Button>

                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <AlertDescription className="text-blue-300/90 text-xs">
                                    You'll need your account password to restore from this backup file.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </TabsContent>
                </Tabs>

                <Button variant="outline" onClick={onClose} className="w-full border-slate-700">
                    Close
                </Button>
            </DialogContent>
        </Dialog>
    );
}