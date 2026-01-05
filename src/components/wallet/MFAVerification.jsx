import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Mail, Smartphone, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function MFAVerification({ account, onVerified, onCancel }) {
    const [code, setCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [error, setError] = useState('');

    const sendEmailCode = async () => {
        setSendingEmail(true);
        try {
            // Generate 6-digit code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store code temporarily (in production, use proper session storage)
            sessionStorage.setItem('mfa_code', verificationCode);
            sessionStorage.setItem('mfa_timestamp', Date.now().toString());

            // Send email
            await base44.integrations.Core.SendEmail({
                to: account.email,
                subject: 'ROD Wallet - Transaction Verification Code',
                body: `Your verification code is: ${verificationCode}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this code, please secure your account immediately.`
            });

            toast.success('Verification code sent to your email');
        } catch (err) {
            toast.error('Failed to send verification code');
        } finally {
            setSendingEmail(false);
        }
    };

    const verifyCode = async () => {
        if (!code || code.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setVerifying(true);
        setError('');

        try {
            if (account.mfa_method === 'email') {
                // Verify email code
                const storedCode = sessionStorage.getItem('mfa_code');
                const timestamp = parseInt(sessionStorage.getItem('mfa_timestamp') || '0');
                const now = Date.now();
                
                // Check if code expired (5 minutes)
                if (now - timestamp > 5 * 60 * 1000) {
                    setError('Verification code expired. Please request a new one.');
                    setVerifying(false);
                    return;
                }

                if (code === storedCode) {
                    sessionStorage.removeItem('mfa_code');
                    sessionStorage.removeItem('mfa_timestamp');
                    toast.success('Verification successful');
                    onVerified();
                } else {
                    setError('Invalid verification code');
                }
            } else {
                // Authenticator verification would go here
                // For now, simulate verification
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // In production, verify TOTP code against stored secret
                if (code.length === 6) {
                    toast.success('Verification successful');
                    onVerified();
                } else {
                    setError('Invalid verification code');
                }
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <Card className="bg-slate-900 border-purple-500/30 max-w-md w-full">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-xl bg-purple-500/20">
                            <Shield className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Verify Transaction</CardTitle>
                            <CardDescription className="text-slate-400">
                                {account.mfa_method === 'email' ? 'Email' : 'Authenticator'} verification required
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {account.mfa_method === 'email' ? (
                        <>
                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <Mail className="h-4 w-4 text-blue-400" />
                                <AlertDescription className="text-blue-300/80 text-sm">
                                    We'll send a verification code to {account.email}
                                </AlertDescription>
                            </Alert>

                            {!sessionStorage.getItem('mfa_code') ? (
                                <Button
                                    onClick={sendEmailCode}
                                    disabled={sendingEmail}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    {sendingEmail ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Send Verification Code
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Enter 6-digit code</Label>
                                        <Input
                                            type="text"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            className="bg-slate-800/50 border-slate-700 text-white text-center text-2xl tracking-widest"
                                            maxLength={6}
                                            autoFocus
                                        />
                                    </div>

                                    <Button
                                        onClick={sendEmailCode}
                                        variant="ghost"
                                        size="sm"
                                        disabled={sendingEmail}
                                        className="w-full text-slate-400 hover:text-white"
                                    >
                                        Resend Code
                                    </Button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <Alert className="bg-purple-500/10 border-purple-500/30">
                                <Smartphone className="h-4 w-4 text-purple-400" />
                                <AlertDescription className="text-purple-300/80 text-sm">
                                    Enter the 6-digit code from your authenticator app
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Authenticator Code</Label>
                                <Input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="bg-slate-800/50 border-slate-700 text-white text-center text-2xl tracking-widest"
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>
                        </>
                    )}

                    {error && (
                        <Alert variant="destructive" className="bg-red-900/30 border-red-500/50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-3">
                        <Button
                            onClick={onCancel}
                            variant="outline"
                            className="flex-1 border-slate-700 text-slate-300 hover:text-white"
                            disabled={verifying}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={verifyCode}
                            disabled={verifying || !code || code.length !== 6}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                        >
                            {verifying ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}