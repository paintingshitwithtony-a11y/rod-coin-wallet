import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    ArrowUpRight, ArrowDownLeft, Copy, CheckCircle2, 
    AlertCircle, QrCode, Send, Loader2, Wallet, BookUser, Hash
} from 'lucide-react';
import { motion } from 'framer-motion';
import { validateRODAddress } from './Base58';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import TransactionConfirmation from './TransactionConfirmation';
import MFAVerification from './MFAVerification';

export default function SendReceive({ mode, balance = 0, addresses = [], onGenerateNew, account, onTransactionComplete, fromAddress }) {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [fee, setFee] = useState('0.0001');
    const [memo, setMemo] = useState('');
    const [selectedAddress, setSelectedAddress] = useState('');
    const [validating, setValidating] = useState(false);
    const [addressValid, setAddressValid] = useState(null);
    const [sending, setSending] = useState(false);
    const [copied, setCopied] = useState(false);
    const [receiveAmount, setReceiveAmount] = useState('');
    const [receiving, setReceiving] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [showContacts, setShowContacts] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showMFA, setShowMFA] = useState(false);
    const [mfaVerified, setMfaVerified] = useState(false);
    const [txidInput, setTxidInput] = useState('');
    const [importingTxid, setImportingTxid] = useState(false);
    const [myWallets, setMyWallets] = useState([]);
    const [selectedFromWallet, setSelectedFromWallet] = useState(null);
    const [showMyWallets, setShowMyWallets] = useState(false);
    const [isSendingToOwnWallet, setIsSendingToOwnWallet] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [rpcBalances, setRpcBalances] = useState({});
    const [loadingRPC, setLoadingRPC] = useState(false);
    const [canSwitch, setCanSwitch] = useState(true);
    const switchTimeoutRef = useRef(null);

    useEffect(() => {
        if (mode === 'send' && account) {
            loadContacts();
            loadMyWallets();
        }
        return () => {
            if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
        };
    }, [mode, account]);

    // Update main wallet balance when parent updates
    useEffect(() => {
        if (selectedFromWallet?.id === 'main-account' && balance !== selectedFromWallet?.balance) {
            setSelectedFromWallet(prev => prev ? { ...prev, balance } : null);
        }
    }, [balance]);

    const loadMyWallets = async () => {
        try {
            // Fetch fresh account data for main wallet balance
            const accounts = await base44.entities.WalletAccount.filter({ id: account.id });
            const freshAccount = accounts.length > 0 ? accounts[0] : account;

            const wallets = await base44.entities.Wallet.filter(
                { account_id: account.id },
                '-created_date'
            );

            // Include main wallet with balance from database
            const mainWallet = {
                id: 'main-account',
                name: 'Main Wallet',
                wallet_address: freshAccount.wallet_address,
                balance: freshAccount.balance || 0
            };

            // Include additional addresses as selectable wallets
            const additionalAddressWallets = (freshAccount.additional_addresses || []).map((addr, i) => ({
                id: `address-${addr.address}`,
                name: addr.label || `Address ${i + 1}`,
                wallet_address: addr.address,
                balance: 0 // Balance will be fetched from transactions if needed
            }));

            const allWallets = [mainWallet, ...wallets, ...additionalAddressWallets];
            
            // Check for duplicates and remove them
            const addressMap = {};
            const foundDuplicates = [];
            const uniqueWallets = [];
            allWallets.forEach(w => {
                if (addressMap[w.wallet_address]) {
                    foundDuplicates.push(w.wallet_address);
                } else {
                    addressMap[w.wallet_address] = w;
                    uniqueWallets.push(w);
                }
            });
            setDuplicates(foundDuplicates);
            
            // Fetch RPC balances only for unique wallets
            await fetchRPCBalances(uniqueWallets);
            
            setMyWallets(uniqueWallets);
            
            // Set default selected wallet
            if (fromAddress) {
                const wallet = allWallets.find(w => w.wallet_address === fromAddress);
                setSelectedFromWallet(wallet || mainWallet);
            } else {
                setSelectedFromWallet(mainWallet);
            }
        } catch (err) {
            console.error('Failed to load wallets:', err);
        }
    };

    // Correct UTXO-based balance: sum of listunspent outputs for this address only
    const fetchRPCBalances = async (wallets) => {
        setLoadingRPC(true);
        const balances = {};
        
        for (const wallet of wallets) {
            try {
                const response = await base44.functions.invoke('executeRPCCommand', {
                    method: 'listunspent',
                    params: [0, 9999999, [wallet.wallet_address]]
                });
                if (response.data.success) {
                    const utxos = (response.data.result || []).filter(u => u.address === wallet.wallet_address);
                    const utxoBalance = parseFloat(utxos.reduce((sum, u) => sum + u.amount, 0).toFixed(8));
                    balances[wallet.wallet_address] = utxoBalance;
                } else {
                    balances[wallet.wallet_address] = null;
                }
            } catch (err) {
                console.error(`Failed to fetch UTXO balance for ${wallet.wallet_address}:`, err);
                balances[wallet.wallet_address] = null;
            }
        }
        
        setRpcBalances(balances);
        setLoadingRPC(false);
    };

    const loadContacts = async () => {
        try {
            const data = await base44.entities.AddressBook.filter(
                { account_id: account.id },
                '-created_date',
                10
            );
            setContacts(data);
        } catch (err) {
            console.error('Failed to load contacts:', err);
        }
    };

    const handleSelectContact = (address) => {
        setRecipient(address);
        validateAddress(address);
        setShowContacts(false);
    };

    const validateAddress = async (address) => {
        if (!address || address.length < 26) {
            setAddressValid(null);
            setIsInternalTransfer(false);
            return;
        }
        
        setValidating(true);
        const result = await validateRODAddress(address);
        setAddressValid(result.valid);
        
        // Note whether recipient is one of user's own wallets (still an on-chain tx)
        const isMyWallet = myWallets.some(w => w.wallet_address === address);
        setIsSendingToOwnWallet(isMyWallet);

        setValidating(false);

        if (!result.valid) {
            toast.error(`Invalid address: ${result.error}`);
        } else if (isMyWallet) {
            toast.info('Sending to your own wallet — network fee still applies', { duration: 3000 });
        }
    };

    const handleSendClick = () => {
        if (!addressValid) {
            toast.error('Please enter a valid ROD address');
            return;
        }
        
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        
        const rpcBalance = rpcBalances[selectedFromWallet?.wallet_address] ?? 0;
        const feeNum = parseFloat(fee) || 0;
        if (amountNum + feeNum > rpcBalance) {
            toast.error(`Insufficient balance — need ${(amountNum + feeNum).toFixed(8)} ROD (amount + fee), have ${rpcBalance.toFixed(8)} ROD`);
            return;
        }

        // Show confirmation screen
        setShowConfirmation(true);
    };

    const handleConfirmTransaction = () => {
        // Check if MFA is enabled
        if (account.mfa_enabled && !mfaVerified) {
            setShowConfirmation(false);
            setShowMFA(true);
            return;
        }

        // Proceed with transaction
        executeSend();
    };

    const handleMFAVerified = () => {
        setShowMFA(false);
        setMfaVerified(true);
        executeSend();
    };

    const executeSend = async () => {
        setSending(true);
        setShowConfirmation(false);
        
        try {
            const amountNum = parseFloat(amount);
            const feeNum = parseFloat(fee);
            const senderAddress = selectedFromWallet?.wallet_address || account.wallet_address;

            if (!senderAddress) {
                toast.error('No source address selected');
                setSending(false);
                return;
            }

            // Backend handles all decryption and signing — no key material on frontend
            const response = await base44.functions.invoke('sendTransaction', {
                fromAddress: senderAddress,
                recipient,
                amount: amountNum,
                fee: feeNum,
                memo: memo || ''
            });
            
            console.log('Response:', response.data);
            
            if (response.data.error) {
                toast.error(response.data.error, {
                    description: response.data.details || 'Please check your RPC connection'
                });
                return;
            }
            
            toast.success('Transaction sent successfully!', {
                description: `TxID: ${response.data.txid.slice(0, 16)}...`
            });
            
            setRecipient('');
            setAmount('');
            setMemo('');
            setMfaVerified(false);
            setAddressValid(null);
            
            if (onTransactionComplete) {
                onTransactionComplete();
            }
        } catch (error) {
            toast.error('Transaction failed', {
                description: error.message || 'Failed to broadcast transaction'
            });
        } finally {
            setSending(false);
        }
    };

    const copyAddress = async (address) => {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        toast.success('Address copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImportByTxid = async () => {
        if (!txidInput || txidInput.length < 64) {
            toast.error('Please enter a valid transaction hash');
            return;
        }

        setImportingTxid(true);
        try {
            const response = await base44.functions.invoke('importDepositByHash', {
                txid: txidInput
            });

            if (response.data.error) {
                toast.error(response.data.error);
                return;
            }

            toast.success(`Imported ${response.data.amount} ROD!`, {
                description: `${response.data.confirmations} confirmations`
            });
            setTxidInput('');

            if (onTransactionComplete) {
                onTransactionComplete();
            }
        } catch (error) {
            toast.error('Failed to import transaction');
        } finally {
            setImportingTxid(false);
        }
    };

    if (mode === 'send') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl max-w-xl mx-auto">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-red-500/20">
                                <ArrowUpRight className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Send ROD</CardTitle>
                                <CardDescription className="text-slate-400">
                                    {selectedFromWallet ? `${selectedFromWallet.name}: ${(rpcBalances[selectedFromWallet.wallet_address] ?? balance)?.toLocaleString() || '0'} ROD` : `Available: ${balance.toLocaleString()} ROD`}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* From Wallet Selector */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">From Wallet</Label>
                            <Select 
                                value={selectedFromWallet?.id} 
                                disabled={!canSwitch}
                                onValueChange={async (id) => {
                                    if (!canSwitch) return;

                                    setCanSwitch(false);
                                    const wallet = myWallets.find(w => w.id === id);
                                    setSelectedFromWallet(wallet);

                                    // Update wallet active status
                                    if (wallet && wallet.id !== 'main-account') {
                                        try {
                                            // Set selected wallet to active and others to inactive
                                            const updates = myWallets.map(w => {
                                                if (w.id === 'main-account') return null;
                                                return base44.asServiceRole.entities.Wallet.update(w.id, {
                                                    is_active: w.id === id
                                                });
                                            }).filter(Boolean);

                                            await Promise.all(updates);
                                        } catch (err) {
                                            console.error('Failed to update wallet status:', err);
                                        }
                                    }

                                    // Re-enable switching after 2 seconds
                                    if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
                                    switchTimeoutRef.current = setTimeout(() => setCanSwitch(true), 2000);
                                }}
                            >
                                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {myWallets.map((wallet) => {
                                             const rpcBal = rpcBalances[wallet.wallet_address];
                                             const isDuplicate = duplicates.includes(wallet.wallet_address);
                                             return (
                                                 <SelectItem key={wallet.id} value={wallet.id} className={isDuplicate ? 'bg-red-500/10' : ''}>
                                                     <div className="flex items-center gap-3">
                                                         <div className="flex flex-col gap-1">
                                                             <span>{wallet.name}</span>
                                                             <span className="text-xs text-amber-400/80 font-mono">
                                                                 {wallet.wallet_address}
                                                             </span>
                                                         </div>
                                                         <div className="flex flex-col items-end gap-1">
                                                             {rpcBal !== null && rpcBal !== undefined ? (
                                                                 <span className="text-xs text-purple-400 font-semibold">
                                                                     {rpcBal.toFixed(4)} ROD
                                                                 </span>
                                                             ) : (
                                                                 <span className="text-xs text-slate-500">
                                                                     {loadingRPC ? 'loading...' : 'error'}
                                                                 </span>
                                                             )}
                                                         </div>
                                                     </div>
                                                 </SelectItem>
                                             );
                                         })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-300">Recipient Address</Label>
                                <div className="flex gap-2">
                                    {myWallets.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowMyWallets(!showMyWallets)}
                                            className="text-amber-400 hover:text-amber-300 h-auto py-1"
                                        >
                                            <Wallet className="w-4 h-4 mr-1" />
                                            {showMyWallets ? 'Hide' : 'My Wallets'}
                                        </Button>
                                    )}
                                    {contacts.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowContacts(!showContacts)}
                                            className="text-purple-400 hover:text-purple-300 h-auto py-1"
                                        >
                                            <BookUser className="w-4 h-4 mr-1" />
                                            {showContacts ? 'Hide' : 'Contacts'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="relative">
                                <Input
                                    value={recipient}
                                    onChange={(e) => {
                                        setRecipient(e.target.value);
                                        validateAddress(e.target.value);
                                    }}
                                    placeholder="Enter ROD address (R...)"
                                    className="bg-slate-800/50 border-slate-700 text-white pr-10 font-mono"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {validating ? (
                                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                    ) : addressValid === true ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    ) : addressValid === false ? (
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                    ) : null}
                                </div>
                            </div>

                            {showMyWallets && myWallets.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/30 space-y-2"
                                >
                                                    <p className="text-xs text-amber-400 mb-2">Transfer to My Wallet (on-chain, fee applies)</p>
                                    {myWallets.filter(w => w.id !== selectedFromWallet?.id).map((wallet) => (
                                        <button
                                            key={wallet.id}
                                            onClick={() => handleSelectContact(wallet.wallet_address)}
                                            className="w-full text-left p-2 rounded hover:bg-amber-700/30 transition-colors"
                                        >
                                            <p className="text-sm text-white font-medium">{wallet.name}</p>
                                            <p className="text-xs text-amber-400/80 font-mono truncate">
                                                {wallet.wallet_address}
                                            </p>
                                        </button>
                                    ))}
                                </motion.div>
                            )}

                            {showContacts && contacts.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-3 rounded-lg bg-slate-800/30 border border-slate-700 space-y-2"
                                >
                                    <p className="text-xs text-slate-400 mb-2">Saved Contacts</p>
                                    {contacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            onClick={() => handleSelectContact(contact.address)}
                                            className="w-full text-left p-2 rounded hover:bg-slate-700/50 transition-colors"
                                        >
                                            <p className="text-sm text-white font-medium">{contact.label}</p>
                                            <p className="text-xs text-amber-400/80 font-mono truncate">
                                                {contact.address}
                                            </p>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Amount</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.0000"
                                    className="bg-slate-800/50 border-slate-700 text-white pr-20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <span className="text-slate-500">ROD</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const walletBalance = rpcBalances[selectedFromWallet?.wallet_address] ?? balance;
                                            const feeAmount = isInternalTransfer ? 0 : parseFloat(fee);
                                            setAmount(String(Math.max(0, walletBalance - feeAmount)));
                                        }}
                                        className="h-6 px-2 text-xs text-purple-400"
                                    >
                                        MAX
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Transaction Fee</Label>
                            <Select value={fee} onValueChange={setFee}>
                                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="0.00001">Economy (0.00001 ROD)</SelectItem>
                                    <SelectItem value="0.0001">Normal (0.0001 ROD)</SelectItem>
                                    <SelectItem value="0.001">Priority (0.001 ROD)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Memo (optional)</Label>
                            <Textarea
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="Add a note..."
                                className="bg-slate-800/50 border-slate-700 text-white h-20"
                            />
                        </div>

                        {amount && parseFloat(amount) > 0 && (
                            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                                {isInternalTransfer && (
                                    <div className="flex items-center gap-2 mb-3 text-amber-400">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs font-medium">Sending to your own wallet — this is a real on-chain transaction. Network fee applies.</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-400">Amount</span>
                                    <span className="text-white">{amount} ROD</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-400">Network Fee</span>
                                    <span className="text-white">{fee} ROD</span>
                                </div>
                                <div className="border-t border-slate-700 pt-2 mt-2">
                                    <div className="flex justify-between text-sm font-semibold">
                                        <span className="text-slate-300">Total Deducted</span>
                                        <span className="text-amber-400">
                                            {(parseFloat(amount || 0) + parseFloat(fee)).toFixed(8)} ROD
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Change returns to source address automatically</p>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleSendClick}
                            disabled={!addressValid || !amount || sending}
                            className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 h-12"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Review & Send
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {showConfirmation && (
                    <TransactionConfirmation
                        recipient={recipient}
                        amount={amount}
                        fee={fee}
                        memo={memo}
                        onConfirm={handleConfirmTransaction}
                        onCancel={() => setShowConfirmation(false)}
                        loading={sending}
                    />
                )}

                {showMFA && (
                    <MFAVerification
                        account={account}
                        onVerified={handleMFAVerified}
                        onCancel={() => {
                            setShowMFA(false);
                            setShowConfirmation(true);
                        }}
                    />
                )}
            </motion.div>
        );
    }

    // Receive mode
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl max-w-xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-green-500/20">
                            <ArrowDownLeft className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Receive ROD</CardTitle>
                            <CardDescription className="text-slate-400">
                                Share your address to receive payments
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    {addresses.length > 0 ? (
                        <>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Select Address</Label>
                                <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                                        <SelectValue placeholder="Choose an address" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        {addresses.map((addr) => (
                                            <SelectItem key={addr.id} value={addr.address}>
                                                <span className="font-mono text-sm">{addr.address.slice(0, 12)}...{addr.address.slice(-8)}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedAddress && (
                                <div className="text-center space-y-4">
                                    <div className="p-6 rounded-xl bg-white inline-block mx-auto">
                                        <div className="w-48 h-48 bg-slate-200 rounded-lg flex items-center justify-center">
                                            <QrCode className="w-32 h-32 text-slate-800" />
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                        <p className="text-xs text-slate-500 mb-2">Your ROD Address</p>
                                        <code className="text-sm text-amber-400 font-mono break-all">
                                            {selectedAddress}
                                        </code>
                                    </div>

                                    <Button
                                        onClick={() => copyAddress(selectedAddress)}
                                        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700"
                                    >
                                        {copied ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copy Address
                                            </>
                                        )}
                                    </Button>

                                    <div className="mt-6 p-4 rounded-lg bg-green-900/20 border border-green-500/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                            <p className="text-sm font-medium text-green-400">Automatic Deposit Detection</p>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            Incoming transactions are automatically detected via ROD Core RPC. 
                                            Your balance will update automatically when you receive coins at this address.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                                <Wallet className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400 mb-4">No addresses available</p>
                            <Button
                                onClick={onGenerateNew}
                                className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                            >
                                Generate New Address
                            </Button>
                        </div>
                    )}

                    <Alert className="bg-amber-500/10 border-amber-500/30">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-amber-300/80 text-sm">
                            Only send ROD (SpaceXpanse ROD Coin) to this address. Sending other cryptocurrencies may result in permanent loss.
                        </AlertDescription>
                    </Alert>

                    {/* Manual Import by Transaction Hash */}
                    <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Hash className="w-5 h-5 text-purple-400" />
                            <p className="text-sm font-medium text-white">Manual Import</p>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">
                            Already sent coins? Import a deposit manually using the transaction hash (TxID).
                        </p>
                        <div className="space-y-2">
                            <Input
                                value={txidInput}
                                onChange={(e) => setTxidInput(e.target.value)}
                                placeholder="Paste transaction hash (64 characters)"
                                className="bg-slate-900/50 border-slate-600 text-white font-mono text-xs"
                            />
                            <Button
                                onClick={handleImportByTxid}
                                disabled={!txidInput || importingTxid}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                size="sm"
                            >
                                {importingTxid ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Hash className="w-4 h-4 mr-2" />
                                        Import Deposit
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}