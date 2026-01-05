import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    ArrowUpRight, ArrowDownLeft, Copy, CheckCircle2, 
    AlertCircle, QrCode, Send, Loader2, Wallet, BookUser
} from 'lucide-react';
import { motion } from 'framer-motion';
import { validateRODAddress } from './Base58';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import TransactionConfirmation from './TransactionConfirmation';
import MFAVerification from './MFAVerification';

export default function SendReceive({ mode, balance = 0, addresses = [], onGenerateNew, account, onTransactionComplete }) {
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

    useEffect(() => {
        if (mode === 'send' && account) {
            loadContacts();
        }
    }, [mode, account]);

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
            return;
        }
        
        setValidating(true);
        const result = await validateRODAddress(address);
        setAddressValid(result.valid);
        setValidating(false);
        
        if (!result.valid) {
            toast.error(`Invalid address: ${result.error}`);
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
        
        if (amountNum > balance) {
            toast.error('Insufficient balance');
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
            
            // Call backend function to broadcast transaction via ROD Core RPC
            const response = await base44.functions.invoke('sendTransaction', {
                recipient,
                amount: amountNum,
                fee: feeNum,
                memo: memo || ''
            });
            
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

    const handleReceive = async () => {
        const amountNum = parseFloat(receiveAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setReceiving(true);
        try {
            await base44.entities.Transaction.create({
                account_id: account.id,
                type: 'receive',
                amount: amountNum,
                fee: 0,
                address: selectedAddress || addresses[0]?.address,
                memo: '',
                confirmations: 6,
                status: 'confirmed'
            });
            
            const accounts = await base44.entities.WalletAccount.filter({ id: account.id });
            if (accounts.length > 0) {
                const newBalance = (accounts[0].balance || 0) + amountNum;
                await base44.entities.WalletAccount.update(account.id, {
                    balance: newBalance
                });
            }
            
            toast.success(`Received ${amountNum} ROD!`);
            setReceiveAmount('');
            
            if (onTransactionComplete) {
                onTransactionComplete();
            }
        } catch (error) {
            toast.error('Failed to record transaction');
        } finally {
            setReceiving(false);
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
                                    Available: {balance.toLocaleString()} ROD
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-300">Recipient Address</Label>
                                {contacts.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowContacts(!showContacts)}
                                        className="text-purple-400 hover:text-purple-300 h-auto py-1"
                                    >
                                        <BookUser className="w-4 h-4 mr-1" />
                                        {showContacts ? 'Hide' : 'Address Book'}
                                    </Button>
                                )}
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
                                        onClick={() => setAmount(String(balance - parseFloat(fee)))}
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
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-400">Amount</span>
                                    <span className="text-white">{amount} ROD</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-400">Fee</span>
                                    <span className="text-white">{fee} ROD</span>
                                </div>
                                <div className="border-t border-slate-700 pt-2 mt-2">
                                    <div className="flex justify-between text-sm font-semibold">
                                        <span className="text-slate-300">Total</span>
                                        <span className="text-amber-400">
                                            {(parseFloat(amount || 0) + parseFloat(fee)).toFixed(8)} ROD
                                        </span>
                                    </div>
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
                                        <p className="text-sm font-medium text-green-400 mb-3">Record Received Coins</p>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                value={receiveAmount}
                                                onChange={(e) => setReceiveAmount(e.target.value)}
                                                placeholder="Amount received"
                                                className="bg-slate-800/50 border-slate-700 text-white"
                                            />
                                            <Button
                                                onClick={handleReceive}
                                                disabled={receiving || !receiveAmount}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {receiving ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    'Add'
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Enter the amount of ROD you received at this address
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
                </CardContent>
            </Card>
        </motion.div>
    );
}