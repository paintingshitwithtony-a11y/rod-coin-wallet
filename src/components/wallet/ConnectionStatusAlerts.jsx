import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ConnectionStatusAlerts({ rpcConnected, isReconnecting, reconnectAttempts, rpcError, rpcNodeInfo, onRetry, onDismiss }) {
    if (rpcConnected === false && !isReconnecting) {
        return (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="fixed top-20 md:top-4 right-2 md:right-4 z-50 max-w-md">
                <Alert className="bg-red-500/10 border-red-500/30 backdrop-blur-xl">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-300/90">
                        <div className="flex items-center justify-between">
                            <div>
                                <strong>RPC Offline</strong>
                                {rpcError && <p className="text-xs mt-1 text-red-400/80">{rpcError}</p>}
                            </div>
                            <Button size="sm" variant="ghost" onClick={onRetry} className="text-red-300 hover:text-white ml-4">
                                <RefreshCw className="w-4 h-4 mr-1" /> Retry
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </motion.div>
        );
    }

    if (isReconnecting) {
        return (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="fixed top-20 md:top-4 right-2 md:right-4 z-50 max-w-md">
                <Alert className="bg-yellow-500/10 border-yellow-500/30 backdrop-blur-xl">
                    <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />
                    <AlertDescription className="text-yellow-300/90">
                        <strong>Reconnecting to RPC...</strong>
                        <p className="text-xs mt-1">Attempt {reconnectAttempts} of 3</p>
                    </AlertDescription>
                </Alert>
            </motion.div>
        );
    }

    if (rpcConnected && rpcNodeInfo) {
        return (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 md:top-4 right-2 md:right-4 z-50 max-w-sm">
                <Card className="bg-green-500/10 border-green-500/30 backdrop-blur-xl">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-green-300">RPC Connected</p>
                                <p className="text-xs text-green-400/80">Block {rpcNodeInfo.blocks?.toLocaleString()} • {rpcNodeInfo.chain}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={onDismiss} className="text-green-400 hover:text-white">×</Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    return null;
}