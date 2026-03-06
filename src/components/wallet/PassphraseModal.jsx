import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from 'lucide-react';

export default function PassphraseModal({ isOpen, title, description, onSubmit, onCancel, loading = false }) {
    const [passphrase, setPassphrase] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!passphrase.trim()) {
            setError('Passphrase is required');
            return;
        }
        setError('');
        onSubmit(passphrase);
        setPassphrase('');
    };

    const handleCancel = () => {
        setPassphrase('');
        setError('');
        onCancel?.();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-400" />
                        {title || 'Enter Wallet Passphrase'}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-slate-400">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label className="text-slate-300">Wallet Passphrase</Label>
                        <Input
                            type="password"
                            value={passphrase}
                            onChange={(e) => {
                                setPassphrase(e.target.value);
                                setError('');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !loading) {
                                    handleSubmit();
                                }
                            }}
                            placeholder="Enter your wallet passphrase"
                            className="bg-slate-800 border-slate-700 text-white mt-2"
                            disabled={loading}
                        />
                        {error && (
                            <p className="text-red-400 text-sm mt-2">{error}</p>
                        )}
                    </div>

                    <p className="text-xs text-slate-500">
                        Your passphrase is never stored. It's used only for this transaction and immediately discarded.
                    </p>

                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handleCancel} 
                            className="flex-1 border-slate-700"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !passphrase.trim()}
                            className="flex-1 bg-amber-600 hover:bg-amber-700"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                            ) : (
                                <>Confirm</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}