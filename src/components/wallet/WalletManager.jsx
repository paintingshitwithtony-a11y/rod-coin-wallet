import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    Wallet, Plus, Download, Upload, CheckCircle2, 
    Trash2, Edit2, Eye, EyeOff, Copy, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import WalletCreator from './WalletCreator';
import WalletBackup from './WalletBackup';
import WalletRestore from './WalletRestore';

const WALLET_COLORS = [
    { name: 'Purple', class: 'from-purple-500 to-purple-700' },
    { name: 'Blue', class: 'from-blue-500 to-blue-700' },
    { name: 'Green', class: 'from-green-500 to-green-700' },
    { name: 'Amber', class: 'from-amber-500 to-amber-700' },
    { name: 'Pink', class: 'from-pink-500 to-pink-700' },
    { name: 'Cyan', class: 'from-cyan-500 to-cyan-700' }
];

export default function WalletManager({ account, currentWallet, onWalletSwitch, onClose }) {
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showBackup, setShowBackup] = useState(null);
    const [showRestore, setShowRestore] = useState(false);
    const [totalBalance, setTotalBalance] = useState(0);

    useEffect(() => {
        fetchWallets();
    }, [account]);

    const fetchWallets = async () => {
        setLoading(true);
        try {
            const walletList = await base44.entities.Wallet.filter(
                { account_id: account.id },
                '-created_date'
            );
            setWallets(walletList);
            
            const total = walletList.reduce((sum, w) => sum + (w.balance || 0), 0);
            setTotalBalance(total);
        } catch (err) {
            toast.error('Failed to load wallets');
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchWallet = async (wallet) => {
        try {
            // Set all wallets to inactive
            await Promise.all(
                wallets.map(w => 
                    base44.entities.Wallet.update(w.id, { is_active: false })
                )
            );
            
            // Set selected wallet as active
            await base44.entities.Wallet.update(wallet.id, { is_active: true });
            
            toast.success(`Switched to ${wallet.name}`);
            onWalletSwitch(wallet);
            onClose();
        } catch (err) {
            toast.error('Failed to switch wallet');
        }
    };

    const handleDeleteWallet = async (wallet) => {
        if (wallets.length === 1) {
            toast.error('Cannot delete your only wallet');
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
                                                    <h3 className="font-semibold text-white">{wallet.name}</h3>
                                                    {wallet.is_active && (
                                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Active
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-xs">
                                                        {wallet.wallet_type}
                                                    </Badge>
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
                        onCreated={() => {
                            setShowCreate(false);
                            fetchWallets();
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
            </DialogContent>
        </Dialog>
    );
}