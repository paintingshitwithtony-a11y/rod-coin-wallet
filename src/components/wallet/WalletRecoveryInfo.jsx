import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Download, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletRecoveryInfo({ isOpen, onClose, walletData }) {
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [showPassphrase, setShowPassphrase] = useState(false);

    if (!walletData) return null;

    const { address, privateKey, passphrase, walletName } = walletData;

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const downloadRecovery = () => {
        const recoveryData = {
            walletName,
            address,
            privateKey,
            passphrase,
            createdAt: new Date().toISOString(),
            warning: 'Keep this file safe. Anyone with this information can access your wallet.'
        };

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(recoveryData, null, 2)));
        element.setAttribute('download', `wallet-recovery-${Date.now()}.json`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        toast.success('Recovery file downloaded');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-400">
                        <AlertTriangle className="w-5 h-5" />
                        Save Your Wallet Recovery Information
                    </DialogTitle>
                </DialogHeader>

                <Alert className="bg-amber-900/20 border-amber-700 mb-4">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-200">
                        This information will not be shown again. Save it securely now before closing this window.
                    </AlertDescription>
                </Alert>

                <div className="space-y-6">
                    {/* Wallet Name */}
                    <div>
                        <label className="text-slate-300 text-sm font-semibold block mb-2">Wallet Name</label>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-slate-800 border border-slate-700 rounded p-3 text-sm text-green-400 break-all">
                                {walletName}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(walletName, 'Wallet name')}
                                className="border-slate-700 hover:bg-slate-800"
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="text-slate-300 text-sm font-semibold block mb-2">Wallet Address</label>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-slate-800 border border-slate-700 rounded p-3 text-sm text-cyan-400 break-all">
                                {address}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(address, 'Address')}
                                className="border-slate-700 hover:bg-slate-800"
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Passphrase */}
                    <div>
                        <label className="text-slate-300 text-sm font-semibold block mb-2">Encryption Passphrase</label>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-slate-800 border border-slate-700 rounded p-3 text-sm break-all">
                                {showPassphrase ? (
                                    <span className="text-red-400">{passphrase}</span>
                                ) : (
                                    <span className="text-slate-400">••••••••••••••••</span>
                                )}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                                className="border-slate-700 hover:bg-slate-800"
                            >
                                {showPassphrase ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(passphrase, 'Passphrase')}
                                className="border-slate-700 hover:bg-slate-800"
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Private Key */}
                    {privateKey && (
                        <div>
                            <label className="text-slate-300 text-sm font-semibold block mb-2">Private Key (WIF)</label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-slate-800 border border-slate-700 rounded p-3 text-sm break-all font-mono text-xs">
                                    {showPrivateKey ? (
                                        <span className="text-red-400">{privateKey}</span>
                                    ) : (
                                        <span className="text-slate-400">••••••••••••••••••••••••••••••••••••••••••••••••••••</span>
                                    )}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                                    className="border-slate-700 hover:bg-slate-800"
                                >
                                    {showPrivateKey ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyToClipboard(privateKey, 'Private key')}
                                    className="border-slate-700 hover:bg-slate-800"
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    <Alert className="bg-red-900/20 border-red-700">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-red-200 text-sm">
                            Never share your passphrase or private key. Store securely (password manager, cold storage, etc.).
                        </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                        <Button
                            onClick={downloadRecovery}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Recovery File
                        </Button>
                        <Button
                            onClick={onClose}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            I've Saved Everything
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}