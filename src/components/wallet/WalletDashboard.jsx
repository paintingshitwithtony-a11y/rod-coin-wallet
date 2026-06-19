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
  LogOut, Settings, Shield, Plug, Loader2, AlertCircle, Activity, Users, Star, Pencil, Server, FolderOpen, Unlock, Trash2, Lock
} from 'lucide-react';
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
  DialogTitle } from "@/components/ui/dialog";
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
  const [showConfEditor, setShowConfEditor] = useState(false);
  const [lastImportTime, setLastImportTime] = useState(0);
  const [lastManualSyncTime, setLastManualSyncTime] = useState(0);
  const [walletUnlocked, setWalletUnlocked] = useState(false);
  const [addressBalances, setAddressBalances] = useState({});
  const [addressUtxoCounts, setAddressUtxoCounts] = useState({});
  const [pullDistance, setPullDistance] = useState(0);

  const pullStartYRef = useRef(null);
  const scrollPositionsRef = useRef({});
  const activeTabRef = useRef('overview');
  const walletDataRequestRef = useRef(null);
  const lastWalletDataFetchRef = useRef(0);
  const lastDepositCheckRef = useRef(0);

  // Tab handler
  const handleTabChange = (nextTab) => {
    if (!nextTab || nextTab === activeTabRef.current) return;
    scrollPositionsRef.current[activeTabRef.current] = window.scrollY;
    activeTabRef.current = nextTab;
    setActiveTab(nextTab);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  };

  // Touch handlers for pull-to-refresh
  const handleTouchStart = (event) => {
    if (!isMobile || window.scrollY > 0 || loading) return;
    pullStartYRef.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event) => {
    if (pullStartYRef.current === null) return;
    const distance = Math.max(0, event.touches[0].clientY - pullStartYRef.current);
    setPullDistance(Math.min(distance, 96));
  };

  const handleTouchEnd = () => {
    if (pullDistance > 72) handleManualRefresh();
    pullStartYRef.current = null;
    setPullDistance(0);
  };

  const handleManualRefresh = async () => {
    const now = Date.now();
    if (now - lastManualSyncTime < 30000) {
      toast.info('Please wait a moment before syncing again');
      return;
    }
    setLastManualSyncTime(now);
    setLoading(true);
    try {
      await checkForDeposits(false);
      await fetchWalletData(true);
      toast.success('Sync complete!');
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setLoading(false);
    }
  };

  // ... (keep all your other functions exactly as they are: fetchAllWallets, checkRPCStatus, handleWalletClick, etc.)

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 pt-20 md:pt-4 pb-32 overflow-x-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* Your full original content goes here - paste everything from your backup below this line */}
        {/* Header, Tabs, My Addresses, Recent Transactions, etc. */}
        {/* ... keep all your original JSX ... */}

        {/* Example placeholder - replace with your full content */}
        <h1 className="text-3xl font-bold text-white mb-6">ROD Wallet</h1>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* All your TabsContent go here */}
        </Tabs>

        <MobileWalletTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
}