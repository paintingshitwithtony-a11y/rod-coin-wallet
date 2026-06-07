import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw,
  TrendingUp, Clock, Copy, CheckCircle2, ExternalLink,
  LogOut, Settings, Shield, Plug, Loader2, AlertCircle, Activity, Users, Star, Pencil, Server, FolderOpen, Unlock, Trash2, Lock } from
'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import AddressGenerator from './AddressGenerator';
import SendReceive from './SendReceive';
import AddressBook from './AddressBook';
import WalletImport from './WalletImport';
import RPCConfigManager from './RPCConfigManager';
import TransactionHistory from './TransactionHistory';
import WalletManager from './WalletManager';
import WalletEncryptionDialog from './WalletEncryptionDialog';
import RODNodeSetupGuide from './RODNodeSetupGuide';
import NetworkActivityDashboard from './NetworkActivityDashboard';
import RPCConsole from './RPCConsole';
import RODConfEditor from './RODConfEditor';
import NodeStatusCard from './NodeStatusCard';
import AdminRPCStatusIndicator from './AdminRPCStatusIndicator';
import DashboardRPCConsole from './DashboardRPCConsole';
import AddressImportDiagnostics from './AddressImportDiagnostics';
import WalletMessages from './WalletMessages';
import BalanceTrendChart from './BalanceTrendChart';
import AdminDebugButtons from './AdminDebugButtons';
import MobileWalletTabs from './MobileWalletTabs';
import ConnectionStatusAlerts from './ConnectionStatusAlerts';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const normalizeAddress = (address) => (address || '').trim().toLowerCase();

const uniqueByAddress = (items) => {
  const byAddress = new Map();
  items.forEach((item) => {
    const key = normalizeAddress(item.address || item.wallet_address);
    if (!key || byAddress.has(key)) return;
    byAddress.set(key, item);
  });
  return Array.from(byAddress.values());
};

export default function WalletDashboard({ account, onLogout }) {
  const [balance, setBalance] = useState({ confirmed: account?.balance || 0, unconfirmed: 0 });
  const [addresses, setAddresses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allAccountTransactions, setAllAccountTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdmin, setIsAdmin] = useState(false);

  const [rpcConnected, setRpcConnected] = useState(null);
  const [showRPCModal, setShowRPCModal] = useState(false);
  const [showRPCManager, setShowRPCManager] = useState(false);
  const [rpcNodeInfo, setRpcNodeInfo] = useState(null);
  const [rpcError, setRpcError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [showEncryptWallet, setShowEncryptWallet] = useState(null);
  const [currentWallet, setCurrentWallet] = useState(null);
  const [allWallets, setAllWallets] = useState([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState(null);
  const [editAddressLabel, setEditAddressLabel] = useState('');
  const [showNodeGuide, setShowNodeGuide] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [showConfEditor, setShowConfEditor] = useState(false);
  const [lastImportTime, setLastImportTime] = useState(0);
      const [lastManualSyncTime, setLastManualSyncTime] = useState(0);
      const [walletUnlocked, setWalletUnlocked] = useState(false);
      const [addressBalances, setAddressBalances] = useState({});
      const [addressUtxoCounts, setAddressUtxoCounts] = useState({});
      const [checkingUnlockStatus, setCheckingUnlockStatus] = useState(false);
      const [showUnlockDialog, setShowUnlockDialog] = useState(false);
      const [unlockPassphrase, setUnlockPassphrase] = useState('');
      const [unlockingWallet, setUnlockingWallet] = useState(false);
      const [electronProxyConnected, setElectronProxyConnected] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartYRef = useRef(null);
  const scrollPositionsRef = useRef({});
  const activeTabRef = useRef('overview');
  const walletDataRequestRef = useRef(null);
  const lastWalletDataFetchRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const handleWalletCreated = () => fetchAllWallets();
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('walletCreated', handleWalletCreated);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('walletCreated', handleWalletCreated);
    };
  }, []);

  useEffect(() => {
      // Check if current user is admin
      const checkAdminRole = async () => {
        try {
          const user = await base44.auth.me();
          setIsAdmin(user?.role === 'admin');
        } catch (err) {
          setIsAdmin(false);
        }
      };
      checkAdminRole();

      // Check if Electron proxy is available
      const checkElectronProxy = async () => {
        try {
          const response = await fetch('http://localhost:9767/', { 
            method: 'POST',
            signal: AbortSignal.timeout(2000)
          });
          setElectronProxyConnected(response.status !== 404);
        } catch (err) {
          setElectronProxyConnected(false);
        }
      };
      checkElectronProxy();
    }, []);

  useEffect(() => {
    if (!rpcConnected) return;

    const refreshUnlockStatus = () => checkWalletUnlockStatus(true);
    refreshUnlockStatus();
    const interval = setInterval(refreshUnlockStatus, 15000);
    window.addEventListener('focus', refreshUnlockStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshUnlockStatus);
    };
  }, [rpcConnected]);

  useEffect(() => {
    // Load addresses from account
    if (account) {
      const mainAddress = {
        id: 'main',
        address: account.wallet_address,
        label: 'Primary Address',
        createdAt: account.created_date,
        isValid: true
      };

      const deletedWalletAddressKeys = new Set((account.deleted_wallet_addresses || []).map(normalizeAddress));
      const additionalAddresses = (account.additional_addresses || [])
        .filter((addr) => !deletedWalletAddressKeys.has(normalizeAddress(addr.address)))
        .map((addr, i) => ({
          id: `addr-${i}`,
          address: addr.address,
          label: addr.label || `Address ${i + 2}`,
          createdAt: addr.created_at,
          isValid: true,
          importStatus: 'imported'
        }));

      setAddresses(uniqueByAddress([mainAddress, ...additionalAddresses]));
      setBalance({ confirmed: account.balance || 0, unconfirmed: 0 });
    }

      // Initial load: check RPC status and fetch wallets sequentially
      checkRPCStatus();
      fetchOnlineUsers();
      fetchAllWallets().then(() => fetchWalletData());

      return () => {
        // No intervals - user will manually sync
      };
    }, [account]);

  const fetchAllWallets = async () => {
   setWalletsLoading(true);
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

      // Fetch RPC balance for main wallet
      let mainBalance = 0;
      try {
        const balResponse = await base44.functions.invoke('getRPCBalance', {});
        if (balResponse.data.success) {
          mainBalance = balResponse.data.balance;
        }
      } catch (err) {
        console.warn('Failed to fetch main wallet RPC balance:', err);
      }

      // Always include main account wallet with RPC balance
      const mainWallet = {
        id: 'main-account',
        account_id: account.id,
        name: 'Main Wallet',
        wallet_address: freshAccount.wallet_address,
        balance: mainBalance,
        is_active: visibleWalletList.length === 0 || !visibleWalletList.some(w => w.is_active),
        wallet_type: 'standard',
        color: 'from-purple-500 to-purple-700',
        importStatus: addresses.some(addr => 
          addr.address === freshAccount.wallet_address && addr.importStatus === 'imported'
        ) ? 'imported' : null
      };

      // Check which wallets are imported to RPC
      const walletsWithImportStatus = visibleWalletList.map((wallet) => {
          const isImported = addresses.some(addr => 
            addr.address === wallet.wallet_address && addr.importStatus === 'imported'
          );
          return { ...wallet, importStatus: isImported ? 'imported' : null };
      });

      const allWallets = uniqueByAddress([mainWallet, ...walletsWithImportStatus]);
      setAllWallets(allWallets);

      const savedAdditionalAddresses = (freshAccount.additional_addresses || []).filter(
        (addr) => !deletedWalletAddressKeys.has(normalizeAddress(addr.address))
      );

      const baseAddresses = uniqueByAddress([
        {
          id: 'main',
          address: freshAccount.wallet_address,
          label: 'Primary Address',
          createdAt: freshAccount.created_date,
          isValid: true
        },
        ...savedAdditionalAddresses.map((addr, i) => ({
          id: `addr-${i}`,
          address: addr.address,
          label: addr.label || `Address ${i + 2}`,
          createdAt: addr.created_at,
          isValid: true,
          importStatus: 'imported'
        }))
      ]);

      const walletAddresses = walletsWithImportStatus.map((w) => ({
        id: `wallet-${w.id}`,
        address: w.wallet_address,
        label: w.name || 'Wallet',
        createdAt: w.created_date,
        isValid: true,
        importStatus: w.importStatus
      }));

      const refreshedAddresses = uniqueByAddress([...walletAddresses, ...baseAddresses]);
      account.additional_addresses = savedAdditionalAddresses;
      account.deleted_wallet_addresses = freshAccount.deleted_wallet_addresses || [];
      setAddresses(refreshedAddresses);

      const liveBalances = {};
      const utxoCounts = {};
      try {
        const response = await base44.functions.invoke('executeRPCCommand', {
          method: 'listunspent',
          params: [0, 9999999]
        });
        if (response.data.success) {
          allWallets.forEach(wallet => {
            liveBalances[normalizeAddress(wallet.wallet_address)] = 0;
            utxoCounts[normalizeAddress(wallet.wallet_address)] = 0;
          });
          refreshedAddresses.forEach(addr => {
            const key = normalizeAddress(addr.address);
            liveBalances[key] = 0;
            utxoCounts[key] = 0;
          });
          (response.data.result || []).forEach(utxo => {
            const key = normalizeAddress(utxo.address);
            if (key in liveBalances) {
              liveBalances[key] = parseFloat(((liveBalances[key] || 0) + utxo.amount).toFixed(8));
              utxoCounts[key] = (utxoCounts[key] || 0) + 1;
            }
          });
        }
      } catch (err) {
        console.warn('Failed to fetch live address balances:', err.message);
      }
      setAddressBalances(liveBalances);
      setAddressUtxoCounts(utxoCounts);

      // Set current wallet to active one or keep existing if still valid
      const activeWallet = allWallets.find(w => w.is_active) || mainWallet;
      const updatedCurrent = allWallets.find(w => w.id === (currentWallet?.id || activeWallet.id)) || activeWallet;

      // Update wallet reference but let fetchWalletData() handle balance updates
      setCurrentWallet(updatedCurrent);
    } catch (err) {
        console.error('Failed to fetch wallets:', err);
        toast.error('Failed to fetch wallets: ' + err.message);
    } finally {
      setWalletsLoading(false);
    }
  };

  const handleWalletClick = async (wallet) => {
     try {
         // Update all wallets to inactive (only for non-main wallets)
         const updatePromises = allWallets
             .filter(w => w.id !== 'main-account')
             .map(w => base44.entities.Wallet.update(w.id, { is_active: false }));

         if (updatePromises.length > 0) {
             await Promise.all(updatePromises);
         }

         // Set clicked wallet as active (only if not main wallet)
         if (wallet.id !== 'main-account') {
             await base44.entities.Wallet.update(wallet.id, { is_active: true });
         }

         // Update state with the fresh wallet data
         const updatedWallet = { ...wallet };
         setCurrentWallet(updatedWallet);
         setBalance({
             confirmed: wallet.balance || 0,
             unconfirmed: 0
         });
         toast.success(`Switched to ${wallet.name} (${(wallet.balance || 0).toFixed(4)} ROD)`);

         // Refresh wallet-specific data and re-fetch all wallets to get fresh balances
         await Promise.all([
             fetchWalletData(),
             fetchAllWallets()
         ]);
     } catch (err) {
         console.error('Failed to switch wallet:', err);
         toast.error('Failed to switch wallet: ' + err.message);
     }
  };

  const handleWalletCreated = async (newWallet) => {
     // Immediately add new wallet to the list, preserving the main account wallet and avoiding duplicates
     setAllWallets(prev => {
       const mainWallet = prev.find(w => w.id === 'main-account');
       const others = prev.filter(w => w.id !== 'main-account');
       return uniqueByAddress(mainWallet ? [mainWallet, ...others, newWallet] : [...others, newWallet]);
     });
     setAddresses(prev => uniqueByAddress([{
       id: `wallet-${newWallet.id}`,
       address: newWallet.wallet_address,
       label: newWallet.name,
       createdAt: new Date().toISOString(),
       isValid: true,
       importStatus: 'imported'
     }, ...prev]));
     await fetchAllWallets();
  };

  const updateMainWalletFromRPC = async () => {
    if (!rpcConnected) return;

    try {
      const response = await base44.functions.invoke('getRPCBalance', currentWallet && currentWallet.id !== 'main-account' ? { address: currentWallet.wallet_address } : {});
      if (response.data.success) {
        // Only update if viewing main wallet
        if (!currentWallet || currentWallet.id === 'main-account') {
          setBalance({
            confirmed: response.data.balance,
            unconfirmed: 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to update from RPC:', err);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const response = await base44.functions.invoke('getOnlineUsers', {});
      if (response.data.count !== undefined) {
        setOnlineUsers(response.data.count);
      }
    } catch (err) {

      // Silently fail
    }};
  const importAllAddresses = async (showToast = false, rescan = false) => {
    // Only allow imports once every 3 minutes (180000 ms)
    const now = Date.now();
    if (!rescan && now - lastImportTime < 180000) {
      if (showToast) {
        const secondsLeft = Math.ceil((180000 - (now - lastImportTime)) / 1000);
        toast.info(`Import available again in ${secondsLeft}s`, { duration: 3000 });
      }
      return;
    }

    try {
      const response = await base44.functions.invoke('importAllAddresses', { accountId: account.id, rescan });

      if (response.data.imported > 0) {
        setLastImportTime(now);
        if (showToast) {
          toast.success(`Imported ${response.data.imported} address(es) to RPC node`);
        }
        // Update addresses with import status
        setAddresses((prev) => prev.map((addr) => ({
          ...addr,
          importStatus: 'imported'
        })));
      } else if (response.data.total === 0) {

        // No addresses to import yet
      } else if (response.data.message && showToast) {toast.warning(response.data.message, { duration: 5000 });}
    } catch (err) {
      console.error('Background import check failed:', err);
    }
  };

  const checkWalletUnlockStatus = async (force = false) => {
    if (!force && !rpcConnected) return;
    
    try {
      setCheckingUnlockStatus(true);
      const response = await base44.functions.invoke('executeRPCCommand', {
        method: 'getwalletinfo',
        params: []
      });
      
      if (response.data && response.data.result) {
        const walletInfo = response.data.result;
        const hasUnlockField = Object.prototype.hasOwnProperty.call(walletInfo, 'unlocked_until');
        const unlockedUntil = Number(walletInfo.unlocked_until || 0);
        setWalletUnlocked(hasUnlockField ? unlockedUntil > Math.floor(Date.now() / 1000) : true);
      }
    } catch (err) {
      console.error('Failed to check unlock status:', err);
    } finally {
      setCheckingUnlockStatus(false);
    }
  };

  const handleUnlockWallet = async () => {
    if (!unlockPassphrase) {
      toast.error('Enter your wallet passphrase');
      return;
    }

    setUnlockingWallet(true);
    try {
      const response = await base44.functions.invoke('executeRPCCommand', {
        method: 'walletpassphrase',
        params: [unlockPassphrase, 300]
      });

      if (response.data?.success) {
        toast.success('Wallet unlocked for 5 minutes');
        setWalletUnlocked(true);
        setUnlockPassphrase('');
        setShowUnlockDialog(false);
        await checkWalletUnlockStatus();
      } else {
        const message = response.data?.error || 'Failed to unlock wallet';
        const isUnencryptedWallet = message.toLowerCase().includes('unencrypted') || message.toLowerCase().includes('not encrypted');
        if (isUnencryptedWallet) {
          toast.success('Wallet is not encrypted — no unlock needed');
          setWalletUnlocked(true);
          setUnlockPassphrase('');
          setShowUnlockDialog(false);
        } else {
          toast.error(message);
        }
      }
    } catch (err) {
      toast.error('Failed to unlock wallet: ' + err.message);
    } finally {
      setUnlockingWallet(false);
    }
  };

  const checkRPCStatus = async (isRetry = false) => {
    try {
      const response = await base44.functions.invoke('checkRPCStatus', {});

      if (response.data.connected) {
        setRpcConnected(true);
        setRpcError(null);
        setReconnectAttempts(0);
        setIsReconnecting(false);

        if (response.data.nodeInfo) {
          setRpcNodeInfo(response.data.nodeInfo);
        }

        if (isRetry) {
          toast.success('RPC connection restored!');
        }

        // Check wallet unlock status after RPC connects
        setTimeout(() => checkWalletUnlockStatus(true), 500);
      } else {
        setRpcConnected(false);
        setRpcNodeInfo(null);
        setRpcError(response.data.error || 'Connection failed');

        // Attempt auto-reconnect (max 3 attempts)
        if (!isRetry && reconnectAttempts < 3) {
          setIsReconnecting(true);
          setReconnectAttempts((prev) => prev + 1);
          setTimeout(() => checkRPCStatus(true), 5000);
        }
      }
    } catch (err) {
      console.error('RPC Status Check Failed:', err);
      setRpcConnected(false);
      setRpcNodeInfo(null);
      setRpcError(err.message);

      // Attempt auto-reconnect (max 3 attempts)
      if (!isRetry && reconnectAttempts < 3) {
        setIsReconnecting(true);
        setReconnectAttempts((prev) => prev + 1);
        setTimeout(() => checkRPCStatus(true), 5000);
      } else {
        setIsReconnecting(false);
      }
    }
  };

  const checkForDeposits = async (silent = false) => {
    if (!rpcConnected) return;

    try {
      setIsSyncing(true);
      const response = await base44.functions.invoke('checkDeposits', {});

      if (response.data.newDeposits && response.data.newDeposits.length > 0) {
        response.data.newDeposits.forEach((deposit) => {
          toast.success(`Received ${deposit.amount} ROD!`, {
            description: `${deposit.confirmations} confirmations`,
            duration: 5000
          });
        });

        // Refresh wallet data after new deposits (skip fetchAllWallets to avoid rate limits)
        await fetchWalletData();
      } else if (!silent) {
        toast.info('No new transactions found', { duration: 2000 });
      }

      setLastSyncTime(new Date());
    } catch (err) {
        console.error('Failed to check deposits:', err);
        if (!silent) {
          toast.error('Failed to check for deposits: ' + err.message);
        }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTabChange = (nextTab) => {
    if (!nextTab || nextTab === activeTabRef.current) return;
    scrollPositionsRef.current[activeTabRef.current] = window.scrollY;
    activeTabRef.current = nextTab;
    setActiveTab(nextTab);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  };

  const handleTouchStart = (event) => {
    if (!isMobile || window.scrollY > 0 || loading || isSyncing) return;
    pullStartYRef.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event) => {
    if (pullStartYRef.current === null) return;
    const distance = Math.max(0, event.touches[0].clientY - pullStartYRef.current);
    setPullDistance(Math.min(distance, 96));
  };

  const handleTouchEnd = () => {
    if (pullDistance > 72) {
      handleManualRefresh();
    }
    pullStartYRef.current = null;
    setPullDistance(0);
  };

  const handleManualRefresh = async () => {
    // Prevent rapid clicking - 5 second cooldown
    const now = Date.now();
    if (now - lastManualSyncTime < 5000) {
      toast.info('Sync in progress...', { duration: 2000 });
      return;
    }

    setLoading(true);
    setLastManualSyncTime(now);
    toast.info('Syncing...');
    try {
      // Get fresh balance directly from RPC
      const balResponse = await base44.functions.invoke('getRPCBalance', currentWallet && currentWallet.id !== 'main-account' ? { address: currentWallet.wallet_address } : {});
      if (balResponse.data.success) {
        setBalance({
          confirmed: balResponse.data.balance,
          unconfirmed: 0
        });
      }

      await checkForDeposits(false);
      await fetchWalletData();
      await checkRPCStatus();
      if (rpcConnected) {
        await importAllAddresses(true);
      }
      toast.success('Sync complete!');
    } catch (err) {
      console.error('Refresh failed:', err);
      toast.error('Sync failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletData = async (force = false) => {
     const now = Date.now();
     if (walletDataRequestRef.current) return walletDataRequestRef.current;
     if (!force && now - lastWalletDataFetchRef.current < 5000) return;

     const request = (async () => {
       setLoading(true);
       try {
         const allTxs = await base44.entities.Transaction.filter(
           { account_id: account.id },
           '-created_date',
           9999
         );
         setAllAccountTransactions(allTxs);

         let txs = allTxs;
         if (currentWallet) {
           if (currentWallet.id === 'main-account' || currentWallet.id.startsWith('address-')) {
             txs = allTxs.filter(tx => tx.wallet_address === currentWallet.wallet_address);
           } else {
             txs = allTxs.filter(tx => tx.wallet_id === currentWallet.id);
           }
         }
         txs = txs.slice(0, 50);
        
        const formattedTxs = txs.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          address: tx.address.slice(0, 8) + '...' + tx.address.slice(-6),
          confirmations: tx.confirmations,
          timestamp: tx.created_date,
          status: tx.status,
          wallet_id: tx.wallet_id,
          wallet_address: tx.wallet_address
        }));

        setTransactions(formattedTxs);

        if (currentWallet) {
          try {
            const balResponse = await base44.functions.invoke('getRPCBalance', currentWallet.id === 'main-account' ? {} : { address: currentWallet.wallet_address });
            if (balResponse.data.success) {
              setBalance({ confirmed: balResponse.data.balance, unconfirmed: 0 });
            }
          } catch (_err) {
            if (currentWallet.id !== 'main-account') {
              setBalance({ confirmed: currentWallet.balance || 0, unconfirmed: 0 });
            }
          }
        }
      } catch (err) {
          console.error('Failed to fetch transactions:', err);
          if (!String(err.message || '').toLowerCase().includes('rate limit')) {
            toast.error('Failed to fetch transactions: ' + err.message);
          }
      } finally {
        lastWalletDataFetchRef.current = Date.now();
        walletDataRequestRef.current = null;
        setLoading(false);
      }
    })();

    walletDataRequestRef.current = request;
    return request;
  };

  const handleAddressGenerated = async (newAddress) => {
    setAddresses((prev) => uniqueByAddress([newAddress, ...prev]));

    // Save to account's additional_addresses
    try {
      const currentAccount = await base44.entities.WalletAccount.filter({ id: account.id });
      if (currentAccount.length > 0) {
        const existingAddresses = currentAccount[0].additional_addresses || [];
        const alreadySaved = existingAddresses.some(addr => normalizeAddress(addr.address) === normalizeAddress(newAddress.address));
        if (!alreadySaved) {
          await base44.entities.WalletAccount.update(account.id, {
            additional_addresses: [...existingAddresses, {
              address: newAddress.address,
              public_key_hash: newAddress.publicKeyHash,
              label: newAddress.label,
              created_at: newAddress.createdAt
            }]
          });
        }
      }
    } catch (err) {
        console.error('Failed to save address:', err);
        toast.error('Failed to save address to account: ' + err.message);
    }

    // Trigger import check after a short delay
    setTimeout(() => {
      if (rpcConnected) {
        importAllAddresses();
      }
    }, 2000);
  };

  const handleWalletImported = async (importedWallet) => {
    const newAddress = {
      id: `imported-${Date.now()}`,
      address: importedWallet.address,
      label: importedWallet.label,
      createdAt: importedWallet.created_at,
      isValid: true,
      imported: true
    };
    setAddresses((prev) => uniqueByAddress([newAddress, ...prev]));

    // Save to account's additional_addresses
    try {
      const currentAccount = await base44.entities.WalletAccount.filter({ id: account.id });
      if (currentAccount.length > 0) {
        const existingAddresses = currentAccount[0].additional_addresses || [];
        const alreadySaved = existingAddresses.some(addr => normalizeAddress(addr.address) === normalizeAddress(importedWallet.address));
        if (!alreadySaved) {
          await base44.entities.WalletAccount.update(account.id, {
            additional_addresses: [...existingAddresses, {
              address: importedWallet.address,
              label: importedWallet.label,
              created_at: importedWallet.created_at
            }]
          });
        }
      }
    } catch (err) {
        console.error('Failed to save imported address:', err);
        toast.error('Failed to save imported address: ' + err.message);
    }

    await fetchWalletData();
  };

  const copyAddress = async (address) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Address copied');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleMakePrimaryAddress = async (address) => {
    try {
      await base44.entities.WalletAccount.update(account.id, {
        wallet_address: address.address
      });
      toast.success(`${address.label} is now your primary address`);

      // Refresh account data and update state
      const accounts = await base44.entities.WalletAccount.filter({ id: account.id });
      if (accounts.length > 0) {
        account.wallet_address = accounts[0].wallet_address;
        // Trigger re-render by updating addresses state
        setAddresses(prev => [...prev]);

        // Refresh all wallets to recalculate Main Wallet balance with new primary address
        await fetchAllWallets();

        // Switch to Main Wallet to show the updated balance - but wait for fetchAllWallets to complete
        setTimeout(async () => {
          const updatedWallets = await base44.entities.Wallet.filter(
            { account_id: account.id },
            '-created_date'
          );
          const mainWallet = {
            id: 'main-account',
            account_id: account.id,
            name: 'Main Wallet',
            wallet_address: accounts[0].wallet_address,
            balance: accounts[0].balance || 0,
            is_active: updatedWallets.length === 0 || !updatedWallets.some(w => w.is_active),
            wallet_type: 'standard',
            color: 'from-purple-500 to-purple-700'
          };
          setCurrentWallet(mainWallet);
          setBalance({
            confirmed: mainWallet.balance || 0,
            unconfirmed: 0
          });
        }, 100);
      }
    } catch (err) {
        console.error('Failed to set primary address:', err);
        toast.error('Failed to set primary address: ' + err.message);
    }
  };

  const handleAddressClick = async (address) => {
    try {
      // Create a virtual wallet for this address
      const addressWallet = {
        id: `address-${address.address}`,
        name: address.label,
        wallet_address: address.address,
        is_active: false,
        wallet_type: 'address',
        color: 'from-blue-500 to-blue-700'
      };

      // Fetch transactions for this specific address
      const addressTxs = await base44.entities.Transaction.filter({
        account_id: account.id,
        wallet_address: address.address
      });

      // Calculate balance from transactions
      const addressBalance = addressTxs.reduce((sum, tx) => {
        if (tx.type === 'receive') return sum + tx.amount;
        if (tx.type === 'send') return sum - Math.abs(tx.amount);
        return sum;
      }, 0);

      addressWallet.balance = addressBalance;

      setCurrentWallet(addressWallet);
      setBalance({
        confirmed: addressBalance,
        unconfirmed: 0
      });

      try {
        const balResponse = await base44.functions.invoke('getRPCBalance', { address: address.address });
        if (balResponse.data.success) {
          setBalance({
            confirmed: balResponse.data.balance,
            unconfirmed: 0
          });
        }
      } catch (_err) {}

      // Fetch and display address-specific transactions
      await fetchWalletData();
      
      toast.success(`Viewing ${address.label}`);
    } catch (err) {
      console.error('Failed to view address:', err);
      toast.error('Failed to view address: ' + err.message);
    }
  };

  const handleStartEditLabel = (address) => {
    setEditingAddress(address.id);
    setEditAddressLabel(address.label);
  };

  const handleSaveLabel = async (address) => {
    try {
      const currentAccount = await base44.entities.WalletAccount.filter({ id: account.id });
      if (currentAccount.length > 0) {
        const additionalAddresses = currentAccount[0].additional_addresses || [];
        const updatedAddresses = additionalAddresses.map(addr => 
          addr.address === address.address ? { ...addr, label: editAddressLabel } : addr
        );

        await base44.entities.WalletAccount.update(account.id, {
          additional_addresses: updatedAddresses
        });

        // Update local state
        setAddresses(prev => prev.map(addr => 
          addr.id === address.id ? { ...addr, label: editAddressLabel } : addr
        ));

        toast.success('Address label updated');
      }
      setEditingAddress(null);
    } catch (err) {
        console.error('Failed to update label:', err);
        toast.error('Failed to update label: ' + err.message);
    }
  };

  const handleDeleteAddress = async (address) => {
    if (!confirm(`Delete address "${address.label}"? This cannot be undone.`)) {
      return;
    }

    try {
      const currentAccount = await base44.entities.WalletAccount.filter({ id: account.id });
      if (currentAccount.length > 0) {
        const deletedAddressKey = normalizeAddress(address.address);
        const additionalAddresses = currentAccount[0].additional_addresses || [];
        const updatedAddresses = additionalAddresses.filter(addr => normalizeAddress(addr.address) !== deletedAddressKey);
        const walletRecords = await base44.entities.Wallet.filter({ account_id: account.id });
        const matchingWallets = walletRecords.filter((wallet) => normalizeAddress(wallet.wallet_address) === deletedAddressKey);
        if (matchingWallets.length > 0) {
          await Promise.all(matchingWallets.map((wallet) => base44.entities.Wallet.delete(wallet.id)));
        }
        const deletedWalletAddresses = Array.from(new Set([
          ...(currentAccount[0].deleted_wallet_addresses || []),
          address.address
        ]));

        await base44.entities.WalletAccount.update(account.id, {
          additional_addresses: updatedAddresses,
          deleted_wallet_addresses: deletedWalletAddresses
        });

        account.additional_addresses = updatedAddresses;
        account.deleted_wallet_addresses = deletedWalletAddresses;
        setAllWallets(prev => prev.filter(wallet => normalizeAddress(wallet.wallet_address) !== deletedAddressKey));
        setAddresses(prev => prev.filter(addr => normalizeAddress(addr.address) !== deletedAddressKey));
        toast.success(`Address "${address.label}" removed`);
      }
    } catch (err) {
        console.error('Failed to delete address:', err);
        toast.error('Failed to delete address: ' + err.message);
    }
  };

  const getStoredAddressBalance = (walletAddress) => {
    const liveBalance = addressBalances[normalizeAddress(walletAddress)];
    if (liveBalance !== undefined) return Number(liveBalance || 0);
    return allAccountTransactions
      .filter(tx => normalizeAddress(tx.wallet_address) === normalizeAddress(walletAddress))
      .reduce((sum, tx) => tx.type === 'receive' ? sum + tx.amount : tx.type === 'send' ? sum - Math.abs(tx.amount) : sum, 0);
  };

  const handleRemoveZeroBalanceItems = async () => {
    const zeroWallets = allWallets.filter(wallet =>
      wallet.id !== 'main-account' && getStoredAddressBalance(wallet.wallet_address) <= 0
    );
    const removableAddresses = (account.additional_addresses || []).filter(addr =>
      normalizeAddress(addr.address) !== normalizeAddress(account.wallet_address) && getStoredAddressBalance(addr.address) <= 0
    );

    if (zeroWallets.length === 0 && removableAddresses.length === 0) {
      toast.info('No zero-balance wallets or addresses to remove');
      return;
    }

    if (!confirm(`Remove ${zeroWallets.length} zero-balance wallet(s) and ${removableAddresses.length} zero-balance address(es) from the app? Your primary wallet will not be removed.`)) {
      return;
    }

    setLoading(true);
    try {
      await Promise.all(zeroWallets.map(wallet => base44.entities.Wallet.delete(wallet.id)));

      const removableAddressKeys = new Set(removableAddresses.map(addr => normalizeAddress(addr.address)));
      const zeroWalletAddressKeys = new Set(zeroWallets.map(wallet => normalizeAddress(wallet.wallet_address)));
      const updatedAdditionalAddresses = (account.additional_addresses || []).filter(addr => {
        const key = normalizeAddress(addr.address);
        return !removableAddressKeys.has(key) && !zeroWalletAddressKeys.has(key);
      });
      const deletedWalletAddresses = Array.from(new Set([
        ...(account.deleted_wallet_addresses || []),
        ...zeroWallets.map(wallet => wallet.wallet_address)
      ]));
      await base44.entities.WalletAccount.update(account.id, {
        additional_addresses: updatedAdditionalAddresses,
        deleted_wallet_addresses: deletedWalletAddresses
      });
      account.additional_addresses = updatedAdditionalAddresses;
      account.deleted_wallet_addresses = deletedWalletAddresses;

      const removedWalletIds = new Set(zeroWallets.map(wallet => wallet.id));
      const removedAddressKeys = new Set([...removableAddressKeys, ...zeroWallets.map(wallet => normalizeAddress(wallet.wallet_address))]);
      setAllWallets(prev => prev.filter(wallet => !removedWalletIds.has(wallet.id)));
      setAddresses(prev => prev.filter(addr => !removedAddressKeys.has(normalizeAddress(addr.address))));

      if (currentWallet && (removedWalletIds.has(currentWallet.id) || removedAddressKeys.has(normalizeAddress(currentWallet.wallet_address)))) {
        const mainWallet = allWallets.find(wallet => wallet.id === 'main-account');
        setCurrentWallet(mainWallet || null);
      }

      await fetchAllWallets();
      toast.success(`Removed ${zeroWallets.length} wallet(s) and ${removableAddresses.length} address(es)`);
    } catch (err) {
      console.error('Failed to remove zero-balance items:', err);
      toast.error('Failed to remove zero-balance items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getWalletDeposits = (walletAddress) => {
    return transactions
      .filter(tx => tx.type === 'receive' && tx.address.includes(walletAddress.slice(-6)))
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden touch-pan-y" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            {isMobile && pullDistance > 0 && (
              <div className="fixed top-[calc(4.5rem+env(safe-area-inset-top))] left-0 right-0 z-50 flex justify-center pointer-events-none">
                <div className="rounded-full border border-purple-500/30 bg-slate-950/90 px-3 py-1 text-xs text-amber-300 shadow-lg">
                  {pullDistance > 72 ? 'Release to refresh' : 'Pull to refresh'}
                </div>
              </div>
            )}

            {/* Header Bar - Full Width */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-purple-900/95 to-slate-900/95 backdrop-blur-xl border-b border-purple-500/30 shadow-lg shadow-purple-500/10 overflow-x-hidden pt-[env(safe-area-inset-top)]">
                <div className="max-w-7xl mx-auto px-2 md:px-4 py-3">
                    <div className="flex items-center justify-center gap-2 md:gap-6 flex-wrap overflow-x-hidden">
                        {/* Logo & Title */}
                        <div className="flex items-center gap-2">
                            <img
                src="https://www.spacexpanse.org/img/about.png"
                alt="SpaceXpanse Logo"
                className="w-8 h-8 md:w-10 h-10 rounded-xl" />

                            <h1 className="text-lg md:text-xl font-bold text-white">ROD Wallet</h1>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                            <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                <span className="w-2 h-2 rounded-full bg-green-400 mr-1 animate-pulse" />
                                Online
                            </Badge>
                            {rpcConnected !== null &&
              <Badge
                variant="outline"
                className={`text-xs ${
                isReconnecting ? "border-yellow-500/50 text-yellow-400" :
                rpcConnected ? "border-green-500/50 text-green-400" :
                "border-red-500/50 text-red-400"}`
                }>

                                    <span className={`w-2 h-2 rounded-full ${
                isReconnecting ? 'bg-yellow-400 animate-pulse' :
                rpcConnected ? 'bg-green-400' :
                'bg-red-400'} mr-1`
                } />
                                    {isReconnecting ? `Retry ${reconnectAttempts}/3` :
                rpcConnected ? 'RPC OK' : 'RPC Off'}
                                </Badge>
              }
                            {rpcConnected && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  walletUnlocked
                                    ? 'border-green-500/50 text-green-400'
                                    : 'border-red-500/50 text-red-400'
                                }`}>
                                <Unlock className="w-3 h-3 mr-1" />
                                {walletUnlocked ? 'Unlocked' : 'Locked'}
                              </Badge>
                            )}
                            {electronProxyConnected && (
                              <Badge
                                variant="outline"
                                className="text-xs border-blue-500/50 text-blue-400"
                                title="Electron proxy is running locally">
                                <span className="w-2 h-2 rounded-full bg-blue-400 mr-1 animate-pulse" />
                                Electron
                              </Badge>
                            )}
                            {!isMobile &&
              <span className="text-xs text-slate-400 hidden md:inline">
                                    {account?.email}
                                </span>
              }
                            <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {onlineUsers}
                            </Badge>

                                            {isSyncing && (
                                                <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    Syncing...
                                                </Badge>
                                            )}
                                            {!isSyncing && lastSyncTime && !isMobile && (
                                                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    {new Date(lastSyncTime).toLocaleTimeString()}
                                                </Badge>
                                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 md:gap-2">
                            <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleManualRefresh}
                            disabled={loading || isSyncing}
                            className="h-8 w-8 text-slate-400 hover:text-white"
                            title="Sync Transactions">

                                <RefreshCw className={`w-4 h-4 ${(loading || isSyncing) ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                            className={`h-8 w-8 ${autoSyncEnabled ? 'text-green-400' : 'text-slate-400'} hover:text-white`}
                            title={autoSyncEnabled ? 'Auto-sync ON' : 'Auto-sync OFF'}>

                                <Activity className={`w-4 h-4 ${autoSyncEnabled ? 'animate-pulse' : ''}`} />
                            </Button>
                            {!isMobile &&
              <>
                  <Link to={createPageUrl('RPCMonitor')}>
                      <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-purple-400"
                          title="RPC Monitor">
                          <Activity className="w-4 h-4" />
                      </Button>
                  </Link>
                  <Link to={createPageUrl('Analytics')}>
                      <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-blue-400"
                          title="Analytics">
                          <TrendingUp className="w-4 h-4" />
                      </Button>
                  </Link>
              </>
              }
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (!rpcConnected && !isReconnecting) {
                                    setReconnectAttempts(0);
                                    checkRPCStatus();
                                  }
                                  setShowRPCManager(true);
                                }}
                                className={`relative h-8 w-8 text-slate-400 hover:text-white ${
                                isReconnecting ? 'text-yellow-400' :
                                rpcConnected === false ? 'text-red-400' :
                                rpcConnected ? 'text-green-400' : ''}`
                                }
                                title="RPC Config">

                                                <Plug className={`w-4 h-4 ${isReconnecting ? 'animate-pulse' : ''}`} />
                                                {rpcConnected === false && !isReconnecting &&
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse" />
                                }
                                            </Button>
                                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowNodeGuide(true)}
                                className="h-8 w-8 text-slate-400 hover:text-blue-400"
                                title="Node Setup Guide">
                                                <Server className="w-4 h-4" />
                                            </Button>
                                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowConfEditor(true)}
                                className="h-8 w-8 text-slate-400 hover:text-green-400"
                                title="Edit rod.conf">
                                                <FolderOpen className="w-4 h-4" />
                                            </Button>
                            <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWalletManager(true)}
                className="h-8 w-8 text-slate-400 hover:text-purple-400"
                title="Wallet Manager">

                                <Wallet className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                            <Link to={createPageUrl('Admin')}>
                                <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-purple-400"
                            title="Admin Panel">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </Link>
                            )}
                            <Link to={createPageUrl('SecuritySettings')}>
                                <div className="relative p-2 rounded-lg bg-gradient-to-br from-purple-500 to-amber-500 cursor-pointer hover:opacity-80 transition-opacity">
                                    <Shield className="w-5 h-5 text-white" />
                                    <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[6px] tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                        SECURITY
                                    </span>
                                </div>
                            </Link>
                            <Button
                variant="ghost"
                onClick={onLogout}
                className="h-8 px-2 md:px-3 text-slate-400 hover:text-red-400 gap-1">

                                <LogOut className="w-3 h-3 md:w-4 h-4" />
                                <span className="hidden sm:inline text-xs">Logout</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer for fixed header */}
            <div className="my-1 h-8 md:h-12"></div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className="hidden md:flex justify-center mb-6">
                    <TabsList className={`bg-slate-800/50 border border-slate-700 ${isMobile ? 'w-full grid grid-cols-4 h-auto' : ''}`}>
                    <TabsTrigger value="overview" onClick={() => handleTabChange('overview')} className={`data-[state=active]:bg-purple-600 ${isMobile ? 'text-xs py-2' : ''}`}>
                        {isMobile ? 'Home' : 'Overview'}
                    </TabsTrigger>
                    <TabsTrigger value="history" onClick={() => handleTabChange('history')} className={`data-[state=active]:bg-purple-600 ${isMobile ? 'text-xs py-2' : ''}`}>
                        History
                    </TabsTrigger>
                    <TabsTrigger value="send" onClick={() => handleTabChange('send')} className={`data-[state=active]:bg-purple-600 ${isMobile ? 'text-xs py-2' : ''}`}>
                        Send
                    </TabsTrigger>
                    <TabsTrigger value="receive" onClick={() => handleTabChange('receive')} className={`data-[state=active]:bg-purple-600 ${isMobile ? 'text-xs py-2' : ''}`}>
                        Receive
                    </TabsTrigger>
                    {!isMobile &&
                    <>
                    <TabsTrigger value="generate" onClick={() => handleTabChange('generate')} className="data-[state=active]:bg-purple-600">
                      Generate
                    </TabsTrigger>
                    <TabsTrigger value="import" onClick={() => handleTabChange('import')} className="data-[state=active]:bg-purple-600">
                      Import
                    </TabsTrigger>
                    <TabsTrigger value="contacts" onClick={() => handleTabChange('contacts')} className="data-[state=active]:bg-purple-600">
                      Contacts
                    </TabsTrigger>
                    <TabsTrigger value="network" onClick={() => handleTabChange('network')} className="data-[state=active]:bg-purple-600">
                        Network
                    </TabsTrigger>
                    <TabsTrigger value="console" onClick={() => handleTabChange('console')} className="data-[state=active]:bg-purple-600">
                        RPC Console
                    </TabsTrigger>
                    <TabsTrigger value="messages" onClick={() => handleTabChange('messages')} className="data-[state=active]:bg-purple-600">
                        Messages
                    </TabsTrigger>
                        </>
                        }
                                </TabsList>
                                </div>

                                <TabsContent value="overview" className={`${isMobile ? 'mt-4' : 'mt-6'}`}>
                                    <AdminRPCStatusIndicator account={account} />

                                    {/* RPC Console - Live Balance Query */}
                                    <DashboardRPCConsole 
                                        selectedAddress={currentWallet?.wallet_address || account.wallet_address}
                                        account={account}
                                    />

                                    <AddressImportDiagnostics
                                        account={account}
                                        rpcConnected={rpcConnected}
                                        onImportRescan={() => importAllAddresses(true, true)}
                                    />

                                    {/* Quick Action Buttons */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-6">
                                        <Card className="bg-slate-900/80 border-slate-700/50">
                                            <CardContent className="p-4 space-y-3">
                                                {isAdmin && (
                                                <Button
                                                    variant="outline"
                                                    onClick={async () => {
                                                        const today = new Date().toISOString().split('T')[0];
                                                        if (!confirm(`Delete all transactions from today (${today})?`)) return;
                                                        setLoading(true);
                                                        try {
                                                            const response = await base44.functions.invoke('deleteTransactionsByDate', {
                                                                startDate: `${today}T00:00:00`
                                                            });
                                                            if (response.data.success) {
                                                                toast.success(`Deleted ${response.data.deleted} transactions`);
                                                                await fetchWalletData();
                                                                await fetchAllWallets();
                                                            }
                                                        } catch (err) {
                                                            toast.error('Failed to delete transactions');
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }}
                                                    disabled={loading}
                                                    className="w-full">
                                                    {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                                                    Clear Today
                                                </Button>
                                                )}
                                                {isAdmin && (
                                                <div className="flex gap-2 flex-wrap">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={async () => {
                                                            setLoading(true);
                                                            try {
                                                                const response = await base44.functions.invoke('debugTransactions', {});
                                                                console.log('=== TRANSACTION DEBUG ===', response.data);
                                                                toast.info(`Check console for details`, {
                                                                    description: `${response.data.receiveCount} receives, ${response.data.sendCount} sends`
                                                                });
                                                            } catch (err) {
                                                                toast.error('Debug failed');
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        disabled={loading}>
                                                        Debug
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={async () => {
                                                            setLoading(true);
                                                            try {
                                                                const response = await base44.functions.invoke('verifyBalancesFromRPC', {});
                                                                console.log('=== BALANCE VERIFICATION ===', response.data);
                                                                const summary = response.data.summary;
                                                                if (summary.mismatches > 0) {
                                                                    toast.error(`Balance Mismatch: ${summary.mismatches} wallet(s) differ from RPC`, {
                                                                        description: `Checked ${summary.total_wallets} wallets`
                                                                    });
                                                                } else if (summary.errors > 0) {
                                                                    toast.warning(`Verification Partial: ${summary.errors} error(s)`, {
                                                                        description: `${summary.verified}/${summary.total_wallets} verified`
                                                                    });
                                                                } else {
                                                                    toast.success(`All ${summary.total_wallets} wallet balances verified from RPC`);
                                                                }
                                                            } catch (err) {
                                                                toast.error('Verification failed');
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        disabled={loading}>
                                                        Verify RPC
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={async () => {
                                                            setLoading(true);
                                                            try {
                                                                const response = await base44.functions.invoke('recalculateBalance', {});
                                                                if (response.data.success) {
                                                                    const data = response.data;
                                                                    console.log('Balance Details:', data);
                                                                    toast.success(`Fixed! ${data.duplicatesRemoved || 0} duplicates removed, ${data.transactionsMigrated || 0} transactions migrated`, {
                                                                        description: `${data.walletsUpdated} wallets updated`
                                                                    });
                                                                    await fetchWalletData();
                                                                    await fetchAllWallets();
                                                                } else {
                                                                    toast.error('Failed to recalculate balance');
                                                                }
                                                            } catch (err) {
                                                                console.error('Fix balance error:', err);
                                                                toast.error('Failed to recalculate balance');
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        disabled={loading}>
                                                        Fix Balance
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={async () => {
                                                            if (!confirm('Reset all balances to 0 and recalculate from transactions?')) return;
                                                            setLoading(true);
                                                            try {
                                                                const response = await base44.functions.invoke('resetAndRecalculateBalance', {});
                                                                if (response.data.success) {
                                                                    const data = response.data;
                                                                    console.log('Reset & Recalculate:', data);
                                                                    toast.success(`Reset complete! ${data.transactionsProcessed} transactions processed`, {
                                                                        description: `Main: ${data.mainWalletBalance.toFixed(4)} ROD, ${data.walletsUpdated} wallets updated`
                                                                    });
                                                                    await fetchWalletData();
                                                                    await fetchAllWallets();
                                                                } else {
                                                                    toast.error('Failed to reset balance');
                                                                }
                                                            } catch (err) {
                                                                console.error('Reset balance error:', err);
                                                                toast.error('Failed to reset balance');
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        disabled={loading}>
                                                        Reset & Recheck
                                                    </Button>
                                                    </div>
                                                    )}
                                                    <AdminDebugButtons
                                                      isAdmin={isAdmin}
                                                      loading={loading}
                                                      isSyncing={isSyncing}
                                                      rpcConnected={rpcConnected}
                                                      onRefresh={() => checkForDeposits(false)}
                                                      setLoading={setLoading}
                                                    />
                                                    <div className="flex gap-2 pt-2 flex-wrap">
                                                    <Button
                                                        onClick={() => handleTabChange('send')}
                                                        className="flex-1 bg-slate-800/50 hover:bg-slate-800">
                                                        <ArrowUpRight className="w-4 h-4 mr-2" />
                                                        Send
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleTabChange('receive')}
                                                        className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400">
                                                        <ArrowDownLeft className="w-4 h-4 mr-2" />
                                                        Receive
                                                    </Button>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleRemoveZeroBalanceItems}
                                                    disabled={loading || walletsLoading}
                                                    className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200">
                                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                                    Remove Zero-Balance Wallets & Addresses
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>

                                    {/* Node Status Card */}
                                                     <motion.div
                                                         initial={{ opacity: 0, y: 20 }}
                                                         animate={{ opacity: 1, y: 0 }}
                                                         transition={{ delay: 0.15 }}
                                                         className="mb-6">
                                                         <NodeStatusCard />
                                                     </motion.div>

                                                     {/* Statistics Cards */}
                                                     <div className={`grid gap-3 ${isMobile ? 'grid-cols-3' : 'md:grid-cols-3 gap-4'}`}>
                                                     <Card className="bg-slate-900/80 border-slate-700/50">
                                                     <CardContent className={`${isMobile ? 'p-2' : 'p-4'}`}>
                                                     <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 mb-1`}>{isMobile ? 'Received' : 'Total Received'}</p>
                                                     <p className={`${isMobile ? 'text-sm' : 'text-2xl'} font-bold text-green-400`}>
                                                     {isMobile ? '+' : '+'}{Object.values(addressBalances).reduce((sum, amount) => sum + Number(amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: isMobile ? 2 : 4, maximumFractionDigits: 8 })}
                                                     {!isMobile && ' ROD'}
                                                     </p>
                                                     </CardContent>
                                                     </Card>
                                                     <Card className="bg-slate-900/80 border-slate-700/50">
                                                         <CardContent className={`${isMobile ? 'p-2' : 'p-4'}`}>
                                                             <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 mb-1`}>{isMobile ? 'Sent' : 'Total Sent'}</p>
                                                             <p className={`${isMobile ? 'text-sm' : 'text-2xl'} font-bold text-red-400`}>
                                                                 {allAccountTransactions.filter(tx => tx.type === 'send').reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toLocaleString(undefined, { minimumFractionDigits: isMobile ? 2 : 4 })}
                                                                 {!isMobile && ' ROD'}
                                                             </p>
                                                         </CardContent>
                                                     </Card>
                                                     <Card className="bg-slate-900/80 border-slate-700/50">
                                                         <CardContent className={`${isMobile ? 'p-2' : 'p-4'}`}>
                                                             <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 mb-1`}>{isMobile ? 'TXs' : 'Transactions'}</p>
                                                             <p className={`${isMobile ? 'text-sm' : 'text-2xl'} font-bold text-white`}>
                                                                 {allAccountTransactions.length}
                                                             </p>
                                                         </CardContent>
                                                     </Card>
                                                     </div>

                                                     <div className={`grid ${isMobile ? 'gap-4 mt-6' : 'gap-6 lg:grid-cols-2 mt-8'}`}>
    {/* My Addresses */}
    <Card className="bg-slate-900/80 border-slate-700/50">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white text-lg">My Addresses</CardTitle>
                                <div className="flex gap-2 flex-wrap justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={walletUnlocked ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}
                                      onClick={() => setShowUnlockDialog(true)}
                                      disabled={!rpcConnected || unlockingWallet}
                                      title="Unlock wallet with passphrase">
                                        {unlockingWallet ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Unlock className="w-4 h-4 mr-1" />}
                                        {walletUnlocked ? 'Unlocked' : 'Unlock'}
                                    </Button>
                                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-400 hover:text-amber-300"
                      onClick={async () => {
                        await importAllAddresses(true, true);
                      }}
                      disabled={!rpcConnected || loading}
                      title="Import and rescan addresses for older deposits">

                                        <Plug className="w-4 h-4 mr-1" />
                                        Import to Chain
                                    </Button>
                                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-400"
                      onClick={() => handleTabChange('generate')}>

                                        + New
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {addresses.length === 0 ?
                                <div className="text-center py-8">
                                        <p className="text-slate-500 text-sm">No addresses generated yet</p>
                                        <Button
                                variant="link"
                                className="text-purple-400 mt-2"
                                onClick={() => handleTabChange('generate')}>

                                            Generate your first address
                                        </Button>
                                    </div> :

                                addresses.map((addr, index) => {
                                const txBalance = allAccountTransactions
                                .filter(tx => tx.wallet_address === addr.address)
                                .reduce((sum, tx) => tx.type === 'receive' ? sum + tx.amount : tx.type === 'send' ? sum - Math.abs(tx.amount) : sum, 0);
                                const liveBalance = addressBalances[normalizeAddress(addr.address)];
                                const addrBalance = liveBalance !== undefined ? liveBalance : txBalance;
                                const hasBalance = addrBalance > 0;
                                const matchedWallet = allWallets.find(w => normalizeAddress(w.wallet_address) === normalizeAddress(addr.address) && w.wallet_type === 'standard' && w.id !== 'main-account');
                                return (
                                <motion.div
                                key={addr.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => handleAddressClick(addr)}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {editingAddress === addr.id ? (
                                                        <Input
                                                            type="text"
                                                            value={editAddressLabel}
                                                            onChange={(e) => setEditAddressLabel(e.target.value)}
                                                            onBlur={() => handleSaveLabel(addr)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel(addr)}
                                                            className="bg-slate-900 text-white px-2 py-1 h-7 text-sm font-medium"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-medium text-white truncate">
                                                                {addr.label}
                                                            </p>
                                                            <button
                                                                onClick={() => handleStartEditLabel(addr)}
                                                                className="text-slate-500 hover:text-purple-400 transition-colors">
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {addr.address === account.wallet_address && (
                                                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-xs">
                                                            Primary
                                                        </Badge>
                                                    )}
                                                    {addr.importStatus === 'imported' &&
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                                                            Imported
                                                        </Badge>
                        }
                                                    {matchedWallet && (
                                                        matchedWallet.encrypted_private_key ? (
                                                            <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                                                                <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80] inline-block flex-shrink-0" />
                                                                Properly Encrypted
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                                                                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />
                                                                Key Not Stored
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs text-amber-400/80 font-mono truncate">
                                                            {addr.address}
                                                        </p>
                                                        <span
                                                            title={hasBalance ? `Balance: ${addrBalance.toFixed(4)} ROD — safe to keep` : 'Zero balance — safe to delete'}
                                                            className={`flex-shrink-0 w-2 h-2 rounded-full ${hasBalance ? 'bg-green-400 shadow-[0_0_5px_#4ade80]' : 'bg-red-500'}`}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {!hasBalance && (
                                                            <span className="text-xs text-red-400/70">0 ROD</span>
                                                        )}
                                                        {hasBalance && (
                                                            <span className="text-xs text-green-400/70">{addrBalance.toFixed(2)} ROD</span>
                                                        )}
                                                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs">
                                                            {addressUtxoCounts[normalizeAddress(addr.address)] || 0} UTXO{(addressUtxoCounts[normalizeAddress(addr.address)] || 0) === 1 ? '' : 's'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                {matchedWallet && !matchedWallet.app_encryption_enabled && !matchedWallet.encrypted_private_key && (
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setShowEncryptWallet(matchedWallet);
                                                    }}
                                                    className="text-slate-400 hover:text-green-400"
                                                    title="Encrypt app wallet record">
                                                    <Lock className="w-4 h-4" />
                                                  </Button>
                                                )}
                                                <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMakePrimaryAddress(addr)}
                        className={`${addr.address === account.wallet_address ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
                        title="Make Primary Address">

                                                    <Star className={`w-4 h-4 ${addr.address === account.wallet_address ? 'fill-amber-400' : ''}`} />
                                                </Button>

                                                <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyAddress(addr.address)}
                        className="text-slate-400 hover:text-white">

                                                    {copiedAddress === addr.address ?
                        <CheckCircle2 className="w-4 h-4 text-green-400" /> :

                        <Copy className="w-4 h-4" />
                        }
                                                </Button>
                                                {addr.id !== 'main' && (
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteAddress(addr)}
                                                    className="text-slate-400 hover:text-red-400"
                                                    title="Delete this address">
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                )}
                                            </div>
                                        </motion.div>
                                        );
                                        })}
                                        </CardContent>
                        </Card>

                        {/* Recent Transactions */}
                        <Card className="bg-slate-900/80 border-slate-700/50">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white text-lg">Recent Transactions</CardTitle>
                                <Button variant="ghost" size="sm" className="text-slate-400" asChild>
                                    <Link to={`/NodeTransactionHistory?address=${encodeURIComponent(currentWallet?.wallet_address || account.wallet_address)}&name=${encodeURIComponent(currentWallet?.name || 'Main Wallet')}`}>
                                        View Node History
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                                {transactions.slice(0, 10).map((tx, index) =>
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">

                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'}`
                      }>
                                                {tx.type === 'receive' ?
                        <ArrowDownLeft className="w-5 h-5 text-green-400" /> :

                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                        }
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {tx.type === 'receive' ? 'Received' : 'Sent'}
                                                </p>
                                                <p className="text-xs text-slate-500">{tx.address}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-semibold ${
                      tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`
                      }>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount} ROD
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {tx.confirmations} confirmations
                                            </p>
                                        </div>
                                    </motion.div>
                  )}
                            </CardContent>
                        </Card>
                        </div>

                        <BalanceTrendChart
                          transactions={allAccountTransactions}
                          currentWallet={currentWallet}
                          currentBalance={balance.confirmed}
                        />

                </TabsContent>

                    <TabsContent value="history" className="mt-6">
                    <TransactionHistory account={account} />
                    </TabsContent>

                    <TabsContent value="generate" className="mt-6">
                    <AddressGenerator 
                        account={account}
                        onAddressGenerated={handleAddressGenerated} />
                </TabsContent>

                <TabsContent value="import" className="mt-6">
                    <WalletImport
            account={account}
            onWalletImported={handleWalletImported} />

                </TabsContent>

                <TabsContent value="send" className="mt-6">
                    <SendReceive
                mode="send"
                balance={balance.confirmed}
                account={account}
                addresses={addresses}
                onTransactionComplete={fetchWalletData}
                fromAddress={currentWallet?.wallet_address || account.wallet_address} />

                </TabsContent>

                <TabsContent value="receive" className="mt-6">
                    <SendReceive
            mode="receive"
            addresses={addresses}
            onGenerateNew={() => handleTabChange('generate')} />

                </TabsContent>

                <TabsContent value="contacts" className="mt-6">
                    <AddressBook
                account={account}
                onSelectAddress={(address) => {
                handleTabChange('send');
                setTimeout(() => {
                const event = new CustomEvent('selectContact', { detail: address });
                window.dispatchEvent(event);
                }, 100);
                }} />

                </TabsContent>

                <TabsContent value="network" className="mt-6">
                    <NetworkActivityDashboard 
                        account={account}
                        rpcConnected={rpcConnected}
                    />
                </TabsContent>

                <TabsContent value="console" className="mt-6">
                    <RPCConsole account={account} />
                </TabsContent>

                <TabsContent value="messages" className="mt-6">
                    <WalletMessages
                        account={account}
                        addresses={addresses}
                        currentWallet={currentWallet}
                    />
                </TabsContent>
                </Tabs>

            <MobileWalletTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {/* Unlock Wallet Modal */}
            {showUnlockDialog && (
                <Dialog open={showUnlockDialog} onOpenChange={(open) => {
                    setShowUnlockDialog(open);
                    if (!open) setUnlockPassphrase('');
                }}>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Unlock className="w-5 h-5 text-purple-400" />
                                Unlock Wallet
                            </DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Enter your ROD node wallet passphrase to unlock sending and private-key actions for 5 minutes.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-slate-300">Wallet Passphrase</Label>
                                <Input
                                    type="password"
                                    value={unlockPassphrase}
                                    onChange={(e) => setUnlockPassphrase(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleUnlockWallet(); }}
                                    placeholder="Enter wallet passphrase"
                                    className="bg-slate-800 border-slate-700 text-white mt-1"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-500 mt-1">This passphrase is only sent to your node to unlock the wallet and is cleared after use.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setUnlockPassphrase('');
                                        setShowUnlockDialog(false);
                                    }}
                                    className="flex-1 border-slate-700 text-slate-300">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUnlockWallet}
                                    disabled={unlockingWallet || !unlockPassphrase}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700">
                                    {unlockingWallet ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                                    Unlock
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* RPC Manager Modal */}
            {showRPCManager &&
      <RPCConfigManager
        account={account}
        onClose={() => {
          setShowRPCManager(false);
          checkRPCStatus();
        }}
        onConnectionSuccess={() => {
          fetchWalletData();
          checkRPCStatus();
          toast.success('Wallet updated with RPC connection');
        }} />

      }

            {/* Wallet Manager Modal */}
             {showWalletManager && (
                 <WalletManager
                     account={account}
                     currentWallet={currentWallet}
                     onWalletSwitch={(wallet) => {
                         setCurrentWallet(wallet);
                         fetchWalletData();
                     }}
                     onWalletCreated={handleWalletCreated}
                     onClose={() => {
                         setShowWalletManager(false);
                         fetchAllWallets();
                     }}
                 />
             )}

             {showEncryptWallet && (
                 <WalletEncryptionDialog
                     wallet={showEncryptWallet}
                     onClose={() => setShowEncryptWallet(null)}
                     onEncrypted={() => {
                         setShowEncryptWallet(null);
                         fetchAllWallets();
                     }}
                 />
             )}

            {/* Node Setup Guide */}
            {showNodeGuide && (
                <RODNodeSetupGuide onClose={() => setShowNodeGuide(false)} />
            )}

            {/* ROD Conf Editor */}
            {showConfEditor && (
                <RODConfEditor 
                    account={account} 
                    onClose={() => setShowConfEditor(false)} 
                />
            )}

            <ConnectionStatusAlerts
              rpcConnected={rpcConnected}
              isReconnecting={isReconnecting}
              reconnectAttempts={reconnectAttempts}
              rpcError={rpcError}
              rpcNodeInfo={rpcNodeInfo}
              onRetry={() => {
                setReconnectAttempts(0);
                checkRPCStatus();
              }}
              onDismiss={() => setRpcConnected(null)}
            />
        </div>);

}