import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Copy, Send, AlertCircle } from 'lucide-react';

export default function WalletTester() {
    const [passphrases, setPassphrases] = useState(['', '']);
    const [fundingPassphrase, setFundingPassphrase] = useState('');
    const [wallets, setWallets] = useState(null);
    const [existingWallets, setExistingWallets] = useState([]);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [loading, setLoading] = useState(false);
    const [testingTx, setTestingTx] = useState(false);
    const [txResult, setTxResult] = useState(null);
    const [fundingTx, setFundingTx] = useState(null);

    useEffect(() => {
        loadExistingWallets();
    }, []);

    const loadExistingWallets = async () => {
        try {
            const savedSession = localStorage.getItem('rod_wallet_session');
            if (!savedSession) return;
            const session = JSON.parse(savedSession);
            const allWallets = await base44.entities.Wallet.filter({ account_id: session.id });
            setExistingWallets(allWallets);
            if (allWallets.length > 0) {
                setSelectedWalletId(allWallets[0].id);
            }
        } catch (err) {
            console.error('Failed to load wallets:', err);
        }
    };

    const handleCreateWallets = async () => {
        if (!passphrases[0].trim() || !passphrases[1].trim()) {
            toast.error('Please enter both passphrases for test wallets');
            return;
        }

        if (!selectedWalletId) {
            toast.error('Please select a wallet to fund from');
            return;
        }

        setLoading(true);
        try {
            const { data } = await base44.functions.invoke('createTestWallets', {
                passphrases
            });
            setWallets(data);
            setTxResult(null);
            toast.success('Test wallets created');

            // Auto-fund sender wallet from selected wallet using saved passphrase
            const fundingWallet = existingWallets.find(w => w.id === selectedWalletId);
            if (fundingWallet) {
                try {
                    setFundingTx('pending');
                    const { data: txData } = await base44.functions.invoke('sendTransaction', {
                        fromAddress: fundingWallet.wallet_address,
                        recipient: data.sender.address,
                        amount: 10,
                        fee: 0.001,
                        passphrase: fundingPassphrase || 'default'
                    });
                    setFundingTx('completed');
                    toast.success('Sender wallet funded: ' + txData.txid.substring(0, 16) + '...');
                } catch (fundErr) {
                    setFundingTx('failed');
                    toast.error('Auto-funding failed: ' + fundErr.message);
                }
            }
        } catch (err) {
            toast.error('Failed to create wallets: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendTransaction = async () => {
        if (!wallets) return;

        setTestingTx(true);
        try {
            const { data } = await base44.functions.invoke('sendTransaction', {
                fromAddress: wallets.sender.address,
                recipient: wallets.receiver.address,
                amount: 0.1,
                fee: 0.001,
                passphrase: wallets.sender.passphrase
            });
            setTxResult(data);
            toast.success('Transaction sent: ' + data.txid);
        } catch (err) {
            toast.error('Transaction failed: ' + err.message);
            setTxResult({ error: err.message });
        } finally {
            setTestingTx(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-900/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Wallet Testing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className="bg-blue-500/10 border-blue-500/50">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-400">
                            Create test wallets with custom passphrases and send a test transaction between them.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                        <div>
                            <Label className="text-slate-300">Fund From (Existing Wallet)</Label>
                            <select
                                value={selectedWalletId}
                                onChange={(e) => setSelectedWalletId(e.target.value)}
                                className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
                                disabled={existingWallets.length === 0}>
                                {existingWallets.length === 0 ? (
                                    <option>No wallets available</option>
                                ) : (
                                    existingWallets.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.wallet_address?.substring(0, 8)}...)
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <Label className="text-slate-300">Funding Wallet Passphrase (Optional)</Label>
                            <Input
                                type="password"
                                value={fundingPassphrase}
                                onChange={(e) => setFundingPassphrase(e.target.value)}
                                placeholder="Leave empty to use default wallet passphrase"
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label className="text-slate-300">Test Sender Passphrase</Label>
                                <Input
                                    type="password"
                                    value={passphrases[0]}
                                    onChange={(e) => setPassphrases([e.target.value, passphrases[1]])}
                                    placeholder="Enter passphrase for test sender"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Test Receiver Passphrase</Label>
                                <Input
                                    type="password"
                                    value={passphrases[1]}
                                    onChange={(e) => setPassphrases([passphrases[0], e.target.value])}
                                    placeholder="Enter passphrase for test receiver"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleCreateWallets}
                            disabled={loading || existingWallets.length === 0}
                            className="w-full bg-purple-600 hover:bg-purple-700">
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            {loading ? 'Creating & Funding...' : 'Create Test Wallets (Auto-Fund)'}
                        </Button>
                    </div>

                    {wallets && (
                        <div className="space-y-4 pt-6 border-t border-slate-700">
                            <h3 className="text-white font-semibold">Generated Wallets</h3>

                            {/* Sender Wallet */}
                            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-white font-medium">Sender Wallet</h4>
                                    <span className="text-xs text-slate-400">{wallets.sender.id}</span>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <Label className="text-xs text-slate-400">Address</Label>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs text-green-400 bg-slate-900 p-2 rounded flex-1 overflow-x-auto">
                                                {wallets.sender.address}
                                            </code>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(wallets.sender.address);
                                                    toast.success('Copied to clipboard');
                                                }}>
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Passphrase</Label>
                                        <code className="text-xs text-blue-400 bg-slate-900 p-2 rounded block">
                                            {wallets.sender.passphrase}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Receiver Wallet */}
                            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-white font-medium">Receiver Wallet</h4>
                                    <span className="text-xs text-slate-400">{wallets.receiver.id}</span>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <Label className="text-xs text-slate-400">Address</Label>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs text-green-400 bg-slate-900 p-2 rounded flex-1 overflow-x-auto">
                                                {wallets.receiver.address}
                                            </code>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(wallets.receiver.address);
                                                    toast.success('Copied to clipboard');
                                                }}>
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Passphrase</Label>
                                        <code className="text-xs text-blue-400 bg-slate-900 p-2 rounded block">
                                            {wallets.receiver.passphrase}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Funding Status */}
                            {fundingTx && (
                                <div className={`p-3 rounded-lg text-sm ${
                                    fundingTx === 'failed'
                                        ? 'bg-red-500/10 border border-red-500/50 text-red-400'
                                        : fundingTx === 'completed'
                                        ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                                        : 'bg-blue-500/10 border border-blue-500/50 text-blue-400'
                                }`}>
                                    {fundingTx === 'pending' && 'Funding sender wallet...'}
                                    {fundingTx === 'completed' && 'Sender wallet funded successfully'}
                                    {fundingTx === 'failed' && 'Funding failed - check wallet passphrase'}
                                </div>
                            )}

                            {/* Send Transaction Button */}
                            <Button
                                onClick={handleSendTransaction}
                                disabled={testingTx || fundingTx === 'pending' || fundingTx === 'failed'}
                                className="w-full bg-green-600 hover:bg-green-700">
                                {testingTx ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                {testingTx ? 'Sending Transaction...' : 'Send Test Transaction (0.1 ROD)'}
                            </Button>

                            {/* Transaction Result */}
                            {txResult && (
                                <div className={`p-4 rounded-lg border ${
                                    txResult.error 
                                        ? 'bg-red-500/10 border-red-500/50' 
                                        : 'bg-green-500/10 border-green-500/50'
                                }`}>
                                    <h4 className={txResult.error ? 'text-red-400 font-medium mb-2' : 'text-green-400 font-medium mb-2'}>
                                        {txResult.error ? 'Transaction Failed' : 'Transaction Successful'}
                                    </h4>
                                    {txResult.error ? (
                                        <code className="text-xs text-red-300 bg-slate-900 p-2 rounded block">
                                            {txResult.error}
                                        </code>
                                    ) : (
                                        <div className="space-y-2">
                                            <div>
                                                <Label className="text-xs text-slate-400">TXID</Label>
                                                <code className="text-xs text-green-400 bg-slate-900 p-2 rounded block overflow-x-auto">
                                                    {txResult.txid}
                                                </code>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-slate-400">Amount: </span>
                                                    <span className="text-green-400">{txResult.amount} ROD</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Fee: </span>
                                                    <span className="text-green-400">{txResult.fee} ROD</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Change: </span>
                                                    <span className="text-green-400">{txResult.change} ROD</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Balance: </span>
                                                    <span className="text-green-400">{txResult.spendableBalance} ROD</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}