import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function OrderBook({ onSelectPrice }) {
    const [orders, setOrders] = useState({ buy: [], sell: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            const allOrders = await base44.entities.TradeOrder.filter(
                { status: 'pending' },
                '-created_date',
                50
            );

            const buyOrders = allOrders
                .filter(o => o.order_type === 'buy')
                .sort((a, b) => b.price_usd - a.price_usd)
                .slice(0, 10);

            const sellOrders = allOrders
                .filter(o => o.order_type === 'sell')
                .sort((a, b) => a.price_usd - b.price_usd)
                .slice(0, 10);

            setOrders({ buy: buyOrders, sell: sellOrders });
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-900/80 border-slate-700/50">
            <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    Order Book
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Sell Orders */}
                <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-2 px-2">
                        <span>Price (USD)</span>
                        <span>Amount (ROD)</span>
                    </div>
                    <div className="space-y-1">
                        {orders.sell.map((order, i) => (
                            <div
                                key={order.id}
                                onClick={() => onSelectPrice?.(order.price_usd, 'buy')}
                                className="flex justify-between items-center p-2 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                            >
                                <span className="text-red-400 font-mono text-sm">
                                    ${order.price_usd.toFixed(8)}
                                </span>
                                <span className="text-slate-300 text-sm">
                                    {(order.amount - order.filled_amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Spread */}
                <div className="py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-amber-400">
                            {orders.sell[0] && orders.buy[0] 
                                ? `$${((orders.sell[0].price_usd + orders.buy[0].price_usd) / 2).toFixed(8)}`
                                : '$0.00000000'
                            }
                        </div>
                        <div className="text-xs text-slate-500">
                            Spread: {orders.sell[0] && orders.buy[0]
                                ? `$${(orders.sell[0].price_usd - orders.buy[0].price_usd).toFixed(8)}`
                                : 'N/A'
                            }
                        </div>
                    </div>
                </div>

                {/* Buy Orders */}
                <div>
                    <div className="space-y-1">
                        {orders.buy.map((order, i) => (
                            <div
                                key={order.id}
                                onClick={() => onSelectPrice?.(order.price_usd, 'sell')}
                                className="flex justify-between items-center p-2 rounded hover:bg-green-500/10 cursor-pointer transition-colors"
                            >
                                <span className="text-green-400 font-mono text-sm">
                                    ${order.price_usd.toFixed(8)}
                                </span>
                                <span className="text-slate-300 text-sm">
                                    {(order.amount - order.filled_amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}