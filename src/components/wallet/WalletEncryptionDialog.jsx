import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletEncryptionDialog({ wallet, onClose, onEncrypted }) {
    const [appPassphrase, setAppPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [nodePassphrase, setNodePassphrase] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleEncrypt = async () => {
        if (appPassphrase.length < 8) {
            setError('Use at least 8 characters for the app encryption passphrase.');
            return;
        }
        if (appPassphrase !== confirmPassphrase) {
            setError('App passphrases do not match.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await base44.functions.invoke('encryptWalletRecord', {
                walletId: wallet.id,
                appPassphrase,
                nodePassphrase: nodePassphrase || undefined
            });
            if (response.data?.error) {
                setError(response.data.error);
                return;
            }
            toast.success('Wallet record encryption enabled');
            onEncrypted();
        } catch (err) {
            setError('Failed to encrypt wallet record. Check your RPC connection and passphrases.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-green-400" />
                        Encrypt App Wallet Record
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-amber-300/90 text-sm">
                            This stores the wallet private key encrypted in the app record. Save this passphrase safely; it cannot be recovered.
                        </AlertDescription>
                    </Alert>

                    <div>
                        <Label className="text-slate-300">App Encryption Passphrase</Label>
                        <Input
                            type="password"
                            value={appPassphrase}
                            onChange={(e) => { setAppPassphrase(e.target.value); setError(''); }}
                            placeholder="Create an app encryption passphrase"
                            className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">Confirm App Passphrase</Label>
                        <Input
                            type="password"
                            value={confirmPassphrase}
                            onChange={(e) => { setConfirmPassphrase(e.target.value); setError(''); }}
                            placeholder="Confirm passphrase"
                            className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">Node Wallet Passphrase <span className="text-slate-500 text-xs">(if locked)</span></Label>
                        <Input
                            type="password"
                            value={nodePassphrase}
                            onChange={(e) => { setNodePassphrase(e.target.value); setError(''); }}
                            placeholder="Leave blank if node wallet is unlocked"
                            className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-300">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEncrypt}
                            disabled={loading || !appPassphrase || !confirmPassphrase}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                            Encrypt
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}