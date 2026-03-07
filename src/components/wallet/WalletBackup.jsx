import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, CheckCircle2, Eye, EyeOff, AlertCircle, Key, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function WalletBackup({ wallet, account, onClose }) {
    const [passphrase, setPassphrase] = useState('');
    const [wif, setWif] = useState('');
    const [showWif, setShowWif] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const handleExportKey = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await base44.functions.invoke('exportPrivateKey', {
                address: wallet.wallet_address,
                passphrase: passphrase || undefined
            });
            if (res.data.error) {
                setError(res.data.error);
            } else {
                setWif(res.data.wif);
                setShowWif(true);
            }
        } catch (err) {
            setError('Failed to export private key. Check your RPC connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(wif);
        setCopied(true);
        toast.success('Private key copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadBackup = () => {
        const backupData = {
            wallet_name: wallet.name,
            wallet_address: wallet.wallet_address,
            backup_date: new Date().toISOString(),
            private_key_wif: wif || '(not yet exported — use Export Private Key tab first)',
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
                        Keep your backup secure! Anyone with your private key can control your wallet.
                    </AlertDescription>
                </Alert>

                <Tabs defaultValue="privatekey" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                        <TabsTrigger value="privatekey">Private Key (WIF)</TabsTrigger>
                        <TabsTrigger value="file">Backup File</TabsTrigger>
                    </TabsList>

                    <TabsContent value="privatekey" className="space-y-4">
                        <p className="text-sm text-slate-400">
                            Export your WIF private key from the node. This key can be used to sign transactions directly.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <Label className="text-slate-300">Node Wallet Passphrase <span className="text-slate-500 text-xs">(if encrypted)</span></Label>
                                <Input
                                    type="password"
                                    value={passphrase}
                                    onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
                                    placeholder="Leave blank if wallet is unencrypted"
                                    className="bg-slate-800 border-slate-700 text-white mt-1"
                                />
                            </div>

                            {error && <p className="text-red-400 text-sm">{error}</p>}

                            {!wif ? (
                                <Button
                                    onClick={handleExportKey}
                                    disabled={loading}
                                    className="w-full bg-amber-600 hover:bg-amber-700"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
                                    ) : (
                                        <><Key className="w-4 h-4 mr-2" />Export Private Key from Node</>
                                    )}
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="p-3 rounded-lg bg-slate-800 border border-amber-500/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-slate-400">WIF Private Key</span>
                                            <Button size="sm" variant="ghost" onClick={() => setShowWif(!showWif)} className="text-slate-400 h-6 px-2">
                                                {showWif ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </Button>
                                        </div>
                                        {showWif ? (
                                            <code className="text-xs text-amber-400 font-mono break-all">{wif}</code>
                                        ) : (
                                            <p className="text-xs text-slate-600 text-center py-2">Hidden — click eye to reveal</p>
                                        )}
                                    </div>
                                    <Button onClick={handleCopy} variant="outline" className="w-full border-slate-700">
                                        {copied ? (
                                            <><CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />Copied!</>
                                        ) : (
                                            <><Copy className="w-4 h-4 mr-2" />Copy WIF Key</>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="file" className="space-y-4">
                        <p className="text-sm text-slate-400">
                            Download a backup file. Export your private key first (via the Private Key tab) to include it.
                        </p>

                        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 space-y-2 text-xs text-slate-400">
                            <div className="flex justify-between">
                                <span>Wallet Name:</span>
                                <span className="text-white">{wallet.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Address:</span>
                                <span className="text-amber-400 font-mono">{wallet.wallet_address.slice(0, 16)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Private Key Included:</span>
                                <span className={wif ? 'text-green-400' : 'text-slate-500'}>{wif ? 'Yes' : 'No (export first)'}</span>
                            </div>
                        </div>

                        <Button onClick={handleDownloadBackup} className="w-full bg-purple-600 hover:bg-purple-700">
                            <Download className="w-4 h-4 mr-2" />
                            Download Backup File
                        </Button>
                    </TabsContent>
                </Tabs>

                <Button variant="outline" onClick={onClose} className="w-full border-slate-700">
                    Close
                </Button>
            </DialogContent>
        </Dialog>
    );
}