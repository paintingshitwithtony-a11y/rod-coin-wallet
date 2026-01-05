import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Info, Smartphone, Key, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TwoFactorAuth({ account }) {
    const [enabled, setEnabled] = useState(false);

    return (
        <Card className="bg-slate-900/80 border-slate-700/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                            <Shield className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Two-Factor Authentication</CardTitle>
                            <CardDescription className="text-slate-400">
                                Add an extra layer of security to your account
                            </CardDescription>
                        </div>
                    </div>
                    <Badge 
                        variant="outline" 
                        className={enabled ? 'border-green-500/50 text-green-400' : 'border-slate-600 text-slate-500'}
                    >
                        {enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="bg-blue-900/20 border-blue-500/30">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-300/90 text-sm">
                        Two-factor authentication (2FA) will be available in a future update. This feature requires backend integration.
                    </AlertDescription>
                </Alert>

                <div className="space-y-4 opacity-60 pointer-events-none">
                    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                        <h4 className="text-sm font-medium text-white mb-3">How 2FA works:</h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-purple-500/20 mt-0.5">
                                    <Smartphone className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-300">Install an authenticator app</p>
                                    <p className="text-xs text-slate-500">Such as Google Authenticator or Authy</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-amber-500/20 mt-0.5">
                                    <Key className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-300">Scan the QR code</p>
                                    <p className="text-xs text-slate-500">Link your account to the authenticator</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-green-500/20 mt-0.5">
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-300">Enter the 6-digit code</p>
                                    <p className="text-xs text-slate-500">Use it every time you log in</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        disabled
                        className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                    >
                        <Shield className="w-4 h-4 mr-2" />
                        Enable Two-Factor Authentication
                    </Button>
                </div>

                <div className="pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 text-center">
                        This feature will be available once backend functions are enabled
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}