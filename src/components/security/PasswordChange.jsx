import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Simple hash function for password
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'rod_wallet_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PasswordChange({ account }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // Verify current password
            const currentHash = await hashPassword(currentPassword);
            if (currentHash !== account.password_hash) {
                setError('Current password is incorrect');
                setLoading(false);
                return;
            }

            // Validate new password
            if (newPassword.length < 8) {
                setError('New password must be at least 8 characters');
                setLoading(false);
                return;
            }

            if (newPassword !== confirmPassword) {
                setError('New passwords do not match');
                setLoading(false);
                return;
            }

            if (newPassword === currentPassword) {
                setError('New password must be different from current password');
                setLoading(false);
                return;
            }

            // Update password
            const newHash = await hashPassword(newPassword);
            await base44.entities.WalletAccount.update(account.id, {
                password_hash: newHash
            });

            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            toast.success('Password changed successfully');

            // Clear success message after 5 seconds
            setTimeout(() => setSuccess(false), 5000);
        } catch (err) {
            setError('Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-900/80 border-slate-700/50">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                        <Lock className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <CardTitle className="text-white">Change Password</CardTitle>
                        <CardDescription className="text-slate-400">
                            Update your account password
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Current Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                type={showPasswords ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="bg-slate-800/50 border-slate-700 text-white pl-10 pr-10"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                type={showPasswords ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 8 chars)"
                                className="bg-slate-800/50 border-slate-700 text-white pl-10 pr-10"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Confirm New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                type={showPasswords ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="bg-slate-800/50 border-slate-700 text-white pl-10 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="bg-red-900/30 border-red-500/50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Alert className="bg-green-900/30 border-green-500/50">
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                                <AlertDescription className="text-green-400">
                                    Password changed successfully!
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating Password...
                            </>
                        ) : (
                            <>
                                <Lock className="w-4 h-4 mr-2" />
                                Change Password
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}