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

  // Force refresh when RPC data changes
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // ... (keep your existing useEffects for mobile, admin, etc.)
    // I'll keep the important parts and add the fix below
  }, []);

  // NEW: Force card refresh when RPC balance updates
  useEffect(() => {
    if (rpcConnected) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [rpcConnected, addressBalances, addressUtxoCounts]);

  // ... (keep all your existing functions: fetchAllWallets, handleWalletClick, etc.)

  // In fetchAllWallets and fetchWalletData, make sure we update addressBalances properly

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden touch-pan-y">
      {/* Your existing header and tabs stay the same */}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="overview" className="mt-6">
          <AdminRPCStatusIndicator account={account} />

          <DashboardRPCConsole selectedAddress={account.wallet_address} account={account} />

          <AddressImportDiagnostics account={account} rpcConnected={rpcConnected} onImportRescan={() => importAllAddresses(true, true)} />

          {/* My Addresses - FORCE REFRESH */}
          <Card className="bg-slate-900/80 border-slate-700/50 mt-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">My Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {addresses.map((addr, index) => {
                const key = normalizeAddress(addr.address);
                const liveBalance = addressBalances[key] !== undefined ? addressBalances[key] : 0;
                const utxoCount = addressUtxoCounts[key] || 0;

                return (
                  <motion.div
                    key={`${addr.id}-${refreshTrigger}`}   // ← This forces re-render
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleAddressClick(addr)}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {/* Rest of your card rendering stays the same */}
                    {/* Just make sure it uses liveBalance and utxoCount */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{addr.label}</p>
                      <p className="text-xs text-amber-400 font-mono truncate">{addr.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-400">
                        {liveBalance.toFixed(4)} ROD
                      </p>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs">
                        {utxoCount} UTXO{utxoCount === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>

          {/* Rest of your code remains the same */}
        </TabsContent>
        {/* Other tabs unchanged */}
      </Tabs>
    </div>
  );
}