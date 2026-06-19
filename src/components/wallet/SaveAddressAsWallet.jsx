import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SaveAddressAsWallet({ address, account, onClose, onSaved }) {
    const [walletName, setWalletName] = useState('');
    const [loading, setLoading] = useState(false);
    const [savePrivateKeyInApp, setSavePrivateKeyInApp] = useState(false);
    const [insecureSaveAcknowledged, setInsecureSaveAcknowledged] = useState(false);

    const handleSaveWallet = async () => {
        if (!walletName.trim()) {
            toast.error('Please enter a wallet name');
            return;
        }

        // Force acknowledgment check
        if (!address.privateKeyViewed || !address.privateKeyAcknowledged) {
            toast.error('Please view and acknowledge the private key first.');
            return;
        }

        if (savePrivateKeyInApp && !insecureSaveAcknowledged) {
            toast.error('Please acknowledge the insecure storage warning.');
            return;
        }

        setLoading(true);
        try {
            const wallet = await base44.entities.Wallet.create({
                account_id: account.id,
                name: walletName.trim(),
                wallet_address: address.address,
                public_key_hash: address.publicKeyHash || address.address,
                encrypted_private_key: savePrivateKeyInApp ? address.privateKey : '',
                app_encryption_enabled: false,
                encryption_version: savePrivateKeyInApp ? 'plain-wif-insecure' : '',
                wallet_type: 'standard',
                color: 'from-blue-500 to-blue-700',
                is_active: false,
                balance: 0
            });

            toast.success(`Wallet "${walletName.trim()}" saved successfully!`);
            if (onSaved) onSaved(wallet);
            onClose();
        } catch (err) {
            console.error(err);
            toast.error('Failed to save wallet. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle>Save Address as Wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label className="text-slate-300">Wallet Name</Label>
                        <Input
                            value={walletName}
                            onChange={(e) => setWalletName(e.target.value)}
                            placeholder="e.g., Mobile Tester"
                            className="bg-slate-800 border-slate-700 text-white mt-1"
                            disabled={loading}
                        />
                    </div>

                    <p className="text-xs text-slate-400 break-all">
                        Address: <span className="text-amber-400 font-mono">{address.address}</span>
                    </p>

                    <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 space-y-3 text-sm">
                        <div className="flex gap-2 text-red-200">
                            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p>By default, this saves only the wallet address. Saving the private key in the app is insecure.</p>
                        </div>

                        <label className="flex items-start gap-2 cursor-pointer text-red-100">
                            <input
                                type="checkbox"
                                checked={savePrivateKeyInApp}
                                onChange={(e) => setSavePrivateKeyInApp(e.target.checked)}
                                className="mt-1 accent-red-500"
                            />
                            <span>Save private key in app (insecure)</span>
                        </label>

                        {savePrivateKeyInApp && (
                            <label className="flex items-start gap-2 cursor-pointer text-red-100">
                                <input
                                    type="checkbox"
                                    checked={insecureSaveAcknowledged}
                                    onChange={(e) => setInsecureSaveAcknowledged(e.target.checked)}
                                    className="mt-1 accent-red-500"
                                />
                                <span>I understand this is not secure and should not be used for large amounts.</span>
                            </label>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            onClick={onClose} 
                            className="flex-1 border-slate-700"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSaveWallet} 
                            disabled={loading || !walletName.trim() || (savePrivateKeyInApp && !insecureSaveAcknowledged)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Save to App</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}