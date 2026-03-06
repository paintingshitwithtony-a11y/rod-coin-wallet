import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Key, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { validateRODAddress } from './Base58';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// ─── Watch-Only Import ────────────────────────────────────────────────────────
function WatchOnlyImport({ account, onDone }) {
    const [address, setAddress] = useState('');
    const [label, setLabel] = useState('');
    const [validating, setValidating] = useState(false);
    const [addressValid, setAddressValid] = useState(null);
    const [importing, setImporting] = useState(false);

    const validateAddress = async (addr) => {
        if (!addr || addr.length < 26) { setAddressValid(null); return; }
        setValidating(true);
        const result = await validateRODAddress(addr);
        setAddressValid(result.valid);
        setValidating(false);
        if (!result.valid) toast.error(`Invalid address: ${result.error}`);
    };

    const handleImport = async () => {
        if (!addressValid) { toast.error('Please enter a valid ROD address'); return; }
        if (!label.trim()) { toast.error('Please enter a label'); return; }

        // Check for duplicate against existing Wallet records
        setImporting(true);
        const existing = await base44.entities.Wallet.filter({ account_id: account.id });
        const dup = existing.find(w => w.wallet_address === address);
        if (dup || account.wallet_address === address) {
            toast.error('This address is already in your wallet list');
            setImporting(false);
            return;
        }

        // Store as a watch-only Wallet record — no private key, not spendable
        await base44.entities.Wallet.create({
            account_id: account.id,
            name: label.trim(),
            wallet_address: address.trim(),
            balance: 0,
            is_active: false,
            wallet_type: 'watch_only',
            color: 'from-slate-500 to-slate-600'
        });

        toast.success(`Watch-only wallet "${label}" added. You can monitor its balance but cannot send from it.`);
        setAddress(''); setLabel(''); setAddressValid(null);
        setImporting(false);
        if (onDone) onDone();
    };

    return (
        <div className="space-y-5">
            <Alert className="bg-slate-800/60 border-slate-600">
                <Eye className="h-4 w-4 text-slate-400" />
                <AlertDescription className="text-slate-300 text-sm">
                    <strong className="text-white">Watch-only.</strong> You can monitor balance and receive funds. 
                    This wallet will <em>not</em> appear as a source address when sending — no private key is stored.
                </AlertDescription>
            </Alert>

            <div className="space-y-2">
                <Label className="text-slate-300">ROD Address *</Label>
                <div className="relative">
                    <Input
                        value={address}
                        onChange={(e) => { setAddress(e.target.value); validateAddress(e.target.value); }}
                        placeholder="R..."
                        className="bg-slate-800/50 border-slate-700 text-white pr-10 font-mono"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {validating ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> :
                         addressValid === true ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
                         addressValid === false ? <AlertCircle className="w-4 h-4 text-red-400" /> : null}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-slate-300">Label *</Label>
                <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., Exchange Deposit, Cold Storage"
                    className="bg-slate-800/50 border-slate-700 text-white"
                />
            </div>

            <Button
                onClick={handleImport}
                disabled={importing || !addressValid || !label.trim()}
                className="w-full bg-slate-700 hover:bg-slate-600 h-12"
            >
                {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> :
                             <><Eye className="w-4 h-4 mr-2" />Add Watch-Only Wallet</>}
            </Button>
        </div>
    );
}

// ─── Spendable (Private Key) Import ──────────────────────────────────────────
function SpendableImport({ account, onDone }) {
    const [privateKey, setPrivateKey] = useState('');
    const [label, setLabel] = useState('');
    const [importing, setImporting] = useState(false);

    const handleImport = async () => {
        if (!privateKey.trim()) { toast.error('Please enter your WIF private key'); return; }
        if (!label.trim()) { toast.error('Please enter a label'); return; }

        setImporting(true);
        const response = await base44.functions.invoke('importSpendableWallet', {
            private_key_wif: privateKey.trim(),
            label: label.trim()
        });

        if (response.data?.error) {
            toast.error(response.data.error);
            setImporting(false);
            return;
        }

        toast.success(`Spendable wallet "${label}" imported. Address: ${response.data.wallet_address}`);
        setPrivateKey(''); setLabel('');
        setImporting(false);
        if (onDone) onDone();
    };

    return (
        <div className="space-y-5">
            <Alert className="bg-amber-500/10 border-amber-500/30">
                <Key className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-300/80 text-sm">
                    <strong className="text-amber-200">Spendable import.</strong> Your private key is verified 
                    against your connected ROD node, then encrypted and stored server-side using the same 
                    secure scheme as app-generated wallets. The raw key is never returned to the browser.
                </AlertDescription>
            </Alert>

            <Alert className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300/80 text-sm">
                    An active RPC node connection is required. The node validates the key and derives the 
                    address server-side. If you have no node configured, use watch-only import instead.
                </AlertDescription>
            </Alert>

            <div className="space-y-2">
                <Label className="text-slate-300">WIF Private Key *</Label>
                <Input
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="WIF-encoded private key (starts with 5, K, or L)"
                    className="bg-slate-800/50 border-slate-700 text-white font-mono"
                />
                <p className="text-xs text-slate-500">
                    Paste the WIF key exactly as exported from your ROD Core wallet (File → Export Private Key).
                </p>
            </div>

            <div className="space-y-2">
                <Label className="text-slate-300">Label *</Label>
                <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., Mining Wallet, Old Node Wallet"
                    className="bg-slate-800/50 border-slate-700 text-white"
                />
            </div>

            <Button
                onClick={handleImport}
                disabled={importing || !privateKey.trim() || !label.trim()}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 h-12"
            >
                {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> :
                             <><Key className="w-4 h-4 mr-2" />Import Spendable Wallet</>}
            </Button>
        </div>
    );
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function WalletImport({ account, onWalletImported }) {
    const [tab, setTab] = useState('watchonly');

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
                                Add an existing ROD address to monitor, or import a private key to spend
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={tab} onValueChange={setTab}>
                        <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-5">
                            <TabsTrigger value="watchonly" className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />Watch-Only
                            </TabsTrigger>
                            <TabsTrigger value="spendable" className="flex items-center gap-2">
                                <Key className="w-4 h-4" />Spendable (Private Key)
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="watchonly">
                            <WatchOnlyImport account={account} onDone={onWalletImported} />
                        </TabsContent>

                        <TabsContent value="spendable">
                            <SpendableImport account={account} onDone={onWalletImported} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </motion.div>
    );
}