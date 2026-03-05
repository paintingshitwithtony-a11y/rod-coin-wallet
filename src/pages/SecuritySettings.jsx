import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Toaster } from 'sonner';
import PasswordChange from '@/components/security/PasswordChange';
import SessionManagement from '@/components/security/SessionManagement';
import TwoFactorAuth from '@/components/security/TwoFactorAuth';
import WalletPassphraseSettings from '@/components/security/WalletPassphraseSettings';

export default function SecuritySettings() {
    const [account, setAccount] = useState(null);
    const [currentSessionToken, setCurrentSessionToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAccount = async () => {
            try {
                const savedSession = localStorage.getItem('rod_wallet_session');
                if (savedSession) {
                    const parsed = JSON.parse(savedSession);
                    const accounts = await base44.entities.WalletAccount.filter({ id: parsed.id });
                    if (accounts.length > 0) {
                        setAccount(accounts[0]);
                        setCurrentSessionToken(parsed.sessionToken);
                    }
                }
            } catch (err) {
                console.error('Failed to load account:', err);
            } finally {
                setLoading(false);
            }
        };

        loadAccount();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!account) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-400 mb-4">Please log in to access security settings</p>
                    <Link to={createPageUrl('Wallet')}>
                        <Button className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600">
                            Go to Wallet
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Link to={createPageUrl('Wallet')}>
                        <Button
                            variant="ghost"
                            className="text-slate-400 hover:text-white mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Wallet
                        </Button>
                    </Link>
                    
                    <div className="flex items-center gap-4">
                            <div className="relative p-6 rounded-xl bg-gradient-to-br from-purple-500 to-amber-500">
                                <Shield className="w-20 h-20 text-white" />
                                <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xs tracking-wider" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>
                                    SECURITY
                                </span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Security Settings</h1>
                                <p className="text-slate-400 mt-1">
                                    Manage your account security and privacy
                                </p>
                            </div>
                        </div>
                </motion.div>

                {/* Account Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Account Email</p>
                            <p className="text-white font-medium">{account.email}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-400">Primary Wallet</p>
                            <p className="text-amber-400 font-mono text-sm">
                                {account.wallet_address.slice(0, 8)}...{account.wallet_address.slice(-6)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Security Sections */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <PasswordChange account={account} />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <SessionManagement 
                            account={account} 
                            currentSessionToken={currentSessionToken}
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <TwoFactorAuth account={account} />
                    </motion.div>
                </div>

                {/* Footer Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
                >
                    <p className="text-xs text-slate-500 text-center">
                        Always keep your credentials secure and never share your password or private keys with anyone.
                    </p>
                </motion.div>
            </div>

            <Toaster 
                position="bottom-right" 
                theme="dark"
                toastOptions={{
                    style: {
                        background: 'rgb(30 30 40)',
                        border: '1px solid rgb(75 75 100)',
                        color: 'white'
                    }
                }}
            />
        </div>
    );
}