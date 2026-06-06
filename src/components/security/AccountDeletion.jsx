import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AccountDeletion({ account }) {
    const [confirmation, setConfirmation] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmation !== 'DELETE') {
            toast.error('Type DELETE to confirm');
            return;
        }
        if (!confirm('Permanently delete this wallet account from the app? This cannot be undone.')) return;

        setDeleting(true);
        const session = JSON.parse(localStorage.getItem('rod_wallet_session') || '{}');
        try {
            const response = await base44.functions.invoke('deleteWalletAccount', {
                accountId: account.id || session.id,
                sessionToken: session.sessionToken || session.token,
                confirmation
            });
            if (response.data?.error) {
                toast.error(response.data.error);
                return;
            }
            localStorage.removeItem('rod_wallet_session');
            toast.success('Wallet account deleted');
            window.location.href = '/Wallet';
        } catch (error) {
            toast.error(error.response?.data?.error || error.message || 'Failed to delete account');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Card className="bg-red-950/30 border-red-500/40">
            <CardHeader>
                <CardTitle className="text-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Delete Wallet Account
                </CardTitle>
                <CardDescription className="text-red-200/70">
                    Permanently removes this wallet account, app wallets, contacts, transactions, sessions, and saved RPC settings from this app.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <Input
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="bg-slate-950/70 border-red-500/40 text-white"
                />
                <Button
                    onClick={handleDelete}
                    disabled={deleting || confirmation !== 'DELETE'}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                    {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Permanently Delete Account
                </Button>
            </CardContent>
        </Card>
    );
}