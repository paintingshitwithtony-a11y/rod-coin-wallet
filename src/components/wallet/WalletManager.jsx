import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    Wallet, Plus, Download, Upload, CheckCircle2, 
    Trash2, Edit2, Eye, EyeOff, Copy, Settings, Pencil, ShieldCheck,
    AlertTriangle, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import WalletCreator from './WalletCreator';
import WalletBackup from './WalletBackup';
import WalletRestore from './WalletRestore';
import WalletRecoveryInfo from './WalletRecoveryInfo';

const WALLET_COLORS = [
    { name: 'Purple', class: 'from-purple-500 to-purple-700' },
    { name: 'Blue', class: 'from-blue-500 to-blue-700' },
    { name: 'Green', class: 'from-green-500 to-green-700' },
    { name: 'Amber', class: 'from-amber-500 to-amber-700' },
    { name: 'Pink', class: 'from-pink-500 to-pink-700' },
    { name: 'Cyan', class: 'from-cyan-500 to-cyan-700' }
];

export default function WalletManager({ account, currentWallet, onWalletSwitch, onWalletCreated, onClose }) {
     const [wallets, setWallets] = useState([]);
     const [loading, setLoading] = useState(true);
     const [showCreate, setShowCreate] = useState(false);
     const [showBackup, setShowBackup] = useState(null);
     const [showRestore, setShowRestore] = useState(false);
     const [totalBalance, setTotalBalance] = useState(0);
     const [editingWallet, setEditingWallet] = useState(null);
     const [editName, setEditName] = useState('');
     const [showRootWalletSetup, setShowRootWalletSetup] = useState(false);
     const [rootWalletPassphrase, setRootWalletPassphrase] = useState('');
     const [rootWalletLoading, setRootWalletLoading] = useState(false);
     const [recoveryInfo, setRecoveryInfo] = useState(null);

    useEffect(() => {
        fetchWallets();
    }, [account]);

    const fetchWallets = async () => {
        setLoading(true);
        try {
            // Fetch fresh account data
            const accounts = await base44.entities.WalletAccount.filter({ id: account.id });
            const freshAccount = accounts.length > 0 ? accounts[0] : account;

            const walletList = await base44.entities.Wallet.filter(
                { account_id: account.id },
                '-created_date',
                100
            );
            
            // Always include main account wallet with fresh balance
            const mainWallet = {
                id: 'main-account',
                account_id: account.id,
                name: 'Main Wallet',
                wallet_address: freshAccount.wallet_address,
                balance: freshAccount.balance || 0,
                is_active: walletList.length === 0 || !walletList.some(w => w.is_active),
                wallet_type: 'standard',
                color: 'from-purple-500 to-purple-700'
            };
            
            const allWallets = [mainWallet, ...walletList];
            setWallets(allWallets);
            
            const total = allWallets.reduce((sum, w) => sum + (w.balance || 0), 0);
            setTotalBalance(total);
        } catch (err) {
            toast.error('Failed to load wallets');
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchWallet = async (wallet) => {
        try {
            // Set all wallets to inactive (skip main account)
            await Promise.all(
                wallets.filter(w => w.id !== 'main-account').map(w => 
                    base44.entities.Wallet.update(w.id, { is_active: false })
                )
            );
            
            // Set selected wallet as active (without changing its name/alias)
            if (wallet.id !== 'main-account') {
                await base44.entities.Wallet.update(wallet.id, { is_active: true });
            }
            
            toast.success(`Switched to ${wallet.name}`);
            onWalletSwitch(wallet);
            onClose();
        } catch (err) {
            toast.error('Failed to switch wallet');
        }
    };

    const handleStartEdit = (wallet) => {
        if (wallet.id === 'main-account') {
            toast.error('Cannot rename main wallet');
            return;
        }
        setEditingWallet(wallet.id);
        setEditName(wallet.name);
    };

    const handleSaveEdit = async (walletId) => {
        try {
            await base44.entities.Wallet.update(walletId, { name: editName });
            toast.success('Wallet name updated');
            setEditingWallet(null);
            fetchWallets();
        } catch (err) {
            toast.error('Failed to update wallet name');
        }
    };

    const handleDeleteWallet = async (wallet) => {
        if (wallet.id === 'main-account') {
            toast.error('Cannot delete main wallet');
            return;
        }

        if (wallets.length <= 2) {
            toast.error('Cannot delete your only additional wallet');
            return;
        }

        if (!confirm(`Delete wallet "${wallet.name}"? This cannot be undone!`)) {
            return;
        }

        try {
            await base44.entities.Wallet.delete(wallet.id);
            toast.success('Wallet deleted');
            fetchWallets();
        } catch (err) {
            toast.error('Failed to delete wallet');
        }
    };

    const handleCreateRootWallet = async () => {
        if (!rootWalletPassphrase.trim()) {
            toast.error('Please enter a passphrase');
            return;
        }

        setRootWalletLoading(true);
        try {
            const response = await base44.functions.invoke('createRootWallet', {
                passphrase: rootWalletPassphrase
            });

            if (response.data.error) {
                toast.error(response.data.error);
                return;
            }

            setRecoveryInfo(response.data);
            setShowRootWalletSetup(false);
            setRootWalletPassphrase('');
            fetchWallets();
            toast.success('Root wallet created successfully');
        } catch (err) {
            toast.error('Failed to create root wallet');
        } finally {
            setRootWalletLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-3">
                        <Wallet className="w-6 h-6 text-purple-400" />
                        Wallet Manager
                    </DialogTitle>
                </DialogHeader>

                {/* Total Balance Overview */}
                <Card className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 border-purple-500/30">
                    <CardContent className="p-6">
                        <p className="text-sm text-slate-400 mb-2">Total Balance Across All Wallets</p>
                        <p className="text-4xl font-bold text-white">
                            {totalBalance.toFixed(4)}
                            <span className="text-xl text-slate-400 ml-2">ROD</span>
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            {wallets.length} {wallets.length === 1 ? 'wallet' : 'wallets'} • {wallets.filter(w => w.is_active).length} active
                        </p>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                    <Button
                        onClick={() => setShowCreate(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Wallet
                    </Button>
                    <Button
                        onClick={() => setShowRootWalletSetup(true)}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Create Root Wallet
                    </Button>
                    <Button
                        onClick={() => setShowRestore(true)}
                        variant="outline"
                        className="border-slate-700 text-slate-300"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Restore Wallet
                    </Button>
                </div>

                {/* Wallet List */}
                <div className="space-y-3">
                    {loading ? (
                        <p className="text-center text-slate-400 py-8">Loading wallets...</p>
                    ) : wallets.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">No wallets found</p>
                    ) : (
                        wallets.map((wallet, index) => (
                            <motion.div
                                key={wallet.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className={`border-slate-700 ${wallet.is_active ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-800/50'}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${wallet.color || 'from-purple-500 to-purple-700'} flex items-center justify-center`}>
                                                <Wallet className="w-6 h-6 text-white" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {editingWallet === wallet.id ? (
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            onBlur={() => handleSaveEdit(wallet.id)}
                                                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(wallet.id)}
                                                            className="bg-slate-900 text-white px-2 py-1 rounded border border-purple-500 text-sm font-semibold"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <>
                                                            <h3 className="font-semibold text-white">{wallet.name}</h3>
                                                            <button
                                                                onClick={() => handleStartEdit(wallet)}
                                                                className="text-slate-500 hover:text-purple-400 transition-colors">
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {wallet.is_active && (
                                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Active
                                                        </Badge>
                                                    )}
                                                    {wallet.id !== 'main-account' && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {wallet.wallet_type}
                                                        </Badge>
                                                    )}
                                                    {wallet.id !== 'main-account' && wallet.wallet_type === 'standard' && (
                                                        wallet.encrypted_private_key ? (
                                                            <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                                                                <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80] inline-block" />
                                                                Properly Encrypted
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                                                                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                                                                Key Not Stored
                                                            </span>
                                                        )
                                                    )}
                                                    </div>
                                                <p className="text-sm text-amber-400/80 font-mono truncate">
                                                    {wallet.wallet_address}
                                                </p>
                                                <p className="text-lg font-bold text-white mt-1">
                                                    {(wallet.balance || 0).toFixed(4)} ROD
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                {!wallet.is_active && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSwitchWallet(wallet)}
                                                        className="bg-purple-600 hover:bg-purple-700"
                                                    >
                                                        Switch
                                                    </Button>
                                                )}
                                                {wallet.id !== 'main-account' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setShowBackup(wallet)}
                                                            className="border-slate-700"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDeleteWallet(wallet)}
                                                            className="border-slate-700 text-red-400 hover:text-red-300"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Modals */}
                {showCreate && (
                    <WalletCreator
                        account={account}
                        onClose={() => setShowCreate(false)}
                        onCreated={(newWallet) => {
                            setShowCreate(false);
                            fetchWallets();
                            if (onWalletCreated) {
                                onWalletCreated(newWallet);
                            }
                        }}
                    />
                )}

                {showBackup && (
                    <WalletBackup
                        wallet={showBackup}
                        account={account}
                        onClose={() => setShowBackup(null)}
                    />
                )}

                {showRestore && (
                    <WalletRestore
                        account={account}
                        onClose={() => setShowRestore(false)}
                        onRestored={() => {
                            setShowRestore(false);
                            fetchWallets();
                        }}
                    />
                )}

                {/* Root Wallet Setup Modal */}
                {showRootWalletSetup && (
                    <Dialog open={true} onOpenChange={() => !rootWalletLoading && setShowRootWalletSetup(false)}>
                        <DialogContent className="bg-slate-900 border-slate-700 text-white">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-red-400">
                                    <ShieldCheck className="w-5 h-5" />
                                    Create Root Wallet
                                </DialogTitle>
                            </DialogHeader>
                            <Alert className="bg-amber-900/20 border-amber-700">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <AlertDescription className="text-amber-200">
                                    This creates a new encrypted wallet at the node level. You must save the passphrase and private key.
                                </AlertDescription>
                            </Alert>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-slate-300 text-sm font-semibold block mb-2">Encryption Passphrase</label>
                                    <Input
                                        type="password"
                                        value={rootWalletPassphrase}
                                        onChange={(e) => setRootWalletPassphrase(e.target.value)}
                                        placeholder="Enter a strong passphrase"
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowRootWalletSetup(false)}
                                        disabled={rootWalletLoading}
                                        className="flex-1 border-slate-700"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateRootWallet}
                                        disabled={rootWalletLoading}
                                        className="flex-1 bg-red-600 hover:bg-red-700"
                                    >
                                        {rootWalletLoading ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                                        ) : (
                                            'Create Wallet'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Recovery Info Modal */}
                <WalletRecoveryInfo
                    isOpen={!!recoveryInfo}
                    onClose={() => setRecoveryInfo(null)}
                    walletData={recoveryInfo}
                />
            </DialogContent>
        </Dialog>
    );
}