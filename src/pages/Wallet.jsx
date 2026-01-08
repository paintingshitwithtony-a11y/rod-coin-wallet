import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AuthScreen from '@/components/wallet/AuthScreen';
import WalletDashboard from '@/components/wallet/WalletDashboard';
import WalletPreloader from '@/components/wallet/WalletPreloader';
import { Toaster } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function Wallet() {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const checkSession = async () => {
      const savedSession = localStorage.getItem('rod_wallet_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          // Check if session is still valid (within 7 days)
          if (parsed.timestamp && Date.now() - parsed.timestamp < 604800000) {
            // Fetch full account data - try by email first, then by id
            let accounts = parsed.email ?
            await base44.entities.WalletAccount.filter({ email: parsed.email }) :
            [];

            if (accounts.length === 0) {
              accounts = await base44.entities.WalletAccount.filter({ id: parsed.id });
            }

            if (accounts.length > 0) {
              setAccount(accounts[0]);
            } else {
              localStorage.removeItem('rod_wallet_session');
            }
          } else {
            localStorage.removeItem('rod_wallet_session');
          }
        } catch (e) {
          localStorage.removeItem('rod_wallet_session');
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const handleAuth = (accountData) => {
    setAccount(accountData);
  };

  const handleLogout = () => {
    setAccount(null);
    localStorage.removeItem('rod_wallet_session');
  };

  if (isLoading) {
    return <WalletPreloader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 relative overflow-x-hidden overflow-y-auto">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-3xl" />
                
                {/* Stars */}
                {[...Array(50)].map((_, i) =>
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
          }} />

        )}
            </div>

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-2 md:px-4 py-8 overflow-x-hidden max-w-full">
                {/* Header */}
                <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }} className="text-center">


                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="relative">
                            <div className="bg-gradient-to-br my-16 rounded-2xl w-14 h-14 from-purple-500 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
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
                    {!account &&
          <p className="text-slate-400 max-w-md mx-auto">
                            Create a new wallet or login to manage your ROD coins, generate addresses, and send/receive transactions.
                        </p>
          }
                </motion.header>

                {/* Content */}
                {account ?
        <WalletDashboard
          account={account}
          onLogout={handleLogout} /> :


        <div className="flex items-center justify-center min-h-[60vh]">
                        <AuthScreen onAuth={handleAuth} />
                    </div>
        }

                {/* Footer */}
                <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-16 pb-8">

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
        }} />

        </div>);

}