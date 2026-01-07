import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, 
    TrendingUp, Clock, Copy, CheckCircle2, ExternalLink,
    LogOut, Settings, Shield, Plug, Loader2, AlertCircle, Key, Activity, Users, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import AddressGenerator from './AddressGenerator';
import SendReceive from './SendReceive';
import AddressBook from './AddressBook';
import WalletImport from './WalletImport';
import RPCConfigManager from './RPCConfigManager';
import AddressSeedModal from './AddressSeedModal';
import TransactionHistory from './TransactionHistory';
import AddressManager from './AddressManager';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WalletDashboard({ account, onLogout }) {
    const [balance, setBalance] = useState({ confirmed: account?.balance || 0, unconfirmed: 0 });
    const [addresses, setAddresses] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [rodPrice, setRodPrice] = useState(null);
    const [priceLoading, setPriceLoading] = useState(true);
    const [networkHashrate, setNetworkHashrate] = useState(null);
    const [rpcConnected, setRpcConnected] = useState(null);
    const [showRPCModal, setShowRPCModal] = useState(false);
    const [showRPCManager, setShowRPCManager] = useState(false);
    const [rpcNodeInfo, setRpcNodeInfo] = useState(null);
    const [selectedAddressForSeed, setSelectedAddressForSeed] = useState(null);
    const [rpcError, setRpcError] = useState(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [selectedWalletFilter, setSelectedWalletFilter] = useState('all');

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        // Load addresses from account
        if (account) {
            const mainAddress = {
                id: 'main',
                address: account.wallet_address,
                label: 'Primary Address',
                createdAt: account.created_date,
                isValid: true,
                importStatus: 'pending'
            };
            
            const additionalAddresses = (account.additional_addresses || []).map((addr, i) => ({
                id: `addr-${i}`,
                address: addr.address,
                label: addr.label || `Address ${i + 2}`,
                createdAt: addr.created_at,
                isValid: true,
                importStatus: 'pending'
            }));

            setAddresses([mainAddress, ...additionalAddresses]);
            setBalance({ confirmed: account.balance || 0, unconfirmed: 0 });
            }
        importAllAddresses();
        fetchWalletData();
        fetchRODPrice();
        fetchNetworkHashrate();
        checkForDeposits();
        checkRPCStatus();
        fetchOnlineUsers();

        // Auto-refresh balance, check deposits, and import addresses every 30 seconds
        const interval = setInterval(() => {
            fetchWalletData();
            fetchNetworkHashrate();
            checkForDeposits();
            checkRPCStatus();
            fetchOnlineUsers();
            // Periodically attempt to import any pending addresses
            if (rpcConnected) {
                importAllAddresses();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [account]);

    const fetchRODPrice = async () => {
        setPriceLoading(true);
        try {
            // Hardcoded price from KlingeX.io (as of latest check)
            // In production, you would use a proper API endpoint
            setRodPrice(0.00049952);
        } catch (err) {
            console.error('Failed to fetch ROD price:', err);
        } finally {
            setPriceLoading(false);
        }
    };

    const fetchNetworkHashrate = async () => {
        try {
            const response = await fetch('http://explorer1.rod.spacexpanse.org:3001/');
            const html = await response.text();
            
            // Parse SHA256 hashrate - looks for the daily value
            const sha256Match = html.match(/sha256d Hash Rate:[^>]*>([0-9.]+)[^>]*>[^>]*>([0-9.]+)[^<]*<small[^>]*>(\w+)\/s<\/small>/);
            const neoscryptMatch = html.match(/neoscrypt Hash Rate[^>]*>([0-9.]+)[^>]*>[^>]*>([0-9.]+)[^<]*<small[^>]*>(\w+)\/s<\/small>/);
            
            if (sha256Match && neoscryptMatch) {
                setNetworkHashrate({
                    sha256: `${sha256Match[1]} ${sha256Match[3]}/s`,
                    neoscrypt: `${neoscryptMatch[1]} ${neoscryptMatch[3]}/s`
                });
            }
        } catch (err) {
            // Silently fail - explorer may be unreachable
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
        }
    };

    const importAllAddresses = async (showToast = false) => {
        try {
            const response = await base44.functions.invoke('importAllAddresses', {});

            if (response.data.imported > 0 || response.data.alreadyImported > 0) {
                if (showToast && response.data.imported > 0) {
                    toast.success(`Imported ${response.data.imported} address(es) to RPC node`);
                }
                // Update addresses with import status - mark as imported
                setAddresses(prev => prev.map(addr => ({
                    ...addr,
                    importStatus: 'imported'
                })));
            } else if (response.data.total === 0) {
                // No addresses to import yet
            } else if (response.data.message && showToast) {
                toast.warning(response.data.message, { duration: 5000 });
            }
        } catch (err) {
            console.error('Background import check failed:', err);
            // Mark addresses as failed to import
            setAddresses(prev => prev.map(addr => ({
                ...addr,
                importStatus: 'failed'
            })));
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
            } else {
                setRpcConnected(false);
                setRpcNodeInfo(null);
                setRpcError(response.data.error || 'Connection failed');
                
                // Attempt auto-reconnect (max 3 attempts)
                if (!isRetry && reconnectAttempts < 3) {
                    setIsReconnecting(true);
                    setReconnectAttempts(prev => prev + 1);
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
                setReconnectAttempts(prev => prev + 1);
                setTimeout(() => checkRPCStatus(true), 5000);
            } else {
                setIsReconnecting(false);
            }
        }
    };

    const checkForDeposits = async () => {
        try {
            const response = await base44.functions.invoke('checkDeposits', {});
            
            if (response.data.newDeposits && response.data.newDeposits.length > 0) {
                response.data.newDeposits.forEach(deposit => {
                    toast.success(`Received ${deposit.amount} ROD!`, {
                        description: `${deposit.confirmations} confirmations`
                    });
                });
                
                // Refresh wallet data after new deposits
                await fetchWalletData();
            }
        } catch (err) {
            console.error('Failed to check deposits:', err);
            toast.error('Failed to check for deposits');
        }
    };

    const handleManualRefresh = async () => {
        setLoading(true);
        toast.info('Refreshing wallet...');
        try {
            await checkForDeposits();
            await fetchWalletData();
            await checkRPCStatus();
            if (rpcConnected) {
                await importAllAddresses(true);
            }
            toast.success('Wallet refreshed');
        } catch (err) {
            console.error('Refresh failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchWalletData = async () => {
        setLoading(true);
        try {
            // Fetch actual transactions from database
            const txs = await base44.entities.Transaction.filter(
                { account_id: account.id },
                '-created_date',
                50
            );
            
            // Format transactions for display
            const formattedTxs = txs.map(tx => ({
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                address: tx.address.slice(0, 8) + '...' + tx.address.slice(-6),
                confirmations: tx.confirmations,
                timestamp: tx.created_date,
                status: tx.status
            }));
            
            setTransactions(formattedTxs);
            
            // Update balance from account
            const accounts = await base44.entities.WalletAccount.filter({ id: account.id });
            if (accounts.length > 0) {
                setBalance({ 
                    confirmed: accounts[0].balance || 0, 
                    unconfirmed: 0 
                });
            }
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddressGenerated = async (newAddress) => {
        // Save to account's additional_addresses first
        try {
            const currentAccount = await base44.entities.WalletAccount.filter({ id: account.id });
            if (currentAccount.length > 0) {
                const existingAddresses = currentAccount[0].additional_addresses || [];
                
                // Check if address already exists to prevent duplicates
                const alreadyExists = existingAddresses.some(addr => addr.address === newAddress.address);
                if (!alreadyExists) {
                    await base44.entities.WalletAccount.update(account.id, {
                        additional_addresses: [...existingAddresses, {
                            address: newAddress.address,
                            public_key_hash: newAddress.publicKeyHash,
                            label: newAddress.label,
                            created_at: newAddress.createdAt
                        }]
                    });
                    
                    // Add to state with pending import status
                    setAddresses(prev => [{
                        ...newAddress,
                        importStatus: 'pending'
                    }, ...prev]);
                }
            }
        } catch (err) {
            console.error('Failed to save address:', err);
            toast.error('Failed to save address to account');
        }
        
        // Trigger import check after a short delay
        setTimeout(() => {
            if (rpcConnected) {
                importAllAddresses();
            }
        }, 2000);
    };

    const handleWalletImported = async (importedWallet) => {
        // Save to account's additional_addresses first
        try {
            const currentAccount = await base44.entities.WalletAccount.filter({ id: account.id });
            if (currentAccount.length > 0) {
                const existingAddresses = currentAccount[0].additional_addresses || [];
                
                // Check if address already exists to prevent duplicates
                const alreadyExists = existingAddresses.some(addr => addr.address === importedWallet.address);
                if (!alreadyExists) {
                    await base44.entities.WalletAccount.update(account.id, {
                        additional_addresses: [...existingAddresses, {
                            address: importedWallet.address,
                            label: importedWallet.label,
                            created_at: importedWallet.created_at
                        }]
                    });
                    
                    // Add to state with pending import status
                    const newAddress = {
                        id: `imported-${Date.now()}`,
                        address: importedWallet.address,
                        label: importedWallet.label,
                        createdAt: importedWallet.created_at,
                        isValid: true,
                        importStatus: 'pending'
                    };
                    setAddresses(prev => [newAddress, ...prev]);
                    
                    // Try to import immediately
                    setTimeout(() => {
                        if (rpcConnected) {
                            importAllAddresses(true);
                        }
                    }, 1000);
                }
            }
        } catch (err) {
            console.error('Failed to save imported address:', err);
        }
        
        await fetchWalletData();
    };

    const copyAddress = async (address) => {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        toast.success('Address copied');
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    const makePrimary = async (selectedAddress) => {
        if (selectedAddress.address === account.wallet_address) {
            toast.info('This is already the primary address');
            return;
        }

        try {
            setLoading(true);
            
            // Get current account data
            const currentAccount = await base44.entities.WalletAccount.filter({ id: account.id });
            if (currentAccount.length === 0) return;

            const currentPrimary = {
                address: account.wallet_address,
                public_key_hash: account.public_key_hash,
                label: 'Primary Address',
                created_at: account.created_date
            };

            // Remove selected address from additional_addresses and add old primary
            const updatedAdditional = (currentAccount[0].additional_addresses || [])
                .filter(addr => addr.address !== selectedAddress.address);
            updatedAdditional.unshift(currentPrimary);

            // Update account with new primary
            await base44.entities.WalletAccount.update(account.id, {
                wallet_address: selectedAddress.address,
                public_key_hash: selectedAddress.publicKeyHash || selectedAddress.public_key_hash,
                additional_addresses: updatedAdditional
            });

            toast.success('Primary address updated!');
            
            // Reload addresses
            const updatedAccounts = await base44.entities.WalletAccount.filter({ id: account.id });
            if (updatedAccounts.length > 0) {
                const mainAddress = {
                    id: 'main',
                    address: updatedAccounts[0].wallet_address,
                    label: 'Primary Address',
                    createdAt: updatedAccounts[0].created_date,
                    isValid: true
                };
                
                const additionalAddresses = (updatedAccounts[0].additional_addresses || []).map((addr, i) => ({
                    id: `addr-${i}`,
                    address: addr.address,
                    label: addr.label || `Address ${i + 2}`,
                    createdAt: addr.created_at,
                    isValid: true,
                    importStatus: 'imported'
                }));

                setAddresses([mainAddress, ...additionalAddresses]);
            }
        } catch (err) {
            console.error('Failed to update primary address:', err);
            toast.error('Failed to update primary address');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
                <div className="flex items-center gap-2 md:gap-3">
                    <img 
                        src="https://www.spacexpanse.org/img/about.png" 
                        alt="SpaceXpanse Logo" 
                        className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} rounded-xl`}
                    />
                    <div>
                        <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white`}>ROD Wallet</h1>
                        <div className={`flex items-center gap-1 md:gap-2 flex-wrap ${isMobile ? 'text-xs' : ''}`}>
                            <Badge variant="outline" className={`border-green-500/50 text-green-400 ${isMobile ? 'text-xs px-1.5 py-0.5' : ''}`}>
                                <span className="w-2 h-2 rounded-full bg-green-400 mr-1 md:mr-2 animate-pulse" />
                                {isMobile ? 'Online' : 'Logged In'}
                            </Badge>
                            {rpcConnected !== null && (
                                <Badge 
                                    variant="outline" 
                                    className={`${isMobile ? 'text-xs px-1.5 py-0.5' : ''} ${
                                        isReconnecting ? "border-yellow-500/50 text-yellow-400" :
                                        rpcConnected ? "border-green-500/50 text-green-400" : 
                                        "border-red-500/50 text-red-400"
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${
                                        isReconnecting ? 'bg-yellow-400 animate-pulse' :
                                        rpcConnected ? 'bg-green-400' : 
                                        'bg-red-400'
                                    } mr-1 md:mr-2`} />
                                    {isReconnecting ? (isMobile ? `Retry ${reconnectAttempts}/3` : `Reconnecting (${reconnectAttempts}/3)`) :
                                     rpcConnected ? (isMobile ? 'RPC OK' : 'RPC Connected') : 
                                     (isMobile ? 'RPC Off' : 'RPC Offline')}
                                </Badge>
                            )}
                            {!isMobile && (
                                <span className="text-xs text-slate-500">
                                    {account?.email}
                                </span>
                            )}
                            <Badge variant="outline" className={`border-green-500/50 text-green-400 ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs'}`}>
                                <Users className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
                                {onlineUsers}
                            </Badge>
                            {!isMobile && networkHashrate && (
                                <>
                                    <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                                        SHA256: {networkHashrate.sha256}
                                    </Badge>
                                    <Badge variant="outline" className="border-purple-500/50 text-purple-400 text-xs">
                                        NEOSCRYPT: {networkHashrate.neoscrypt}
                                    </Badge>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'} ${isMobile ? 'justify-end' : ''}`}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleManualRefresh}
                        disabled={loading}
                        className={`text-slate-400 hover:text-white ${isMobile ? 'h-8 w-8' : ''}`}
                        title="Check for deposits and refresh"
                    >
                        <RefreshCw className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {!isMobile && (
                        <Link to={createPageUrl('RPCMonitor')}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-purple-400"
                                title="RPC Monitor Dashboard"
                            >
                                <Activity className="w-5 h-5" />
                            </Button>
                        </Link>
                    )}
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
                        className={`relative text-slate-400 hover:text-white ${isMobile ? 'h-8 w-8' : ''} ${
                            isReconnecting ? 'text-yellow-400' :
                            rpcConnected === false ? 'text-red-400' : 
                            rpcConnected ? 'text-green-400' : ''
                        }`}
                        title={
                            isReconnecting ? 'Reconnecting...' :
                            rpcConnected === false ? 'RPC Offline - Click to configure' :
                            'RPC Node Management'
                        }
                    >
                        <Plug className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} ${isReconnecting ? 'animate-pulse' : ''}`} />
                        {rpcConnected === false && !isReconnecting && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse" />
                        )}
                    </Button>
                    <Link to={createPageUrl('SecuritySettings')}>
                        <div className={`relative ${isMobile ? 'p-2' : 'p-3'} rounded-xl bg-gradient-to-br from-purple-500 to-amber-500 cursor-pointer hover:opacity-80 transition-opacity`}>
                            <Shield className={`${isMobile ? 'w-10 h-10' : 'w-15 h-15'} text-white`} />
                            <span className={`absolute inset-0 flex items-center justify-center text-white font-black ${isMobile ? 'text-[6px]' : 'text-[8px]'} tracking-wider`} style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>
                                SECURITY
                            </span>
                        </div>
                    </Link>
                    <Button
                        variant="ghost"
                        onClick={onLogout}
                        className={`text-slate-400 hover:text-red-400 gap-2 ${isMobile ? 'h-8 px-2' : ''}`}
                    >
                        <LogOut className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </div>

            {/* Balance Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="bg-gradient-to-br from-purple-900/80 to-slate-900/80 border-purple-500/30 backdrop-blur-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardContent className={`${isMobile ? 'p-4' : 'p-6'} relative`}>
                        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-start justify-between'}`}>
                            <div className="flex items-start gap-2 md:gap-3">
                                <img 
                                    src="https://www.spacexpanse.org/img/about.png" 
                                    alt="ROD Logo" 
                                    className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg mt-1`}
                                />
                                <div className="flex-1">
                                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 mb-1`}>Total Balance</p>
                                    <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-white mb-2`}>
                                        {balance.confirmed.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                                        <span className={`${isMobile ? 'text-sm' : 'text-xl'} text-slate-400 ml-2`}>ROD</span>
                                    </h2>
                                    {rodPrice && (
                                        <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-semibold text-green-400 mb-2`}>
                                            ≈ ${(balance.confirmed * rodPrice).toFixed(2)} USD
                                        </div>
                                    )}
                                    {balance.unconfirmed > 0 && (
                                        <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'} text-amber-400`}>
                                            <Clock className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                                            +{balance.unconfirmed} ROD pending
                                        </div>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            setLoading(true);
                                            try {
                                                const response = await base44.functions.invoke('recalculateBalance', {});
                                                if (response.data.success) {
                                                    toast.success(`Balance recalculated! ${response.data.duplicatesRemoved} duplicates removed`);
                                                    await fetchWalletData();
                                                } else {
                                                    toast.error('Failed to recalculate balance');
                                                }
                                            } catch (err) {
                                                toast.error('Failed to recalculate balance');
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading}
                                        className={`text-amber-400 hover:text-amber-300 border-amber-500/50 mt-2 ${isMobile ? 'h-7 px-2 text-xs' : 'h-6 px-2 text-xs'}`}
                                        title="Remove duplicate transactions and recalculate balance"
                                    >
                                        {loading ? <Loader2 className={`${isMobile ? 'w-3 h-3' : 'w-3 h-3'} mr-1 animate-spin`} /> : null}
                                        Fix Balance
                                    </Button>
                                </div>
                            </div>
                            <div className={`flex ${isMobile ? 'flex-row w-full justify-between' : 'flex-col items-end'} gap-3`}>
                                {priceLoading ? (
                                    <div className={`flex items-center gap-2 text-slate-400 ${isMobile ? 'text-xs' : ''}`}>
                                        <RefreshCw className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} animate-spin`} />
                                        {!isMobile && <span className="text-sm">Loading price...</span>}
                                    </div>
                                ) : rodPrice ? (
                                    <a 
                                        href="https://klingex.io/trade/ROD-USDT" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`flex flex-col ${isMobile ? 'items-start' : 'items-end'} ${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700 hover:border-purple-500/50 group`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-slate-400 group-hover:text-purple-400`}>Current Price</span>
                                            <ExternalLink className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-slate-500 group-hover:text-purple-400`} />
                                        </div>
                                        <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-400`}>
                                            ${rodPrice.toFixed(8)}
                                        </div>
                                        <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-slate-500 group-hover:text-purple-400`}>
                                            via KLINGEX.IO
                                        </div>
                                    </a>
                                ) : null}
                                <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                                <Button 
                                    onClick={() => setActiveTab('send')}
                                    className={`bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700 ${isMobile ? 'flex-1 text-sm px-3 h-9' : ''}`}
                                >
                                    <ArrowUpRight className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} mr-2`} />
                                    Send
                                </Button>
                                <Button 
                                    onClick={() => setActiveTab('receive')}
                                    className={`bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 ${isMobile ? 'flex-1 text-sm px-3 h-9' : ''}`}
                                >
                                    <ArrowDownLeft className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} mr-2`} />
                                    Receive
                                </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={`bg-slate-800/50 border border-slate-700 ${isMobile ? 'w-full grid grid-cols-4 h-auto' : ''}`}>
                    <TabsTrigger value="overview" className={`data-[state=active]:bg-purple-600 ${isMobile ? 'text-xs py-2' : ''}`}>
                        {isMobile ? 'Home' : 'Overview'}
                    </TabsTrigger>
                    <TabsTrigger value="history" className={`data-[state=active]:bg-purple-600 ${isMobile ? 'text-xs py-2' : ''}`}>
                        History
                    </TabsTrigger>
                    <TabsTrigger value="send" className={`data-[state=active]:bg-purple-600 ${isMobile ? 'text-xs py-2' : ''}`}>
                        Send
                    </TabsTrigger>
                    <TabsTrigger value="receive" className={`data-[state=active]:bg-purple-600 ${isMobile ? 'text-xs py-2' : ''}`}>
                        Receive
                    </TabsTrigger>
                    {!isMobile && (
                        <>
                            <TabsTrigger value="generate" className="data-[state=active]:bg-purple-600">
                                Generate
                            </TabsTrigger>
                            <TabsTrigger value="import" className="data-[state=active]:bg-purple-600">
                                Import
                            </TabsTrigger>
                            <TabsTrigger value="contacts" className="data-[state=active]:bg-purple-600">
                                Contacts
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

                <TabsContent value="history" className="mt-6">
                    <TransactionHistory account={account} />
                </TabsContent>

                <TabsContent value="overview" className={`${isMobile ? 'mt-4' : 'mt-6'}`}>
                    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
                        {/* Statistics Cards */}
                        <div className={`grid gap-3 ${isMobile ? 'grid-cols-3' : 'md:grid-cols-3 gap-4'}`}>
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardContent className={`${isMobile ? 'p-2' : 'p-4'}`}>
                                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 mb-1`}>{isMobile ? 'Received' : 'Total Received'}</p>
                                    <p className={`${isMobile ? 'text-sm' : 'text-2xl'} font-bold text-green-400`}>
                                        {isMobile ? '+' : '+'}{transactions.filter(tx => tx.type === 'receive').reduce((sum, tx) => sum + tx.amount, 0).toLocaleString(undefined, { minimumFractionDigits: isMobile ? 2 : 4 })}
                                        {!isMobile && ' ROD'}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardContent className={`${isMobile ? 'p-2' : 'p-4'}`}>
                                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 mb-1`}>{isMobile ? 'Sent' : 'Total Sent'}</p>
                                    <p className={`${isMobile ? 'text-sm' : 'text-2xl'} font-bold text-red-400`}>
                                        {transactions.filter(tx => tx.type === 'send').reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toLocaleString(undefined, { minimumFractionDigits: isMobile ? 2 : 4 })}
                                        {!isMobile && ' ROD'}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-900/80 border-slate-700/50">
                                <CardContent className={`${isMobile ? 'p-2' : 'p-4'}`}>
                                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 mb-1`}>{isMobile ? 'TXs' : 'Transactions'}</p>
                                    <p className={`${isMobile ? 'text-sm' : 'text-2xl'} font-bold text-white`}>
                                        {transactions.length}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

<div className={`grid ${isMobile ? 'gap-4' : 'gap-6 lg:grid-cols-2'}`}>
    {/* My Addresses */}
    <Card className="bg-slate-900/80 border-slate-700/50">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white text-lg">My Addresses</CardTitle>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-amber-400 hover:text-amber-300"
                                        onClick={async () => {
                                            await importAllAddresses(true);
                                        }}
                                        disabled={!rpcConnected || loading}
                                        title="Import all addresses to blockchain"
                                    >
                                        <Plug className="w-4 h-4 mr-1" />
                                        Import to Chain
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-purple-400"
                                        onClick={() => setActiveTab('generate')}
                                    >
                                        + New
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {addresses.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500 text-sm">No addresses generated yet</p>
                                        <Button
                                            variant="link"
                                            className="text-purple-400 mt-2"
                                            onClick={() => setActiveTab('generate')}
                                        >
                                            Generate your first address
                                        </Button>
                                    </div>
                                ) : (
                                    addresses.slice(0, 5).map((addr, index) => (
                                        <motion.div
                                            key={addr.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {addr.label}
                                                    </p>
                                                    {addr.importStatus === 'imported' && rpcConnected && (
                                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                                                            ✓ RPC
                                                        </Badge>
                                                    )}
                                                    {addr.importStatus === 'pending' && rpcConnected && (
                                                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-amber-400/80 font-mono truncate">
                                                    {addr.address}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                {addr.address !== account.wallet_address && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => makePrimary(addr)}
                                                        className="text-slate-400 hover:text-amber-400"
                                                        title="Make Primary"
                                                    >
                                                        <Star className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setSelectedAddressForSeed(addr)}
                                                    className="text-slate-400 hover:text-amber-400"
                                                    title="Add/Edit Seed Phrase"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => copyAddress(addr.address)}
                                                    className="text-slate-400 hover:text-white"
                                                >
                                                    {copiedAddress === addr.address ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Transactions */}
                        <Card className="bg-slate-900/80 border-slate-700/50">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white text-lg">Recent Transactions</CardTitle>
                                <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setActiveTab('history')}>
                                    View All
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Select value={selectedWalletFilter} onValueChange={setSelectedWalletFilter}>
                                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all">All Wallets</SelectItem>
                                        {addresses.map((addr) => (
                                            <SelectItem key={addr.id} value={addr.address}>
                                                {addr.label || addr.address.slice(0, 12) + '...'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {transactions
                                    .filter(tx => selectedWalletFilter === 'all' || tx.address.includes(selectedWalletFilter.slice(0, 8)) || tx.address.includes(selectedWalletFilter.slice(-6)))
                                    .slice(0, 10).map((tx, index) => (
                                    <motion.div
                                        key={tx.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'
                                            }`}>
                                                {tx.type === 'receive' ? (
                                                    <ArrowDownLeft className="w-5 h-5 text-green-400" />
                                                ) : (
                                                    <ArrowUpRight className="w-5 h-5 text-red-400" />
                                                )}
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
                                                tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount} ROD
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {tx.confirmations} confirmations
                                            </p>
                                        </div>
                                        </motion.div>
                                        ))}
                                        </div>
                                        </CardContent>
                                        </Card>
                        </div>

                        {/* Market Data Widget */}
                        {!isMobile && (
                            <Card className="bg-slate-900/80 border-slate-700/50 overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-white text-lg flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-green-400" />
                                        ROD Market Data
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <iframe 
                                        src="https://coinpaprika.com/coin/rod-spacexpanse/embed/?interval=0&modules[]=market_details&modules[]=chart&nightMode=true&primaryCurrency=USD&updateActive=false&volumeVisible=false"
                                        width="100%"
                                        height="600"
                                        frameBorder="0"
                                        scrolling="no"
                                        className="w-full"
                                        title="ROD SpaceXpanse Market Data"
                                    />
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="generate" className="mt-6">
                    <AddressGenerator onAddressGenerated={handleAddressGenerated} />
                </TabsContent>

                <TabsContent value="import" className="mt-6">
                    <WalletImport 
                        account={account}
                        onWalletImported={handleWalletImported}
                    />
                </TabsContent>

                <TabsContent value="send" className="mt-6">
                    <SendReceive 
                        mode="send" 
                        balance={balance.confirmed} 
                        account={account}
                        onTransactionComplete={fetchWalletData}
                    />
                </TabsContent>

                <TabsContent value="receive" className="mt-6">
                    <SendReceive 
                        mode="receive" 
                        addresses={addresses}
                        onGenerateNew={() => setActiveTab('generate')}
                    />
                </TabsContent>

                <TabsContent value="contacts" className="mt-6">
                    <AddressBook 
                        account={account}
                        onSelectAddress={(address) => {
                            setActiveTab('send');
                            setTimeout(() => {
                                const event = new CustomEvent('selectContact', { detail: address });
                                window.dispatchEvent(event);
                            }, 100);
                        }}
                    />
                </TabsContent>
                </Tabs>

                {/* Address Management Section */}
                {!isMobile && (
                <div className="mt-6">
                    <AddressManager 
                        account={account}
                        addresses={addresses}
                        onUpdate={async () => {
                            const updatedAccounts = await base44.entities.WalletAccount.filter({ id: account.id });
                            if (updatedAccounts.length > 0) {
                                const mainAddress = {
                                    id: 'main',
                                    address: updatedAccounts[0].wallet_address,
                                    label: 'Primary Address',
                                    createdAt: updatedAccounts[0].created_date,
                                    isValid: true,
                                    importStatus: 'pending'
                                };

                                const additionalAddresses = (updatedAccounts[0].additional_addresses || []).map((addr, i) => ({
                                    id: `addr-${i}`,
                                    address: addr.address,
                                    label: addr.label || `Address ${i + 2}`,
                                    createdAt: addr.created_at,
                                    isValid: true,
                                    importStatus: 'pending'
                                }));

                                setAddresses([mainAddress, ...additionalAddresses]);
                            }
                        }}
                    />
                </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Dummy tabs wrapper to fix nesting */}
                </Tabs>

            {/* RPC Manager Modal */}
            {showRPCManager && (
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
                    }}
                />
            )}

            {/* Address Seed Modal */}
            {selectedAddressForSeed && (
                <AddressSeedModal
                    address={selectedAddressForSeed}
                    account={account}
                    onClose={() => setSelectedAddressForSeed(null)}
                    onSaved={() => {
                        // Reload addresses to show updated data
                        const accounts = base44.entities.WalletAccount.filter({ id: account.id });
                        accounts.then(accs => {
                            if (accs.length > 0) {
                                const mainAddress = {
                                    id: 'main',
                                    address: accs[0].wallet_address,
                                    label: 'Primary Address',
                                    createdAt: accs[0].created_date,
                                    isValid: true
                                };

                                const additionalAddresses = (accs[0].additional_addresses || []).map((addr, i) => ({
                                    id: `addr-${i}`,
                                    address: addr.address,
                                    label: addr.label || `Address ${i + 2}`,
                                    createdAt: addr.created_at,
                                    isValid: true,
                                    seed_phrase: addr.seed_phrase,
                                    importStatus: 'imported'
                                }));

                                setAddresses([mainAddress, ...additionalAddresses]);
                            }
                        });
                    }}
                />
            )}

            {/* Connection Status Alert */}
            {rpcConnected === false && !isReconnecting && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-4 right-4 z-50 max-w-md"
                >
                    <Alert className="bg-red-500/10 border-red-500/30 backdrop-blur-xl">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-300/90">
                            <div className="flex items-center justify-between">
                                <div>
                                    <strong>RPC Offline</strong>
                                    {rpcError && <p className="text-xs mt-1 text-red-400/80">{rpcError}</p>}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setReconnectAttempts(0);
                                        checkRPCStatus();
                                    }}
                                    className="text-red-300 hover:text-white ml-4"
                                >
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                    Retry
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </motion.div>
            )}

            {isReconnecting && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-4 right-4 z-50 max-w-md"
                >
                    <Alert className="bg-yellow-500/10 border-yellow-500/30 backdrop-blur-xl">
                        <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />
                        <AlertDescription className="text-yellow-300/90">
                            <strong>Reconnecting to RPC...</strong>
                            <p className="text-xs mt-1">Attempt {reconnectAttempts} of 3</p>
                        </AlertDescription>
                    </Alert>
                </motion.div>
            )}

            {rpcConnected && rpcNodeInfo && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-4 right-4 z-50 max-w-sm"
                >
                    <Card className="bg-green-500/10 border-green-500/30 backdrop-blur-xl">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-300">RPC Connected</p>
                                    <p className="text-xs text-green-400/80">
                                        Block {rpcNodeInfo.blocks?.toLocaleString()} • {rpcNodeInfo.chain}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setRpcConnected(null)}
                                    className="text-green-400 hover:text-white"
                                >
                                    ×
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}