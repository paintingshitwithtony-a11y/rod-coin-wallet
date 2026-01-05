import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import WalletConnect from '@/components/wallet/WalletConnect';
import WalletDashboard from '@/components/wallet/WalletDashboard';
import { Toaster } from 'sonner';

export default function Wallet() {
    const [connection, setConnection] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing connection in localStorage
        const savedConnection = localStorage.getItem('rod_wallet_connection');
        if (savedConnection) {
            try {
                const parsed = JSON.parse(savedConnection);
                // Check if connection is still valid (within 24 hours)
                if (parsed.timestamp && Date.now() - parsed.timestamp < 86400000) {
                    setConnection(parsed);
                }
            } catch (e) {
                localStorage.removeItem('rod_wallet_connection');
            }
        }
        setIsLoading(false);
    }, []);

    const handleConnect = (connectionInfo) => {
        setConnection(connectionInfo);
        localStorage.setItem('rod_wallet_connection', JSON.stringify(connectionInfo));
    };

    const handleDisconnect = () => {
        setConnection(null);
        localStorage.removeItem('rod_wallet_connection');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-3xl" />
                
                {/* Stars */}
                {[...Array(50)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            opacity: Math.random() * 0.5 + 0.2
                        }}
                        animate={{
                            opacity: [0.2, 0.8, 0.2],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{
                            duration: Math.random() * 3 + 2,
                            repeat: Infinity,
                            delay: Math.random() * 2
                        }}
                    />
                ))}
            </div>

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <span className="text-2xl font-black text-white">R</span>
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                                <span className="text-[8px] font-bold text-slate-900">◆</span>
                            </div>
                        </div>
                        <div className="text-left">
                            <h1 className="text-3xl font-bold text-white tracking-tight">ROD Wallet</h1>
                            <p className="text-sm text-purple-400">SpaceXpanse ROD Coin</p>
                        </div>
                    </div>
                    {!connection && (
                        <p className="text-slate-400 max-w-md mx-auto">
                            Connect to your ROD Core wallet to manage your ROD coins, generate addresses, and send/receive transactions.
                        </p>
                    )}
                </motion.header>

                {/* Content */}
                {connection ? (
                    <WalletDashboard 
                        connection={connection} 
                        onDisconnect={handleDisconnect} 
                    />
                ) : (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <WalletConnect onConnect={handleConnect} />
                    </div>
                )}

                {/* Footer */}
                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-16 pb-8"
                >
                    <p className="text-xs text-slate-600">
                        ROD Wallet • Powered by SpaceXpanse
                    </p>
                </motion.footer>
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