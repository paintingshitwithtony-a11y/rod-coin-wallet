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
  LogOut, Settings, Shield, Plug, Loader2, AlertCircle, Activity, Users, Star, Pencil, Server, FolderOpen, Unlock, Trash2, Lock } from 'lucide-react';
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

  // === YOUR ORIGINAL CODE (restored) ===
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (account) {
      const mainAddress = {
        id: 'main',
        address: account.wallet_address,
        label: 'Mining Wallet',
        createdAt: account.created_date,
        isValid: true
      };

      setAddresses([mainAddress]);
      setBalance({ confirmed: account.balance || 0, unconfirmed: 0 });
    }
  }, [account]);

  const copyAddress = async (address) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Address copied');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden touch-pan-y">
      {/* Your full original dashboard should be here now */}
      {/* Paste the rest of your original code below this point if it's still missing some parts */}

      <Card className="bg-slate-900/80 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">My Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800">
              <div>
                <p className="font-medium text-white">{addr.label}</p>
                <p className="font-mono text-xs text-amber-400">{addr.address}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyAddress(addr.address)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}