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
  const lastDepositCheckRef = useRef(0);

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
      const checkAdminRole = async () => {
        try {
          const user = await base44.auth.me();
          setIsAdmin(user?.role === 'admin');
        } catch (err) {
          setIsAdmin(false);
        }
      };
      checkAdminRole();

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

    checkRPCStatus();
    fetchOnlineUsers();
    fetchAllWallets().then(() => fetchWalletData());

  }, [account]);

  // ... (all your other functions are unchanged) ...

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
                {/* Your header code remains the same */}
            </div>

            {/* Spacer for fixed header */}
            <div className="my-1 h-8 md:h-12"></div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                {/* ... your tabs list ... */}

                <TabsContent value="overview" className={`${isMobile ? 'mt-4' : 'mt-6'}`}>
                    {/* ... other components ... */}

                    {/* My Addresses - UTXO badge removed */}
                    <Card className="bg-slate-900/80 border-slate-700/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-white text-lg">My Addresses</CardTitle>
                            <div className="flex gap-2 flex-wrap justify-end">
                                {/* your existing buttons */}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {addresses.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-500 text-sm">No addresses generated yet</p>
                                    <Button variant="link" className="text-purple-400 mt-2" onClick={() => handleTabChange('generate')}>
                                        Generate your first address
                                    </Button>
                                </div>
                            ) : addresses.map((addr, index) => {
                                const txBalance = allAccountTransactions
                                    .filter(tx => normalizeAddress(tx.wallet_address) === normalizeAddress(addr.address))
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
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
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
                                                        <p className="text-sm font-medium text-white truncate">{addr.label}</p>
                                                        <button onClick={() => handleStartEditLabel(addr)} className="text-slate-500 hover:text-purple-400 transition-colors">
                                                            <Pencil className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                )}
                                                {addr.address === account.wallet_address && (
                                                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-xs">Primary</Badge>
                                                )}
                                                {addr.importStatus === 'imported' && (
                                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">Imported</Badge>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-amber-400/80 font-mono truncate">{addr.address}</p>
                                                    <span title={hasBalance ? `Balance: ${addrBalance.toFixed(4)} ROD` : 'Zero balance'} className={`flex-shrink-0 w-2 h-2 rounded-full ${hasBalance ? 'bg-green-400 shadow-[0_0_5px_#4ade80]' : 'bg-red-500'}`} />
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {!hasBalance && <span className="text-xs text-red-400/70">0 ROD</span>}
                                                    {hasBalance && <span className="text-xs text-green-400/70">{addrBalance.toFixed(2)} ROD</span>}
                                                    {/* UTXO count removed here */}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            {/* your action buttons remain the same */}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Rest of your content remains unchanged */}
                </TabsContent>

                {/* Other tabs remain the same */}
            </Tabs>

            <MobileWalletTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {/* All your modals remain the same */}
        </div>
  );
}