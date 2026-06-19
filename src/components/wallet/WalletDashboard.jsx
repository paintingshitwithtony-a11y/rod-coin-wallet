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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [isMobile, setIsMobile] = useState(false);
  const [rpcConnected, setRpcConnected] = useState(null);
  const [addressBalances, setAddressBalances] = useState({});
  const [addressUtxoCounts, setAddressUtxoCounts] = useState({});
  const [pullDistance, setPullDistance] = useState(0);

  const pullStartYRef = useRef(null);

  // Touch Handlers
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

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
  };

  const handleManualRefresh = async () => {
    // your refresh logic here
    toast.info('Refreshing...');
  };

  // Live Mining Wallet
  useEffect(() => {
    const miningAddr = "RYKcnyMoWnqH67zdMCWCbEkyVNvHknn8FY".toLowerCase();
    if (account && normalizeAddress(account.wallet_address) === miningAddr) {
      // update logic
    }
  }, [account]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 pt-20 md:pt-4 pb-32 overflow-x-hidden touch-pan-y"
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}>

      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* Your full original content goes here */}
        {/* Paste the rest of your original JSX (header, tabs, My Addresses, etc.) below */}

        <h1 className="text-3xl font-bold text-white mb-6">ROD Wallet</h1>

        {/* Example of your tabs and content */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="overview">
            {/* Your overview content */}
          </TabsContent>
          <TabsContent value="generate">
            <AddressGenerator 
              account={account}
              onAddressGenerated={(wallet) => {
                // refresh logic
              }} 
            />
          </TabsContent>
          {/* other tabs */}
        </Tabs>

        <MobileWalletTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
}