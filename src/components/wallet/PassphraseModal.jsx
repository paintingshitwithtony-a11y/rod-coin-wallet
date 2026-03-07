import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Lock, Key } from 'lucide-react';

export default function PassphraseModal({ isOpen, title, description, onSubmit, onCancel, loading = false }) {
    const [mode, setMode] = useState('passphrase'); // 'passphrase' or 'privatekey'
    const [passphrase, setPassphrase] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (mode === 'passphrase' && !passphrase.trim()) {
            setError('Passphrase is required');
            return;
        }
        if (mode === 'privatekey' && !privateKey.trim()) {
            setError('Private key (WIF) is required');
            return;
        }
        setError('');
        onSubmit(mode === 'passphrase' ? passphrase : null, mode === 'privatekey' ? privateKey : null);
        setPassphrase('');
        setPrivateKey('');
    };

    const handleCancel = () => {
        setPassphrase('');
        setPrivateKey('');
        setError('');
        onCancel?.();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-400" />
                        {title || 'Unlock Wallet'}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-slate-400">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="space-y-4">
                    <Tabs value={mode} onValueChange={(v) => { setMode(v); setError(''); }}>
                        <TabsList className="bg-slate-800 w-full">
                            <TabsTrigger value="passphrase" className="flex-1 data-[state=active]:bg-amber-600">
                                <Lock className="w-3 h-3 mr-1" /> Passphrase
                            </TabsTrigger>
                            <TabsTrigger value="privatekey" className="flex-1 data-[state=active]:bg-amber-600">
                                <Key className="w-3 h-3 mr-1" /> Private Key
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="passphrase" className="mt-3">
                            <Label className="text-slate-300">Wallet Passphrase</Label>
                            <Input
                                type="password"
                                value={passphrase}
                                onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleSubmit(); }}
                                placeholder="Enter your wallet passphrase"
                                className="bg-slate-800 border-slate-700 text-white mt-2"
                                disabled={loading}
                            />
                        </TabsContent>

                        <TabsContent value="privatekey" className="mt-3">
                            <Label className="text-slate-300">Private Key (WIF or hex)</Label>
                            <Input
                                type="password"
                                value={privateKey}
                                onChange={(e) => { setPrivateKey(e.target.value); setError(''); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleSubmit(); }}
                                placeholder="WIF (starts with K/L/5) or 64-char hex"
                                className="bg-slate-800 border-slate-700 text-white mt-2 font-mono"
                                disabled={loading}
                            />
                        </TabsContent>
                    </Tabs>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <p className="text-xs text-slate-500">
                        Enter the passphrase you used when you ran <code className="text-amber-400">encryptwallet</code> on your ROD node. This is set at the node level and is not the same as your app login password.
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
                            disabled={loading || (mode === 'passphrase' ? !passphrase.trim() : !privateKey.trim())}
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