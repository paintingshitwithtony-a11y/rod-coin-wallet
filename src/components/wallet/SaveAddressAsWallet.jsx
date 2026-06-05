import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SaveAddressAsWallet({ address, account, onClose, onSaved }) {
    const [walletName, setWalletName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSaveWallet = async () => {
        if (!walletName.trim()) {
            toast.error('Please enter a wallet name');
            return;
        }

        setLoading(true);
        try {
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

            toast.success(`Wallet "${walletName.trim()}" saved successfully`);
            if (onSaved) onSaved(wallet);
            onClose();
        } catch (err) {
            toast.error('Failed to save wallet. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
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
                            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSaveWallet()}
                            disabled={loading}
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        Address: <code className="text-amber-400 font-mono">{address.address}</code>
                    </p>
                    <p className="text-xs text-green-400">
                        This wallet will be saved unencrypted by default.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700" disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveWallet} disabled={loading || !walletName.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700">
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Wallet</>}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}