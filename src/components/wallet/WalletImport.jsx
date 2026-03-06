/**
 * WalletImport — Two explicit import modes:
 *
 * A. Watch-only: address + label only.
 *    - Stored as wallet_type: 'watch-only'
 *    - No private key stored
 *    - NOT available as a sending source in SendReceive
 *    - Can receive funds and show UTXO balance
 *
 * B. Spendable (Private Key Import): address + WIF + label.
 *    - Backend verifies WIF format via node
 *    - Backend encrypts WIF with WALLET_ENCRYPTION_SECRET
 *    - Stored as wallet_type: 'imported' in the Wallet table
 *    - Available for backend-signed transactions via sendTransaction
 *
 * Seed phrase import is NOT supported — ROD Core uses its own internal HD wallet;
 * a generic BIP39 derivation model is not confirmed to be compatible.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Plus, CheckCircle2, AlertCircle, Loader2, Key, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { validateRODAddress } from './Base58';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function WalletImport({ account, onWalletImported }) {
    const [importMode, setImportMode] = useState('watchonly');

    // Shared
    const [address, setAddress] = useState('');
    const [label, setLabel] = useState('');
    const [validating, setValidating] = useState(false);
    const [addressValid, setAddressValid] = useState(null);
    const [importing, setImporting] = useState(false);

    // Private key mode
    const [privateKey, setPrivateKey] = useState('');
    const [showKey, setShowKey] = useState(false);

    const validateAddress = async (addr) => {
        if (!addr || addr.length < 26) {
            setAddressValid(null);
            return;
        }
        setValidating(true);
        const result = await validateRODAddress(addr);
        setAddressValid(result.valid);
        setValidating(false);
        if (!result.valid) toast.error(`Invalid address: ${result.error}`);
    };

    const resetForm = () => {
        setAddress('');
        setLabel('');
        setPrivateKey('');
        setAddressValid(null);
        setShowKey(false);
    };

    // --- Watch-only import ---
    const handleWatchOnlyImport = async () => {
        if (!addressValid) { toast.error('Please enter a valid ROD address'); return; }
        if (!label.trim()) { toast.error('Please enter a label'); return; }

        setImporting(true);
        try {
            // Duplicate check
            if (account.wallet_address === address) {
                toast.error('This is your primary account address'); return;
            }
            const existing = await base44.entities.Wallet.filter({ account_id: account.id });
            if (existing.some(w => w.wallet_address === address)) {
                toast.error('This address is already in your wallets'); return;
            }

            const wallet = await base44.entities.Wallet.create({
                account_id: account.id,
                name: label.trim(),
                wallet_address: address,
                balance: 0,
                is_active: false,
                wallet_type: 'watch-only',
                color: 'from-slate-500 to-slate-700'
            });

            toast.success(`Watch-only wallet "${label}" added. It can receive funds but cannot send.`);
            resetForm();
            if (onWalletImported) onWalletImported(wallet);
        } catch (err) {
            toast.error('Failed to import watch-only wallet: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    // --- Spendable private key import ---
    const handlePrivateKeyImport = async () => {
        if (!addressValid) { toast.error('Please enter a valid ROD address'); return; }
        if (!privateKey.trim()) { toast.error('Please enter the private key (WIF format)'); return; }
        if (!label.trim()) { toast.error('Please enter a label'); return; }

        setImporting(true);
        try {
            const response = await base44.functions.invoke('importPrivateKey', {
                address,
                privateKey: privateKey.trim(),
                label: label.trim(),
                color: 'from-blue-500 to-blue-700'
            });

            if (response.data?.error) {
                toast.error(response.data.error);
                return;
            }

            const verified = response.data?.keyVerified;
            toast.success(
                verified
                    ? `Wallet "${label}" imported and key verified — ready to send.`
                    : `Wallet "${label}" imported. Key stored encrypted (RPC verification skipped).`
            );
            resetForm();
            if (onWalletImported) onWalletImported(response.data?.wallet);
        } catch (err) {
            toast.error('Import failed: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleImport = () => {
        if (importMode === 'watchonly') return handleWatchOnlyImport();
        return handlePrivateKeyImport();
    };

    const isSubmitDisabled = importing || !addressValid || !label.trim() ||
        (importMode === 'spendable' && !privateKey.trim());

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl max-w-2xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                            <Download className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Import Wallet</CardTitle>
                            <CardDescription className="text-slate-400">
                                Add an existing ROD address as watch-only or import a private key for full spending capability.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <Tabs value={importMode} onValueChange={(v) => { setImportMode(v); resetForm(); }}>
                        <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                            <TabsTrigger value="watchonly">Watch-Only</TabsTrigger>
                            <TabsTrigger value="spendable">Private Key Import</TabsTrigger>
                        </TabsList>

                        {/* Watch-Only */}
                        <TabsContent value="watchonly" className="space-y-4 mt-5">
                            <Alert className="bg-slate-800/50 border-slate-600">
                                <Eye className="h-4 w-4 text-slate-400" />
                                <AlertDescription className="text-slate-300 text-sm">
                                    Watch-only wallets can receive funds and display UTXO balances, but <strong>cannot send transactions</strong>.
                                    No private key is stored.
                                </AlertDescription>
                            </Alert>

                            <AddressField
                                address={address}
                                validating={validating}
                                addressValid={addressValid}
                                onChange={(val) => { setAddress(val); validateAddress(val); }}
                            />

                            <LabelField label={label} onChange={setLabel} />
                        </TabsContent>

                        {/* Spendable */}
                        <TabsContent value="spendable" className="space-y-4 mt-5">
                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <Key className="h-4 w-4 text-blue-400" />
                                <AlertDescription className="text-blue-300/90 text-sm">
                                    Your private key (WIF format) is encrypted server-side using AES-256-GCM and never exposed to the browser.
                                    The wallet will be available for backend-signed transactions.
                                </AlertDescription>
                            </Alert>

                            <AddressField
                                address={address}
                                validating={validating}
                                addressValid={addressValid}
                                onChange={(val) => { setAddress(val); validateAddress(val); }}
                            />

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-slate-300">Private Key (WIF) *</Label>
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(v => !v)}
                                        className="text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <Input
                                    type={showKey ? 'text' : 'password'}
                                    value={privateKey}
                                    onChange={(e) => setPrivateKey(e.target.value)}
                                    placeholder="Enter WIF private key..."
                                    className="bg-slate-800/50 border-slate-700 text-white font-mono"
                                    autoComplete="off"
                                />
                                <p className="text-xs text-slate-500">
                                    Must match the provided address. The address and key pair will be verified before storage.
                                </p>
                            </div>

                            <LabelField label={label} onChange={setLabel} />

                            <Alert className="bg-amber-500/10 border-amber-500/30">
                                <AlertCircle className="h-4 w-4 text-amber-400" />
                                <AlertDescription className="text-amber-300/80 text-sm">
                                    Never share your private key. Once imported, only the encrypted form is stored — the raw key is discarded.
                                </AlertDescription>
                            </Alert>
                        </TabsContent>
                    </Tabs>

                    <Button
                        onClick={handleImport}
                        disabled={isSubmitDisabled}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12"
                    >
                        {importing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                        ) : (
                            <><Plus className="w-4 h-4 mr-2" />
                                {importMode === 'watchonly' ? 'Add Watch-Only Wallet' : 'Import & Encrypt Key'}
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function AddressField({ address, validating, addressValid, onChange }) {
    return (
        <div className="space-y-2">
            <Label className="text-slate-300">ROD Address *</Label>
            <div className="relative">
                <Input
                    value={address}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Enter ROD address (R...)"
                    className="bg-slate-800/50 border-slate-700 text-white pr-10 font-mono"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validating ? (
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    ) : addressValid === true ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : addressValid === false ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function LabelField({ label, onChange }) {
    return (
        <div className="space-y-2">
            <Label className="text-slate-300">Label *</Label>
            <Input
                value={label}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g., Cold Storage, Trading Wallet"
                className="bg-slate-800/50 border-slate-700 text-white"
            />
        </div>
    );
}