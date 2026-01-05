import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Shield, Smartphone, Mail, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TwoFactorAuth({ account }) {
    const [mfaMethod, setMfaMethod] = useState(account.mfa_method || 'email');
    const [saving, setSaving] = useState(false);

    const handleToggleMFA = async () => {
        setSaving(true);
        try {
            await base44.entities.WalletAccount.update(account.id, {
                mfa_enabled: !account.mfa_enabled,
                mfa_method: mfaMethod
            });
            
            toast.success(account.mfa_enabled ? 'MFA disabled' : 'MFA enabled for transactions');
            window.location.reload();
        } catch (err) {
            toast.error('Failed to update MFA settings');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateMethod = async () => {
        if (mfaMethod === account.mfa_method) return;
        
        setSaving(true);
        try {
            await base44.entities.WalletAccount.update(account.id, {
                mfa_method: mfaMethod
            });
            
            toast.success('MFA method updated');
            window.location.reload();
        } catch (err) {
            toast.error('Failed to update MFA method');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-purple-500/20">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white text-lg">Transaction Verification (MFA)</CardTitle>
                            <CardDescription className="text-slate-400">
                                Require verification for sending transactions
                            </CardDescription>
                        </div>
                    </div>
                    <Badge 
                        variant="outline" 
                        className={account.mfa_enabled ? "border-green-500/50 text-green-400" : "border-slate-600 text-slate-400"}
                    >
                        {account.mfa_enabled ? (
                            <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Enabled
                            </>
                        ) : (
                            'Disabled'
                        )}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="bg-blue-500/10 border-blue-500/30">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-300/80 text-sm">
                        When enabled, you'll need to verify your identity before sending ROD transactions.
                    </AlertDescription>
                </Alert>

                <div className="space-y-3">
                    <Label className="text-slate-300">Verification Method</Label>
                    <RadioGroup value={mfaMethod} onValueChange={setMfaMethod}>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors">
                            <RadioGroupItem value="email" id="email" className="text-purple-500" />
                            <Mail className="w-5 h-5 text-slate-400" />
                            <div className="flex-1">
                                <Label htmlFor="email" className="text-white font-medium text-sm cursor-pointer">
                                    Email Verification
                                </Label>
                                <p className="text-slate-500 text-xs">Receive verification codes via email</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors">
                            <RadioGroupItem value="authenticator" id="authenticator" className="text-purple-500" />
                            <Smartphone className="w-5 h-5 text-slate-400" />
                            <div className="flex-1">
                                <Label htmlFor="authenticator" className="text-white font-medium text-sm cursor-pointer">
                                    Authenticator App
                                </Label>
                                <p className="text-slate-500 text-xs">Use Google Authenticator or similar apps</p>
                            </div>
                        </div>
                    </RadioGroup>
                </div>

                <div className="flex gap-2">
                    <Button 
                        onClick={handleToggleMFA}
                        disabled={saving}
                        className={account.mfa_enabled ? 
                            "flex-1 bg-red-600 hover:bg-red-700" : 
                            "flex-1 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                        }
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : account.mfa_enabled ? (
                            'Disable MFA'
                        ) : (
                            'Enable MFA'
                        )}
                    </Button>
                    
                    {account.mfa_enabled && mfaMethod !== account.mfa_method && (
                        <Button 
                            onClick={handleUpdateMethod}
                            disabled={saving}
                            variant="outline"
                            className="border-slate-700 text-slate-300 hover:text-white"
                        >
                            Update Method
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}