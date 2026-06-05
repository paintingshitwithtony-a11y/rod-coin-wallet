import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Loader2, Sparkles, CheckCircle2, Copy, AlertTriangle,
    Eye, EyeOff, ShieldAlert, KeyRound, Shield, Lock
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * WalletCreator — 4-step wallet creation:
 *
 *  Step 1: "create"   — Enter name, passphrase (+ confirm), color
 *  Step 2: "recovery" — SUCCESS SCREEN: Show address, passphrase, WIF — user must save all
 *  Step 3: "done"     — Final confirmation, wallet is live
 *
 * Passphrase is validated FIRST (validateOnly call) before any address is generated.
 * The WIF private key is the recovery key for this node-created address.
 */

const WALLET_COLORS = [
    { name: 'Purple', class: 'from-purple-500 to-purple-700' },
    { name: 'Blue',   class: 'from-blue-500 to-blue-700' },
    { name: 'Green',  class: 'from-green-500 to-green-700' },
    { name: 'Amber',  class: 'from-amber-500 to-amber-700' },
    { name: 'Pink',   class: 'from-pink-500 to-pink-700' },
    { name: 'Cyan',   class: 'from-cyan-500 to-cyan-700' }
];

function CopyField({ label, value, mono = false, alwaysVisible = false }) {
    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(alwaysVisible);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayValue = !visible ? '•'.repeat(Math.min(value.length, 40)) : value;

    return (
        <div className="space-y-1">
            <Label className="text-slate-400 text-xs uppercase tracking-wide">{label}</Label>
            <div className="flex items-center gap-2">
                <code className={`flex-1 text-xs bg-slate-800 border border-slate-700 p-2 rounded break-all ${mono ? 'font-mono' : ''} text-green-400`}>
                    {displayValue}
                </code>
                {!alwaysVisible && (
                    <button onClick={() => setVisible(v => !v)} className="text-slate-500 hover:text-slate-300 flex-shrink-0" title="Toggle visibility">
                        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                )}
                <button onClick={handleCopy} className="text-slate-500 hover:text-green-400 flex-shrink-0" title="Copy">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

export default function WalletCreator({ account, onClose, onCreated }) {
    const [name, setName] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [selectedColor, setSelectedColor] = useState(WALLET_COLORS[0]);
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [step, setStep] = useState('create'); // 'create' | 'recovery' | 'done'
    const [error, setError] = useState('');

    // Recovery data returned from backend
    const [recoveryData, setRecoveryData] = useState(null);

    // Confirmation checkboxes on recovery screen
    const [savedAddress, setSavedAddress] = useState(false);
    const [savedKey, setSavedKey] = useState(false);
    const [savedPassphrase, setSavedPassphrase] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            setError('Please enter a wallet name');
            return;
        }

        if (passphrase && passphrase !== confirmPassphrase) {
            setError('Passphrases do not match. Please re-enter to confirm.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Step A: Validate passphrase first
            setLoadingMsg('Validating passphrase…');
            const validateRes = await base44.functions.invoke('createRootWallet', {
                walletName: name.trim(),
                passphrase: passphrase || undefined,
                validateOnly: true
            });

            if (validateRes.data?.code === 'WRONG_PASSPHRASE' || validateRes.data?.error) {
                setError(validateRes.data.error || 'Passphrase validation failed');
                return;
            }

            // Step B: Create wallet
            setLoadingMsg('Generating address…');
            const createRes = await base44.functions.invoke('createRootWallet', {
                walletName: name.trim(),
                label: name.trim(),
                color: selectedColor.class,
                passphrase: passphrase || undefined,
                validateOnly: false
            });

            if (createRes.data?.error) {
                setError(createRes.data.error);
                return;
            }

            const { address, wif, walletId, walletName } = createRes.data;
            if (!address || !walletId) {
                setError('Wallet creation failed: incomplete response from node');
                return;
            }

            setRecoveryData({
                address,
                wif,
                walletId,
                walletName: walletName || name.trim(),
                passphrase: passphrase || null
            });
            setStep('recovery');

        } catch (err) {
            setError('Failed to create wallet. Check your RPC connection and try again.');
        } finally {
            setLoading(false);
            setLoadingMsg('');
        }
    };

    const handleFinish = () => {
        const wallet = {
            id: recoveryData.walletId,
            name: recoveryData.walletName,
            wallet_address: recoveryData.address,
            balance: 0,
            is_active: false,
            wallet_type: 'standard',
            color: selectedColor.class,
            account_id: account.id
        };
        onCreated(wallet);
        toast.success(`Wallet "${wallet.name}" is ready`);
        setStep('done');
    };

    const allConfirmed = savedAddress && savedKey && (!recoveryData?.passphrase || savedPassphrase);

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">

                {/* ── STEP 1: CREATE ── */}
                {step === 'create' && (
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
                                    onChange={(e) => { setName(e.target.value); setError(''); }}
                                    placeholder="e.g., Savings Wallet"
                                    className="bg-slate-800 border-slate-700 text-white mt-1"
                                    maxLength={30}
                                />
                            </div>

                            <div>
                                <Label className="text-slate-300">
                                    Node Wallet Passphrase
                                    <span className="text-slate-500 text-xs ml-1">(required if wallet is encrypted)</span>
                                </Label>
                                <Input
                                    type="password"
                                    value={passphrase}
                                    onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
                                    placeholder="Enter your node wallet passphrase"
                                    className="bg-slate-800 border-slate-700 text-white mt-1"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    This is the passphrase used to encrypt your ROD node wallet. It will be validated against the node before any address is generated.
                                </p>
                            </div>

                            {passphrase && (
                                <div>
                                    <Label className="text-slate-300">
                                        Confirm Passphrase
                                        <span className="text-red-400 text-xs ml-1">*</span>
                                    </Label>
                                    <Input
                                        type="password"
                                        value={confirmPassphrase}
                                        onChange={(e) => { setConfirmPassphrase(e.target.value); setError(''); }}
                                        placeholder="Re-enter passphrase to confirm"
                                        className={`bg-slate-800 border-slate-700 text-white mt-1 ${
                                            confirmPassphrase && confirmPassphrase !== passphrase
                                                ? 'border-red-500'
                                                : confirmPassphrase && confirmPassphrase === passphrase
                                                ? 'border-green-500'
                                                : ''
                                        }`}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                                    />
                                    {confirmPassphrase && confirmPassphrase !== passphrase && (
                                        <p className="text-xs text-red-400 mt-1">Passphrases do not match</p>
                                    )}
                                    {confirmPassphrase && confirmPassphrase === passphrase && (
                                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Passphrases match
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <Label className="text-slate-300 mb-2 block">Color Theme</Label>
                                <div className="grid grid-cols-6 gap-2">
                                    {WALLET_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={() => setSelectedColor(color)}
                                            className={`h-10 rounded-lg bg-gradient-to-br ${color.class} ${
                                                selectedColor.name === color.name ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                                            } transition-opacity`}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <Alert className="border-red-500/50 bg-red-500/10">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    <AlertDescription className="text-red-400">{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-2 pt-1">
                                <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-300">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={loading || !name.trim() || (!!passphrase && passphrase !== confirmPassphrase)}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{loadingMsg || 'Working…'}</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4 mr-2" />Create Wallet</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── STEP 2: SUCCESS / RECOVERY SCREEN ── */}
                {step === 'recovery' && recoveryData && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-green-400">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                Wallet Created — Save Your Details
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Success banner */}
                            <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-green-300 font-semibold text-sm">
                                        "{recoveryData.walletName}" has been created on your ROD node.
                                    </p>
                                    <p className="text-green-400/70 text-xs mt-0.5">
                                        Save the WIF private key below right now — this is the only time it will be shown.
                                    </p>
                                </div>
                            </div>

                            {/* Critical warning */}
                            <Alert className="border-amber-500/50 bg-amber-500/10">
                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <AlertDescription className="text-amber-300 text-xs">
                                    <strong>Write these down or store in a password manager.</strong> The WIF private key is the recovery key for this wallet address and must be saved securely.
                                </AlertDescription>
                            </Alert>

                            {/* Wallet Address */}
                            <CopyField label="Wallet Address" value={recoveryData.address} mono alwaysVisible />

                            {/* Passphrase */}
                            {recoveryData.passphrase && (
                                <CopyField label="Node Wallet Passphrase" value={recoveryData.passphrase} mono={false} />
                            )}

                            {/* WIF Private Key */}
                            {recoveryData.wif ? (
                                <CopyField label="Private Key (WIF)" value={recoveryData.wif} mono />
                            ) : (
                                <Alert className="border-slate-600 bg-slate-800">
                                    <KeyRound className="w-4 h-4 text-slate-400" />
                                    <AlertDescription className="text-slate-400 text-sm">
                                        Private key could not be exported (wallet may have re-locked). Export manually via RPC Console: <code className="text-amber-400">dumpprivkey {recoveryData.address}</code>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Private Key Recovery Notice */}
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 space-y-1">
                                <p className="text-amber-300 text-sm font-semibold">Private Key Recovery</p>
                                <p className="text-amber-300/80 text-xs">
                                    To restore or import this wallet later, use the WIF private key shown above.
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-700 pt-3">
                                <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3">
                                    <Lock className="w-3 h-3" />
                                    Confirm you have saved each item before continuing:
                                </p>

                                <div className="space-y-2">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={savedAddress}
                                            onChange={(e) => setSavedAddress(e.target.checked)}
                                            className="mt-0.5 accent-green-500 w-4 h-4 flex-shrink-0"
                                        />
                                        <span className="text-sm text-slate-300 group-hover:text-white">
                                            I have saved the <strong className="text-white">wallet address</strong>
                                        </span>
                                    </label>

                                    {recoveryData.passphrase && (
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={savedPassphrase}
                                                onChange={(e) => setSavedPassphrase(e.target.checked)}
                                                className="mt-0.5 accent-green-500 w-4 h-4 flex-shrink-0"
                                            />
                                            <span className="text-sm text-slate-300 group-hover:text-white">
                                                I have saved my <strong className="text-white">passphrase</strong> securely
                                            </span>
                                        </label>
                                    )}

                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={savedKey}
                                            onChange={(e) => setSavedKey(e.target.checked)}
                                            className="mt-0.5 accent-green-500 w-4 h-4 flex-shrink-0"
                                        />
                                        <span className="text-sm text-slate-300 group-hover:text-white">
                                            I have saved the <strong className="text-white">private key (WIF)</strong> — it will not be shown again
                                        </span>
                                    </label>

                                </div>
                            </div>

                            <Button
                                onClick={handleFinish}
                                disabled={!allConfirmed}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40"
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                I've Saved Everything — Finish Setup
                            </Button>
                        </div>
                    </>
                )}

                {/* ── STEP 3: DONE ── */}
                {step === 'done' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                Wallet Ready
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p className="text-slate-300 text-sm">
                                Your wallet <strong className="text-white">{recoveryData?.walletName}</strong> has been created and is managed by your ROD node.
                            </p>
                            {recoveryData?.address && (
                                <div>
                                    <Label className="text-slate-400 text-xs">Address</Label>
                                    <code className="text-xs text-green-400 bg-slate-800 p-2 rounded block mt-1 break-all font-mono">
                                        {recoveryData.address}
                                    </code>
                                </div>
                            )}
                            <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
                                Close
                            </Button>
                        </div>
                    </>
                )}

            </DialogContent>
        </Dialog>
    );
}