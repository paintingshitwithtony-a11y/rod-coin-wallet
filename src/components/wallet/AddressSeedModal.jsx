import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Save, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AddressSeedModal({ address, account, onClose, onSaved }) {
    const [seedPhrase, setSeedPhrase] = useState(address.seed_phrase || '');
    const [saving, setSaving] = useState(false);
    const [showSeed, setShowSeed] = useState(false);

    const handleSave = async () => {
        if (!seedPhrase.trim()) {
            toast.error('Please enter a seed phrase');
            return;
        }

        setSaving(true);
        try {
            const additionalAddresses = account.additional_addresses || [];
            
            // Find and update the address
            const addressIndex = additionalAddresses.findIndex(addr => addr.address === address.address);
            
            if (addressIndex !== -1) {
                additionalAddresses[addressIndex].seed_phrase = seedPhrase.trim();
            }

            // Update account with only the field that changed
            await base44.entities.WalletAccount.update(account.id, {
                additional_addresses: additionalAddresses
            });

            toast.success('Seed phrase saved securely');
            if (onSaved) {
                onSaved();
            }
            onClose();
        } catch (error) {
            toast.error('Failed to save seed phrase: ' + (error.message || 'Unknown error'));
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-amber-400" />
                        Seed Phrase for {address.label}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Securely store your seed phrase for backup and recovery
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-amber-300/80 text-sm">
                            Never share your seed phrase with anyone. It provides full access to your wallet.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-slate-300">Seed Phrase (12 or 24 words)</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSeed(!showSeed)}
                                className="text-slate-400 hover:text-white"
                            >
                                {showSeed ? (
                                    <>
                                        <EyeOff className="w-4 h-4 mr-1" />
                                        Hide
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4 mr-1" />
                                        Show
                                    </>
                                )}
                            </Button>
                        </div>
                        <Textarea
                            value={seedPhrase}
                            onChange={(e) => setSeedPhrase(e.target.value)}
                            placeholder="Enter your seed phrase separated by spaces..."
                            type={showSeed ? "text" : "password"}
                            className="bg-slate-800/50 border-slate-700 text-white font-mono min-h-[120px]"
                            style={showSeed ? {} : { WebkitTextSecurity: 'disc' }}
                        />
                        <p className="text-xs text-slate-500">
                            {seedPhrase.trim().split(/\s+/).filter(w => w).length} words entered
                        </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                        <p className="text-xs text-slate-400">
                            <span className="font-medium text-slate-300">Address:</span>
                            <br />
                            <span className="font-mono text-amber-400">{address.address}</span>
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Seed Phrase
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="border-slate-600 text-slate-400"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}