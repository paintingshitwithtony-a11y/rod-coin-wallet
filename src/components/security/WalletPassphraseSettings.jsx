import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function WalletPassphraseSettings({ account }) {
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [loading, setLoading] = useState(false);

    const hasPassphrase = !!account?.wallet_passphrase;

    const handleSave = async (e) => {
        e.preventDefault();

        if (!passphrase.trim()) {
            toast.error('Please enter your node wallet passphrase');
            return;
        }

        if (passphrase !== confirmPassphrase) {
            toast.error('Passphrases do not match');
            return;
        }

        setLoading(true);
        try {
            await base44.entities.WalletAccount.update(account.id, {
                wallet_passphrase: passphrase
            });
            toast.success('Wallet passphrase saved — your node will be unlocked automatically during transactions');
            setPassphrase('');
            setConfirmPassphrase('');
        } catch (err) {
            toast.error('Failed to save passphrase');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        if (!confirm('Remove your saved wallet passphrase? You will need to unlock your node manually before sending.')) return;
        setLoading(true);
        try {
            await base44.entities.WalletAccount.update(account.id, {
                wallet_passphrase: null
            });
            toast.success('Wallet passphrase removed');
        } catch (err) {
            toast.error('Failed to remove passphrase');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-900/80 border-slate-700/50">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-400" />
                    Node Wallet Passphrase
                </CardTitle>
                <CardDescription className="text-slate-400">
                    Your ROD Core node wallet passphrase — used only to auto-unlock your wallet before sending transactions. Each account uses its own passphrase.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {hasPassphrase ? (
                    <Alert className="bg-green-500/10 border-green-500/30">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <AlertDescription className="text-green-300">
                            A wallet passphrase is saved for your account. Your node will be auto-unlocked when sending.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-amber-300">
                            No passphrase set. If your ROD Core wallet is encrypted, transactions may fail. Set your node wallet passphrase below.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300">{hasPassphrase ? 'New Node Wallet Passphrase' : 'Node Wallet Passphrase'}</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                type={showPassphrase ? 'text' : 'password'}
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                placeholder="Your rod.conf wallet passphrase"
                                className="bg-slate-800 border-slate-700 text-white pl-10 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Confirm Passphrase</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                type={showPassphrase ? 'text' : 'password'}
                                value={confirmPassphrase}
                                onChange={(e) => setConfirmPassphrase(e.target.value)}
                                placeholder="Confirm passphrase"
                                className="bg-slate-800 border-slate-700 text-white pl-10"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={loading || !passphrase}
                            className="flex-1 bg-amber-600 hover:bg-amber-700"
                        >
                            <KeyRound className="w-4 h-4 mr-2" />
                            {hasPassphrase ? 'Update Passphrase' : 'Save Passphrase'}
                        </Button>
                        {hasPassphrase && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClear}
                                disabled={loading}
                                className="border-red-500/50 text-red-400 hover:text-red-300"
                            >
                                Remove
                            </Button>
                        )}
                    </div>
                </form>

                <p className="text-xs text-slate-500">
                    This is the passphrase from your <code className="text-slate-400">walletpassphrase</code> command in ROD Core. It is stored per account and only used to unlock your own node.
                </p>
            </CardContent>
        </Card>
    );
}