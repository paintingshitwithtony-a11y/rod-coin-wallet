import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    TrendingUp, TrendingDown, Loader2, DollarSign, 
    Coins, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TradingInterface({ account, balance, selectedPrice, selectedType, onOrderPlaced }) {
    const [activeTab, setActiveTab] = useState('buy');
    const [buyAmount, setBuyAmount] = useState('');
    const [buyPrice, setBuyPrice] = useState('');
    const [sellAmount, setSellAmount] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [placing, setPlacing] = useState(false);
    const [marketPrice, setMarketPrice] = useState(0.00049952);

    useEffect(() => {
        if (selectedPrice && selectedType) {
            setActiveTab(selectedType);
            if (selectedType === 'buy') {
                setBuyPrice(selectedPrice.toFixed(8));
            } else {
                setSellPrice(selectedPrice.toFixed(8));
            }
        }
    }, [selectedPrice, selectedType]);

    const calculateTotal = (amount, price) => {
        const amt = parseFloat(amount) || 0;
        const prc = parseFloat(price) || 0;
        return (amt * prc).toFixed(2);
    };

    const handlePlaceOrder = async (type) => {
        const amount = type === 'buy' ? buyAmount : sellAmount;
        const price = type === 'buy' ? buyPrice : sellPrice;

        if (!amount || !price) {
            toast.error('Enter amount and price');
            return;
        }

        const amountNum = parseFloat(amount);
        const priceNum = parseFloat(price);

        if (amountNum <= 0 || priceNum <= 0) {
            toast.error('Invalid amount or price');
            return;
        }

        if (type === 'sell' && amountNum > balance) {
            toast.error('Insufficient balance');
            return;
        }

        setPlacing(true);
        try {
            await base44.entities.TradeOrder.create({
                account_id: account.id,
                order_type: type,
                amount: amountNum,
                price_usd: priceNum,
                total_usd: amountNum * priceNum,
                status: 'pending',
                filled_amount: 0,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });

            toast.success(`${type === 'buy' ? 'Buy' : 'Sell'} order placed!`);
            
            if (type === 'buy') {
                setBuyAmount('');
                setBuyPrice('');
            } else {
                setSellAmount('');
                setSellPrice('');
            }

            if (onOrderPlaced) {
                onOrderPlaced();
            }
        } catch (err) {
            toast.error('Failed to place order');
        } finally {
            setPlacing(false);
        }
    };

    return (
        <Card className="bg-slate-900/80 border-slate-700/50">
            <CardHeader>
                <CardTitle className="text-white text-lg">Trade ROD</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                        <TabsTrigger 
                            value="buy" 
                            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Buy
                        </TabsTrigger>
                        <TabsTrigger 
                            value="sell"
                            className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                        >
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Sell
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="buy" className="space-y-4 mt-4">
                        <Alert className="bg-green-500/10 border-green-500/30">
                            <DollarSign className="h-4 w-4 text-green-400" />
                            <AlertDescription className="text-green-300/80 text-sm">
                                Market Price: ${marketPrice.toFixed(8)} USD
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Amount (ROD)</Label>
                            <Input
                                type="number"
                                value={buyAmount}
                                onChange={(e) => setBuyAmount(e.target.value)}
                                placeholder="0.0000"
                                className="bg-slate-800/50 border-slate-700 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Price per ROD (USD)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={buyPrice}
                                    onChange={(e) => setBuyPrice(e.target.value)}
                                    placeholder="0.00000000"
                                    className="bg-slate-800/50 border-slate-700 text-white flex-1"
                                />
                                <Button
                                    onClick={() => setBuyPrice(marketPrice.toFixed(8))}
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600"
                                >
                                    Market
                                </Button>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Total</span>
                                <span className="text-white font-semibold">
                                    ${calculateTotal(buyAmount, buyPrice)} USD
                                </span>
                            </div>
                        </div>

                        <Button
                            onClick={() => handlePlaceOrder('buy')}
                            disabled={placing}
                            className="w-full bg-green-600 hover:bg-green-700 h-12"
                        >
                            {placing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Placing Order...
                                </>
                            ) : (
                                <>
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Place Buy Order
                                </>
                            )}
                        </Button>
                    </TabsContent>

                    <TabsContent value="sell" className="space-y-4 mt-4">
                        <Alert className="bg-red-500/10 border-red-500/30">
                            <Coins className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-300/80 text-sm">
                                Available: {balance.toLocaleString()} ROD
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Amount (ROD)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={sellAmount}
                                    onChange={(e) => setSellAmount(e.target.value)}
                                    placeholder="0.0000"
                                    className="bg-slate-800/50 border-slate-700 text-white flex-1"
                                />
                                <Button
                                    onClick={() => setSellAmount(balance.toString())}
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600"
                                >
                                    MAX
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Price per ROD (USD)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={sellPrice}
                                    onChange={(e) => setSellPrice(e.target.value)}
                                    placeholder="0.00000000"
                                    className="bg-slate-800/50 border-slate-700 text-white flex-1"
                                />
                                <Button
                                    onClick={() => setSellPrice(marketPrice.toFixed(8))}
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600"
                                >
                                    Market
                                </Button>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Total</span>
                                <span className="text-white font-semibold">
                                    ${calculateTotal(sellAmount, sellPrice)} USD
                                </span>
                            </div>
                        </div>

                        <Button
                            onClick={() => handlePlaceOrder('sell')}
                            disabled={placing}
                            className="w-full bg-red-600 hover:bg-red-700 h-12"
                        >
                            {placing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Placing Order...
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="w-4 h-4 mr-2" />
                                    Place Sell Order
                                </>
                            )}
                        </Button>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}