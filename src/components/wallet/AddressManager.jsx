import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
    Edit, Upload, Download, Star, Eye, EyeOff,
    AlertCircle, CheckCircle2, FileJson, FileSpreadsheet, Tag
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AddressManager({ account, addresses, onUpdate }) {
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [formData, setFormData] = useState({
        alias: '',
        category: 'personal',
        watch_only: false,
        notes: ''
    });
    const [importing, setImporting] = useState(false);

    const categoryColors = {
        personal: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        business: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
        savings: 'bg-green-500/20 text-green-400 border-green-500/50',
        trading: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        mining: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
        other: 'bg-slate-500/20 text-slate-400 border-slate-500/50'
    };

    const handleEdit = (addr) => {
        setEditingAddress(addr);
        
        // Find the address in additional_addresses to get full data
        const fullAddr = account.additional_addresses?.find(a => a.address === addr.address);
        
        setFormData({
            alias: fullAddr?.alias || addr.label || '',
            category: fullAddr?.category || 'personal',
            watch_only: fullAddr?.watch_only || false,
            notes: fullAddr?.notes || ''
        });
        setShowEditModal(true);
    };

    const handleSave = async () => {
        try {
            const currentAccount = await base44.entities.WalletAccount.filter({ id: account.id });
            if (currentAccount.length === 0) return;

            const updatedAddresses = (currentAccount[0].additional_addresses || []).map(addr => {
                if (addr.address === editingAddress.address) {
                    return {
                        ...addr,
                        alias: formData.alias,
                        category: formData.category,
                        watch_only: formData.watch_only,
                        notes: formData.notes,
                        label: formData.alias || addr.label // Update label too
                    };
                }
                return addr;
            });

            await base44.entities.WalletAccount.update(account.id, {
                additional_addresses: updatedAddresses
            });

            toast.success('Address updated');
            setShowEditModal(false);
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Failed to update address:', err);
            toast.error('Failed to update address');
        }
    };

    const handleExportJSON = () => {
        const exportData = addresses.map(addr => {
            const fullAddr = account.additional_addresses?.find(a => a.address === addr.address) || {};
            return {
                address: addr.address,
                label: addr.label,
                alias: fullAddr.alias || '',
                category: fullAddr.category || 'personal',
                watch_only: fullAddr.watch_only || false,
                notes: fullAddr.notes || '',
                created_at: addr.createdAt
            };
        });

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rod-addresses-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        
        toast.success('Addresses exported to JSON');
    };

    const handleExportCSV = () => {
        const headers = ['Address', 'Label', 'Alias', 'Category', 'Watch Only', 'Notes', 'Created'];
        const rows = addresses.map(addr => {
            const fullAddr = account.additional_addresses?.find(a => a.address === addr.address) || {};
            return [
                addr.address,
                addr.label || '',
                fullAddr.alias || '',
                fullAddr.category || 'personal',
                fullAddr.watch_only ? 'Yes' : 'No',
                (fullAddr.notes || '').replace(/"/g, '""'),
                addr.createdAt || ''
            ];
        });

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rod-addresses-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        
        toast.success('Addresses exported to CSV');
    };

    const handleImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const content = await file.text();
            let importedAddresses = [];

            // Try JSON first
            try {
                const data = JSON.parse(content);
                importedAddresses = Array.isArray(data) ? data : [data];
            } catch {
                // Try CSV
                const lines = content.split('\n').filter(l => l.trim());
                if (lines.length > 1) {
                    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
                    
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
                        const addressIndex = headers.indexOf('address');
                        
                        if (addressIndex >= 0 && values[addressIndex]) {
                            importedAddresses.push({
                                address: values[addressIndex],
                                label: values[headers.indexOf('label')] || values[headers.indexOf('alias')] || `Imported ${i}`,
                                alias: values[headers.indexOf('alias')] || '',
                                category: values[headers.indexOf('category')] || 'other',
                                watch_only: (values[headers.indexOf('watch only')] || '').toLowerCase() === 'yes',
                                notes: values[headers.indexOf('notes')] || ''
                            });
                        }
                    }
                }
            }

            if (importedAddresses.length === 0) {
                toast.error('No valid addresses found in file');
                return;
            }

            // Add to account
            const currentAccount = await base44.entities.WalletAccount.filter({ id: account.id });
            if (currentAccount.length === 0) return;

            const existingAddresses = currentAccount[0].additional_addresses || [];
            const newAddresses = importedAddresses.filter(
                imported => !existingAddresses.some(existing => existing.address === imported.address)
            );

            if (newAddresses.length === 0) {
                toast.info('All addresses already exist');
                return;
            }

            await base44.entities.WalletAccount.update(account.id, {
                additional_addresses: [
                    ...existingAddresses,
                    ...newAddresses.map(addr => ({
                        ...addr,
                        created_at: new Date().toISOString()
                    }))
                ]
            });

            toast.success(`Imported ${newAddresses.length} address(es)`);
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Import failed:', err);
            toast.error('Failed to import addresses');
        } finally {
            setImporting(false);
            event.target.value = '';
        }
    };

    return (
        <>
            <Card className="bg-slate-900/80 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-purple-400" />
                            Address Management
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('address-import-input').click()}
                                disabled={importing}
                                className="border-slate-600 text-slate-300"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Import
                            </Button>
                            <input
                                id="address-import-input"
                                type="file"
                                accept=".json,.csv"
                                onChange={handleImport}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportJSON}
                                className="border-slate-600 text-slate-300"
                            >
                                <FileJson className="w-4 h-4 mr-2" />
                                JSON
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCSV}
                                className="border-slate-600 text-slate-300"
                            >
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                CSV
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300/80 text-xs">
                            Organize your addresses with categories, aliases, and watch-only mode. Export/import in JSON or CSV format.
                        </AlertDescription>
                    </Alert>

                    {addresses.map((addr, index) => {
                        const fullAddr = account.additional_addresses?.find(a => a.address === addr.address) || {};
                        const category = fullAddr.category || 'personal';
                        const watchOnly = fullAddr.watch_only || false;
                        const alias = fullAddr.alias;

                        return (
                            <motion.div
                                key={addr.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium text-white truncate">
                                                {alias || addr.label}
                                            </p>
                                            <Badge className={categoryColors[category]}>
                                                {category}
                                            </Badge>
                                            {watchOnly && (
                                                <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    Watch-Only
                                                </Badge>
                                            )}
                                            {addr.address === account.wallet_address && (
                                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                                                    <Star className="w-3 h-3 mr-1" />
                                                    Primary
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-amber-400/80 font-mono truncate">
                                            {addr.address}
                                        </p>
                                        {fullAddr.notes && (
                                            <p className="text-xs text-slate-500 mt-1 truncate">
                                                {fullAddr.notes}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(addr)}
                                        className="text-slate-400 hover:text-blue-400 shrink-0"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Edit Modal */}
            {showEditModal && (
                <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle>Edit Address Details</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Customize label, category, and settings for this address
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Address</Label>
                                <Input
                                    value={editingAddress?.address || ''}
                                    disabled
                                    className="bg-slate-800 border-slate-600 font-mono text-xs"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Alias / Custom Name</Label>
                                <Input
                                    value={formData.alias}
                                    onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                                    placeholder="e.g., Savings Wallet, Trading Account"
                                    className="bg-slate-800 border-slate-600"
                                />
                                <p className="text-xs text-slate-500">User-friendly name for this address</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Category</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-600">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="personal">Personal</SelectItem>
                                        <SelectItem value="business">Business</SelectItem>
                                        <SelectItem value="savings">Savings</SelectItem>
                                        <SelectItem value="trading">Trading</SelectItem>
                                        <SelectItem value="mining">Mining</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Notes</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Add notes about this address..."
                                    className="bg-slate-800 border-slate-600 min-h-[80px]"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
                                <div>
                                    <Label className="text-slate-300">Watch-Only Mode</Label>
                                    <p className="text-xs text-slate-500">Monitor balance without sending ability</p>
                                </div>
                                <Switch
                                    checked={formData.watch_only}
                                    onCheckedChange={(checked) => setFormData({ ...formData, watch_only: checked })}
                                />
                            </div>

                            {formData.watch_only && (
                                <Alert className="bg-amber-500/10 border-amber-500/30">
                                    <AlertCircle className="h-4 w-4 text-amber-400" />
                                    <AlertDescription className="text-amber-300/80 text-xs">
                                        Watch-only addresses cannot send transactions. You can monitor balance and receive funds only.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSave}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Save Changes
                                </Button>
                                <Button
                                    onClick={() => setShowEditModal(false)}
                                    variant="outline"
                                    className="border-slate-600"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}