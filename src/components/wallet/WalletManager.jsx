import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { 
    Wallet, Plus, Download, Upload, CheckCircle2, 
    Trash2, Pencil, AlertTriangle, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import WalletCreator from './WalletCreator';
import WalletBackup from './WalletBackup';
import WalletRestore from './WalletRestore';
import WalletBulkActions from './WalletBulkActions';

const WALLET_COLORS = [
    { name: 'Purple', class: 'from-purple-500 to-purple-700' },
    { name: 'Blue', class: 'from-blue-500 to-blue-700' },
    { name: 'Green', class: 'from-green-500 to-green-700' },
    { name: 'Amber', class: 'from-amber-500 to-amber-700' },
    { name: 'Pink', class: 'from-pink-500 to-pink-700' },
    { name: 'Cyan', class: 'from-cyan-500 to-cyan-700' }
];

const normalizeAddress = (address) => (address || '').trim().toLowerCase();

const uniqueWalletsByAddress = (wallets) => {
    const byAddress = new Map();
    wallets.forEach((wallet) => {
        const key = normalizeAddress(wallet.wallet_address);
        if (!key || byAddress.has(key)) return;
        byAddress.set(key, wallet);
    });
    return Array.from(byAddress.values());
};

export default function WalletManager({ account, currentWallet, onWalletSwitch, onWalletCreated, onClose }) {
     const [wallets, setWallets] = useState([]);
     const [loading, setLoading] = useState(true);
     const [showCreate, setShowCreate] = useState(false);
     const [showBackup, setShowBackup] = useState(null);
     const [showRestore, setShowRestore] = useState(false);
     const [totalBalance, setTotalBalance] = useState(0);
     const [editingWallet, setEditingWallet] = useState(null);
     const [editName, setEditName] = useState('');
     const [selectedWalletIds, setSelectedWalletIds] = useState([]);
     const [deletingSelected, setDeletingSelected] = useState(false);

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
            const deletedWalletAddressKeys = new Set((freshAccount.deleted_wallet_addresses || []).map(normalizeAddress));
            const staleDeletedWallets = walletList.filter((wallet) => deletedWalletAddressKeys.has(normalizeAddress(wallet.wallet_address)));
            if (staleDeletedWallets.length > 0) {
                await Promise.all(staleDeletedWallets.map((wallet) => base44.entities.Wallet.delete(wallet.id)));
            }
            const visibleWalletList = walletList.filter((wallet) => !deletedWalletAddressKeys.has(normalizeAddress(wallet.wallet_address)));
            
            // Always include main account wallet with fresh balance
            const mainWallet = {
                id: 'main-account',
                account_id: account.id,
                name: 'Main Wallet',
                wallet_address: freshAccount.wallet_address,
                balance: freshAccount.balance || 0,
                is_active: visibleWalletList.length === 0 || !visibleWalletList.some(w => w.is_active),
                wallet_type: 'standard',
                color: 'from-purple-500 to-purple-700'
            };
            
            const allWallets = uniqueWalletsByAddress([mainWallet, ...visibleWalletList]);
            let walletsWithUtxos = allWallets.map((wallet) => ({
                ...wallet,
                spendableBalance: wallet.balance || 0,
                utxoCount: 0
            }));

            try {
                const response = await base44.functions.invoke('executeRPCCommand', {
                    method: 'listunspent',
                    params: [0, 9999999]
                });

                if (response.data.success) {
                    const utxoByAddress = {};
                    allWallets.forEach((wallet) => {
                        utxoByAddress[normalizeAddress(wallet.wallet_address)] = { balance: 0, count: 0 };
                    });

                    (response.data.result || []).forEach((utxo) => {
                        const key = normalizeAddress(utxo.address);
                        if (utxoByAddress[key]) {
                            utxoByAddress[key].balance = parseFloat((utxoByAddress[key].balance + Number(utxo.amount || 0)).toFixed(8));
                            utxoByAddress[key].count += 1;
                        }
                    });

                    walletsWithUtxos = allWallets.map((wallet) => {
                        const utxoInfo = utxoByAddress[normalizeAddress(wallet.wallet_address)] || { balance: wallet.balance || 0, count: 0 };
                        return {
                            ...wallet,
                            balance: utxoInfo.balance,
                            spendableBalance: utxoInfo.balance,
                            utxoCount: utxoInfo.count
                        };
                    });
                }
            } catch (err) {
                console.warn('Failed to load wallet UTXOs:', err.message);
            }

            setWallets(walletsWithUtxos);
            setSelectedWalletIds((prev) => prev.filter((id) => walletsWithUtxos.some((wallet) => wallet.id === id && wallet.id !== 'main-account')));
            
            const total = walletsWithUtxos.reduce((sum, w) => sum + (w.spendableBalance || 0), 0);
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

    const toggleWalletSelection = (walletId) => {
        setSelectedWalletIds((prev) =>
            prev.includes(walletId) ? prev.filter((id) => id !== walletId) : [...prev, walletId]
        );
    };

    const selectAllRemovableWallets = () => {
        setSelectedWalletIds(wallets.filter((wallet) => wallet.id !== 'main-account').map((wallet) => wallet.id));
    };

    const handleDeleteSelectedWallets = async () => {
        const selectedWallets = wallets.filter((wallet) => selectedWalletIds.includes(wallet.id) && wallet.id !== 'main-account');

        if (selectedWallets.length === 0) {
            toast.error('Select at least one wallet to remove');
            return;
        }

        if (wallets.length - selectedWallets.length <= 1) {
            toast.error('Cannot delete all additional wallets');
            return;
        }

        if (!confirm(`Delete ${selectedWallets.length} selected wallet(s)? This cannot be undone!`)) {
            return;
        }

        setDeletingSelected(true);
        try {
            await Promise.all(selectedWallets.map((wallet) => base44.entities.Wallet.delete(wallet.id)));

            const deletedAddressKeys = new Set(selectedWallets.map((wallet) => normalizeAddress(wallet.wallet_address)));
            const accounts = await base44.entities.WalletAccount.filter({ id: account.id });
            if (accounts.length > 0) {
                const updatedAdditionalAddresses = (accounts[0].additional_addresses || []).filter(
                    (addr) => !deletedAddressKeys.has(normalizeAddress(addr.address))
                );
                const deletedWalletAddresses = Array.from(new Set([
                    ...(accounts[0].deleted_wallet_addresses || []),
                    ...selectedWallets.map((wallet) => wallet.wallet_address)
                ]));
                await base44.entities.WalletAccount.update(account.id, {
                    additional_addresses: updatedAdditionalAddresses,
                    deleted_wallet_addresses: deletedWalletAddresses
                });
                account.additional_addresses = updatedAdditionalAddresses;
                account.deleted_wallet_addresses = deletedWalletAddresses;
            }

            toast.success(`${selectedWallets.length} wallet(s) deleted`);
            setSelectedWalletIds([]);
            fetchWallets();
        } catch (err) {
            toast.error('Failed to delete selected wallets');
        } finally {
            setDeletingSelected(false);
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

            const accounts = await base44.entities.WalletAccount.filter({ id: account.id });
            if (accounts.length > 0) {
                const deletedAddressKey = normalizeAddress(wallet.wallet_address);
                const updatedAdditionalAddresses = (accounts[0].additional_addresses || []).filter(
                    (addr) => normalizeAddress(addr.address) !== deletedAddressKey
                );
                const deletedWalletAddresses = Array.from(new Set([
                    ...(accounts[0].deleted_wallet_addresses || []),
                    wallet.wallet_address
                ]));
                await base44.entities.WalletAccount.update(account.id, {
                    additional_addresses: updatedAdditionalAddresses,
                    deleted_wallet_addresses: deletedWalletAddresses
                });
                account.additional_addresses = updatedAdditionalAddresses;
                account.deleted_wallet_addresses = deletedWalletAddresses;
            }

            toast.success('Wallet deleted');
            setSelectedWalletIds((prev) => prev.filter((id) => id !== wallet.id));
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
                <WalletBulkActions
                    selectedCount={selectedWalletIds.length}
                    removableCount={wallets.filter((wallet) => wallet.id !== 'main-account').length}
                    deleting={deletingSelected}
                    onSelectAll={selectAllRemovableWallets}
                    onClear={() => setSelectedWalletIds([])}
                    onDelete={handleDeleteSelectedWallets}
                />
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
                                            {wallet.id !== 'main-account' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedWalletIds.includes(wallet.id)}
                                                    onChange={() => toggleWalletSelection(wallet.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-4 h-4 accent-purple-600"
                                                    aria-label={`Select ${wallet.name}`}
                                                />
                                            )}
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
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <p className="text-lg font-bold text-white">
                                                        {(wallet.spendableBalance ?? wallet.balance ?? 0).toFixed(4)} ROD
                                                    </p>
                                                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs">
                                                        {wallet.utxoCount || 0} UTXO{wallet.utxoCount === 1 ? '' : 's'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-500">Spendable unspent outputs</p>
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


            </DialogContent>
        </Dialog>
    );
}