import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Lock, CheckCircle2, Eye, EyeOff, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * WalletCreator — Creates a new wallet via the backend.
 *
 * Architecture: Option A (Backend-Signed / Semi-Custodial)
 * The backend (generateWalletAddress function) handles:
 *   - address generation via getnewaddress RPC
 *   - private key export via dumpprivkey RPC
 *   - AES-GCM encryption of the WIF using a backend-controlled secret
 *   - storage of the encrypted key in the Wallet entity
 *
 * The raw WIF key is NEVER returned to the frontend.
 * The frontend only receives the address and wallet metadata.
 * This ensures backend signing (sendTransaction) can always decrypt and sign.
 */

const WALLET_COLORS = [
    { name: 'Purple', class: 'from-purple-500 to-purple-700' },
    { name: 'Blue',   class: 'from-blue-500 to-blue-700' },
    { name: 'Green',  class: 'from-green-500 to-green-700' },
    { name: 'Amber',  class: 'from-amber-500 to-amber-700' },
    { name: 'Pink',   class: 'from-pink-500 to-pink-700' },
    { name: 'Cyan',   class: 'from-cyan-500 to-cyan-700' }
];

export default function WalletCreator({ account, onClose, onCreated }) {
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(WALLET_COLORS[0]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('create'); // 'create', 'passphrase', or 'success'
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [passphraseError, setPassphraseError] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [createdAddress, setCreatedAddress] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error('Please enter a wallet name');
            return;
        }

        // Dialog should show passphrase step automatically
        setStep('passphrase');
    };

    const handlePassphraseSubmit = async () => {
        if (!passphrase.trim()) {
            setPassphraseError('Passphrase is required');
            return;
        }
        if (passphrase !== confirmPassphrase) {
            setPassphraseError('Passphrases do not match');
            return;
        }

        setLoading(true);
        setPassphraseError('');
        try {
            // Backend generates address, encrypts and stores WIF — raw key never returned
            const genResponse = await base44.functions.invoke('generateWalletAddress', {
                walletName: name.trim(),
                label: name.trim(),
                color: selectedColor.class,
                passphrase: passphrase // Pass user's passphrase
            });

            if (genResponse.data.error) {
                setPassphraseError(genResponse.data.error);
                setLoading(false);
                return;
            }

            const { address, walletId, walletName } = genResponse.data;

            if (!address || !walletId) {
                setPassphraseError('Wallet creation failed: incomplete response');
                setLoading(false);
                return;
            }

            // Return a minimal wallet object to the parent — no key material
            const wallet = {
                id: walletId,
                name: walletName || name.trim(),
                wallet_address: address,
                balance: 0,
                is_active: false,
                wallet_type: 'standard',
                color: selectedColor.class,
                account_id: account.id
            };

            toast.success(`Wallet "${wallet.name}" created successfully`);
            onCreated(wallet);
            setCreatedAddress(address);
            setStep('success'); // Show passphrase reminder before closing
        } catch (err) {
            // Never include raw error details that could leak key info
            setPassphraseError('Failed to create wallet. Check your RPC connection.');
        } finally {
            setLoading(false);
        }
    };

    const handlePassphraseCancel = () => {
        setStep('create');
        setPassphrase('');
        setConfirmPassphrase('');
        setPassphraseError('');
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
                {step === 'create' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                Create New Wallet
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-slate-300">Wallet Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Savings Wallet"
                                    className="bg-slate-800 border-slate-700 text-white"
                                    maxLength={30}
                                />
                            </div>

                            <div>
                                <Label className="text-slate-300 mb-2 block">Color Theme</Label>
                                <div className="grid grid-cols-6 gap-2">
                                    {WALLET_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={() => setSelectedColor(color)}
                                            className={`h-10 rounded-lg bg-gradient-to-br ${color.class} ${
                                                selectedColor.name === color.name ? 'ring-2 ring-white' : ''
                                            }`}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            <p className="text-xs text-slate-500">
                                The private key is encrypted and stored securely on the server. Your address is generated via the RPC node.
                            </p>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={loading}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4 mr-2" />Create Wallet</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : step === 'success' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                Wallet Created Successfully
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p className="text-slate-300 text-sm">
                                Your wallet has been created. <span className="text-amber-400 font-semibold">Save your passphrase now</span> — it cannot be recovered later.
                            </p>
                            <div>
                                <Label className="text-slate-400 text-xs">Address</Label>
                                <code className="text-xs text-green-400 bg-slate-800 p-2 rounded block mt-1 break-all">{createdAddress}</code>
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Passphrase Used</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="text-sm text-amber-400 bg-slate-800 p-2 rounded flex-1 break-all">
                                        {showPassphrase ? passphrase : '•'.repeat(passphrase.length)}
                                    </code>
                                    <Button size="sm" variant="ghost" onClick={() => setShowPassphrase(!showPassphrase)}>
                                        {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                            <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
                                I've saved my passphrase — Done
                            </Button>
                        </div>
                    </>
                ) : step === 'passphrase' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-amber-400" />
                                Set Wallet Passphrase
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800 rounded p-2">
                                This passphrase encrypts <strong>this wallet's private key</strong>. You will need it every time you send funds. It cannot be recovered — store it safely.
                            </p>
                            <div>
                                <Label className="text-slate-300">Passphrase</Label>
                                <div className="relative mt-2">
                                    <Input
                                        type={showPassphrase ? 'text' : 'password'}
                                        value={passphrase}
                                        onChange={(e) => { setPassphrase(e.target.value); setPassphraseError(''); }}
                                        placeholder="Choose a strong passphrase"
                                        className="bg-slate-800 border-slate-700 text-white pr-10"
                                        disabled={loading}
                                    />
                                    <button type="button" onClick={() => setShowPassphrase(!showPassphrase)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                        {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <Label className="text-slate-300">Confirm Passphrase</Label>
                                <Input
                                    type={showPassphrase ? 'text' : 'password'}
                                    value={confirmPassphrase}
                                    onChange={(e) => { setConfirmPassphrase(e.target.value); setPassphraseError(''); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handlePassphraseSubmit(); }}
                                    placeholder="Re-enter your passphrase"
                                    className="bg-slate-800 border-slate-700 text-white mt-2"
                                    disabled={loading}
                                />
                                {passphraseError && (
                                    <p className="text-red-400 text-sm mt-1">{passphraseError}</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={handlePassphraseCancel} 
                                    className="flex-1 border-slate-700"
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handlePassphraseSubmit}
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
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}