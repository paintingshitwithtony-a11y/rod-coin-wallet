import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SaveAddressAsWallet({ address, account, onClose, onSaved }) {
    const [step, setStep] = useState('name'); // 'name' or 'passphrase'
    const [walletName, setWalletName] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [passphraseError, setPassphraseError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNameSubmit = () => {
        if (!walletName.trim()) {
            toast.error('Please enter a wallet name');
            return;
        }
        setStep('passphrase');
    };

    const handlePassphraseSubmit = async () => {
        if (!passphrase.trim()) {
            setPassphraseError('Passphrase is required');
            return;
        }

        setLoading(true);
        setPassphraseError('');
        try {
            // Create a new Wallet record from the generated address
            const wallet = await base44.entities.Wallet.create({
                account_id: account.id,
                name: walletName.trim(),
                wallet_address: address.address,
                public_key_hash: address.publicKeyHash,
                wallet_type: 'standard',
                color: 'from-blue-500 to-blue-700',
                is_active: false,
                balance: 0
            });

            if (wallet?.id) {
                toast.success(`Wallet "${walletName}" saved successfully`);
                onSaved(wallet);
                onClose();
            } else {
                toast.error('Failed to save wallet');
            }
        } catch (err) {
            setPassphraseError('Failed to save wallet. Please try again.');
            console.error('Error saving wallet:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePassphraseCancel = () => {
        setStep('name');
        setPassphrase('');
        setPassphraseError('');
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
                {step === 'name' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Save Address as Wallet</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-slate-300">Wallet Name</Label>
                                <Input
                                    value={walletName}
                                    onChange={(e) => setWalletName(e.target.value)}
                                    placeholder="e.g., Generated Wallet"
                                    className="bg-slate-800 border-slate-700 text-white mt-2"
                                    onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                                />
                            </div>
                            <p className="text-xs text-slate-500">
                                Address: <code className="text-amber-400 font-mono">{address.address}</code>
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleNameSubmit}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-amber-400" />
                                Create Passphrase
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-slate-300">Wallet Passphrase</Label>
                                <Input
                                    type="password"
                                    value={passphrase}
                                    onChange={(e) => {
                                        setPassphrase(e.target.value);
                                        setPassphraseError('');
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !loading) {
                                            handlePassphraseSubmit();
                                        }
                                    }}
                                    placeholder="Enter a secure passphrase"
                                    className="bg-slate-800 border-slate-700 text-white mt-2"
                                    disabled={loading}
                                />
                                {passphraseError && (
                                    <p className="text-red-400 text-sm mt-2">{passphraseError}</p>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">
                                Your passphrase will be used to unlock this wallet. Keep it safe.
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handlePassphraseCancel}
                                    className="flex-1 border-slate-700"
                                    disabled={loading}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handlePassphraseSubmit}
                                    disabled={loading || !passphrase.trim()}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" />Save Wallet</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}