import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AuthScreen from '@/components/wallet/AuthScreen';
import WalletDashboardWithUTXO from '@/components/wallet/WalletDashboardWithUTXO';
import WalletPreloader from '@/components/wallet/WalletPreloader';
import { Toaster } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function Wallet() {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render when RPC updates

  useEffect(() => {
    const checkSession = async () => {
      const savedSession = localStorage.getItem('rod_wallet_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.timestamp && Date.now() - parsed.timestamp < 604800000) {
            let accounts = parsed.email 
              ? await base44.entities.WalletAccount.filter({ email: parsed.email })
              : [];

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
    setRefreshKey(prev => prev + 1); // Force refresh
  };

  const handleLogout = () => {
    setAccount(null);
    localStorage.removeItem('rod_wallet_session');
  };

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return <WalletPreloader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 relative overflow-x-hidden overflow-y-auto safe-mobile-shell">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-2 md:px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] md:py-8 overflow-x-hidden max-w-full">
        {!account && (
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center">
            {/* Your existing header */}
          </motion.header>
        )}

        {account ? (
          <WalletDashboardWithUTXO
            key={refreshKey}           // This forces re-render when RPC updates
            account={account}
            onLogout={handleLogout}
            onRefresh={forceRefresh}   // Pass refresh function
          />
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <AuthScreen onAuth={handleAuth} />
          </div>
        )}

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

      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}