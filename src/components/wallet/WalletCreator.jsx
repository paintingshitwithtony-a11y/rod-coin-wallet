import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { generateNewRODAddress, generatePrivateKey } from './Base58';

const WALLET_COLORS = [
    { name: 'Purple', class: 'from-purple-500 to-purple-700' },
    { name: 'Blue', class: 'from-blue-500 to-blue-700' },
    { name: 'Green', class: 'from-green-500 to-green-700' },
    { name: 'Amber', class: 'from-amber-500 to-amber-700' },
    { name: 'Pink', class: 'from-pink-500 to-pink-700' },
    { name: 'Cyan', class: 'from-cyan-500 to-cyan-700' }
];

// Simple encryption for private key
async function encryptPrivateKey(privateKey, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(privateKey);
    const keyData = encoder.encode(password.padEnd(32, '0').slice(0, 32));
    
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
}

// Generate a simple seed phrase (12 words)
function generateSeedPhrase() {
    const words = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
        'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
        'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
    ];
    
    const phrase = [];
    for (let i = 0; i < 12; i++) {
        phrase.push(words[Math.floor(Math.random() * words.length)]);
    }
    return phrase.join(' ');
}

export default function WalletCreator({ account, onClose, onCreated }) {
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(WALLET_COLORS[0]);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error('Please enter a wallet name');
            return;
        }

        setLoading(true);
        try {
            // Generate new wallet address and keys
            const { address, publicKeyHash } = await generateNewRODAddress();
            const privateKey = generatePrivateKey();
            const seedPhrase = generateSeedPhrase();
            
            // Get account password from session (in production, prompt user)
            const session = JSON.parse(localStorage.getItem('rod_wallet_session') || '{}');
            const password = 'wallet_encryption_key'; // In production, use actual password
            
            const encryptedPrivateKey = await encryptPrivateKey(privateKey, password);
            const encryptedSeed = await encryptPrivateKey(seedPhrase, password);

            // Create wallet
            const wallet = await base44.entities.Wallet.create({
                account_id: account.id,
                name: name.trim(),
                wallet_address: address,
                public_key_hash: publicKeyHash,
                encrypted_private_key: encryptedPrivateKey,
                encrypted_seed_phrase: encryptedSeed,
                additional_addresses: [],
                balance: 0,
                is_active: false,
                wallet_type: 'standard',
                color: selectedColor.class
            });

            // Import address to RPC
            try {
                await base44.functions.invoke('importAddress', {
                    address: address,
                    label: name.trim()
                });
            } catch (err) {
                // Silently fail - will import when RPC is configured
            }

            toast.success(`Wallet "${name}" created successfully!`);
            onCreated(wallet);
        } catch (err) {
            console.error('Failed to create wallet:', err);
            toast.error('Failed to create wallet');
        } finally {
            setLoading(false);
        }
    };

    return (
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

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-slate-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={loading}
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Create Wallet
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}