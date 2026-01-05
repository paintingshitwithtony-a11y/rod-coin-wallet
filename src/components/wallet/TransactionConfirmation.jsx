import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TransactionConfirmation({ 
    recipient, 
    amount, 
    fee, 
    memo, 
    onConfirm, 
    onCancel,
    loading 
}) {
    const total = parseFloat(amount) + parseFloat(fee);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <Card className="bg-slate-900 border-purple-500/30 max-w-md w-full">
                <CardHeader>
                    <CardTitle className="text-white text-xl">Confirm Transaction</CardTitle>
                    <CardDescription className="text-slate-400">
                        Please review the details before sending
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-amber-300/80 text-sm">
                            This transaction cannot be reversed. Please verify all details.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex justify-between items-start">
                            <span className="text-slate-400 text-sm">Recipient</span>
                            <span className="text-white text-sm font-mono text-right max-w-[60%] break-all">
                                {recipient}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">Amount</span>
                            <span className="text-white font-semibold">{amount} ROD</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">Transaction Fee</span>
                            <span className="text-white">{fee} ROD</span>
                        </div>

                        {memo && (
                            <div className="flex justify-between items-start pt-2 border-t border-slate-700">
                                <span className="text-slate-400 text-sm">Memo</span>
                                <span className="text-white text-sm text-right max-w-[60%]">
                                    {memo}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between pt-3 border-t border-slate-600">
                            <span className="text-slate-300 font-semibold">Total</span>
                            <span className="text-amber-400 font-bold text-lg">
                                {total.toFixed(8)} ROD
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={onCancel}
                            variant="outline"
                            className="flex-1 border-slate-700 text-slate-300 hover:text-white"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Confirm & Send
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}