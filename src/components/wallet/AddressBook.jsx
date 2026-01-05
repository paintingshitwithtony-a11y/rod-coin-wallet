import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    BookUser, Plus, Trash2, Edit2, Check, X, 
    Loader2, AlertCircle, Search, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateRODAddress } from './Base58';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AddressBook({ account, onSelectAddress }) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        label: '',
        address: '',
        notes: ''
    });
    const [validating, setValidating] = useState(false);
    const [addressValid, setAddressValid] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadContacts();
    }, [account]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const data = await base44.entities.AddressBook.filter(
                { account_id: account.id },
                '-created_date'
            );
            setContacts(data);
        } catch (err) {
            console.error('Failed to load contacts:', err);
        } finally {
            setLoading(false);
        }
    };

    const validateAddress = async (address) => {
        if (!address || address.length < 26) {
            setAddressValid(null);
            return;
        }
        
        setValidating(true);
        const result = await validateRODAddress(address);
        setAddressValid(result.valid);
        setValidating(false);
        
        if (!result.valid) {
            toast.error(`Invalid address: ${result.error}`);
        }
    };

    const handleSave = async () => {
        if (!addressValid) {
            toast.error('Please enter a valid ROD address');
            return;
        }

        if (!formData.label.trim()) {
            toast.error('Please enter a label');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                await base44.entities.AddressBook.update(editingId, formData);
                toast.success('Contact updated');
            } else {
                await base44.entities.AddressBook.create({
                    ...formData,
                    account_id: account.id
                });
                toast.success('Contact saved');
            }
            
            setFormData({ label: '', address: '', notes: '' });
            setAddressValid(null);
            setShowForm(false);
            setEditingId(null);
            loadContacts();
        } catch (err) {
            toast.error('Failed to save contact');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (contact) => {
        setFormData({
            label: contact.label,
            address: contact.address,
            notes: contact.notes || ''
        });
        setEditingId(contact.id);
        setAddressValid(true);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this contact?')) return;
        
        try {
            await base44.entities.AddressBook.delete(id);
            toast.success('Contact deleted');
            loadContacts();
        } catch (err) {
            toast.error('Failed to delete contact');
        }
    };

    const handleCancel = () => {
        setFormData({ label: '', address: '', notes: '' });
        setAddressValid(null);
        setShowForm(false);
        setEditingId(null);
    };

    const copyAddress = async (address) => {
        await navigator.clipboard.writeText(address);
        toast.success('Address copied');
    };

    const filteredContacts = contacts.filter(contact =>
        contact.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-purple-500/20">
                        <BookUser className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Address Book</h2>
                        <p className="text-sm text-slate-400">
                            Save and manage frequently used addresses
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                </Button>
            </div>

            {/* Add/Edit Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="bg-slate-900/80 border-purple-500/30">
                            <CardHeader>
                                <CardTitle className="text-white">
                                    {editingId ? 'Edit Contact' : 'Add New Contact'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Label</Label>
                                    <Input
                                        value={formData.label}
                                        onChange={(e) => setFormData({...formData, label: e.target.value})}
                                        placeholder="e.g., Exchange Wallet, Friend's Address"
                                        className="bg-slate-800/50 border-slate-700 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">ROD Address</Label>
                                    <div className="relative">
                                        <Input
                                            value={formData.address}
                                            onChange={(e) => {
                                                setFormData({...formData, address: e.target.value});
                                                validateAddress(e.target.value);
                                            }}
                                            placeholder="Enter ROD address (R...)"
                                            className="bg-slate-800/50 border-slate-700 text-white pr-10 font-mono"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {validating ? (
                                                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                            ) : addressValid === true ? (
                                                <Check className="w-4 h-4 text-green-400" />
                                            ) : addressValid === false ? (
                                                <AlertCircle className="w-4 h-4 text-red-400" />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Notes (optional)</Label>
                                    <Textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                        placeholder="Add notes about this contact..."
                                        className="bg-slate-800/50 border-slate-700 text-white h-20"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleSave}
                                        disabled={!addressValid || !formData.label || saving}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                {editingId ? 'Update' : 'Save'}
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleCancel}
                                        variant="outline"
                                        className="border-slate-700 text-slate-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search */}
            {contacts.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search contacts..."
                        className="bg-slate-900/50 border-slate-700 text-white pl-10"
                    />
                </div>
            )}

            {/* Contacts List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            ) : filteredContacts.length > 0 ? (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {filteredContacts.map((contact, index) => (
                            <motion.div
                                key={contact.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="bg-slate-900/50 border-slate-700/50 hover:border-purple-500/50 transition-all">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold text-white mb-1">
                                                    {contact.label}
                                                </h3>
                                                <p className="text-sm text-amber-400 font-mono mb-2 break-all">
                                                    {contact.address}
                                                </p>
                                                {contact.notes && (
                                                    <p className="text-xs text-slate-500">
                                                        {contact.notes}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-1 ml-4">
                                                {onSelectAddress && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => onSelectAddress(contact.address)}
                                                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                                        title="Use in Send form"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => copyAddress(contact.address)}
                                                    className="text-slate-400 hover:text-white"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleEdit(contact)}
                                                    className="text-slate-400 hover:text-white"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(contact.id)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : searchQuery ? (
                <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardContent className="text-center py-12">
                        <p className="text-slate-400">No contacts match your search</p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardContent className="text-center py-12">
                        <BookUser className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 mb-4">No contacts saved yet</p>
                        <Button
                            onClick={() => setShowForm(true)}
                            className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Contact
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Alert className="bg-slate-800/30 border-slate-700/50">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                <AlertDescription className="text-slate-400 text-sm">
                    Always verify addresses before sending. Saved addresses are stored locally in your account.
                </AlertDescription>
            </Alert>
        </div>
    );
}