import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import PassphraseModal from './PassphraseModal';

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
    const [step, setStep] = useState('create'); // 'create' or 'passphrase'
    const [passphrase, setPassphrase] = useState('');
    const [passphraseError, setPassphraseError] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error('Please enter a wallet name');
            return;
        }

        // Move to passphrase step
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
            // Backend generates address, encrypts and stores WIF — raw key never returned
            const genResponse = await base44.functions.invoke('generateWalletAddress', {
                walletName: name.trim(),
                label: name.trim(),
                color: selectedColor.class,
                passphrase: passphrase // Pass user's passphrase
            });

            if (genResponse.data.error) {
                toast.error(genResponse.data.error);
                return;
            }

            const { address, walletId, walletName } = genResponse.data;

            if (!address || !walletId) {
                toast.error('Wallet creation failed: incomplete response from server');
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
        } catch (err) {
            // Never include raw error details that could leak key info
            toast.error('Failed to create wallet. Please check your RPC connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
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
            </DialogContent>
        </Dialog>

        {showPassphraseModal && (
            <PassphraseModal
                isOpen={true}
                title="Unlock Your Wallet"
                description="Enter your wallet passphrase to create a new wallet address."
                onSubmit={handlePassphraseSubmit}
                onCancel={() => setShowPassphraseModal(false)}
                loading={loading}
            />
        )}
        </>
    );
}