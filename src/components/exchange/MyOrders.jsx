import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    FileText, TrendingUp, TrendingDown, X, Loader2,
    Clock, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function MyOrders({ account, onOrderCancelled }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState({});

    useEffect(() => {
        loadMyOrders();
        const interval = setInterval(loadMyOrders, 15000);
        return () => clearInterval(interval);
    }, [account]);

    const loadMyOrders = async () => {
        try {
            const allOrders = await base44.entities.TradeOrder.filter(
                { account_id: account.id },
                '-created_date',
                50
            );
            setOrders(allOrders);
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const cancelOrder = async (order) => {
        setCancelling(prev => ({ ...prev, [order.id]: true }));
        try {
            await base44.entities.TradeOrder.update(order.id, {
                status: 'cancelled'
            });
            toast.success('Order cancelled');
            await loadMyOrders();
            if (onOrderCancelled) {
                onOrderCancelled();
            }
        } catch (err) {
            toast.error('Failed to cancel order');
        } finally {
            setCancelling(prev => ({ ...prev, [order.id]: false }));
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock },
            partial: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Clock },
            completed: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle2 },
            cancelled: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', icon: X }
        };
        const { color, icon: Icon } = config[status] || config.pending;
        return (
            <Badge className={color}>
                <Icon className="w-3 h-3 mr-1" />
                {status}
            </Badge>
        );
    };

    const activeOrders = orders.filter(o => ['pending', 'partial'].includes(o.status));
    const historyOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status));

    return (
        <Card className="bg-slate-900/80 border-slate-700/50">
            <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    My Orders
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="active">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                        <TabsTrigger value="active">
                            Active ({activeOrders.length})
                        </TabsTrigger>
                        <TabsTrigger value="history">
                            History ({historyOrders.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-4 space-y-2">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                            </div>
                        ) : activeOrders.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No active orders
                            </div>
                        ) : (
                            activeOrders.map((order) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {order.order_type === 'buy' ? (
                                                <TrendingUp className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-400" />
                                            )}
                                            <span className={`font-semibold ${
                                                order.order_type === 'buy' ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {order.order_type.toUpperCase()}
                                            </span>
                                            {getStatusBadge(order.status)}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => cancelOrder(order)}
                                            disabled={cancelling[order.id]}
                                            className="text-red-400 hover:text-red-300 h-7 px-2"
                                        >
                                            {cancelling[order.id] ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <X className="w-3 h-3" />
                                            )}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-500">Amount:</span>
                                            <span className="text-white ml-1 font-mono">
                                                {order.amount.toLocaleString()} ROD
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Price:</span>
                                            <span className="text-white ml-1 font-mono">
                                                ${order.price_usd.toFixed(8)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Filled:</span>
                                            <span className="text-amber-400 ml-1">
                                                {((order.filled_amount / order.amount) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Total:</span>
                                            <span className="text-white ml-1 font-mono">
                                                ${order.total_usd.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">
                                        {new Date(order.created_date).toLocaleString()}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-4 space-y-2">
                        {historyOrders.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No order history
                            </div>
                        ) : (
                            historyOrders.map((order) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-lg bg-slate-800/30 border border-slate-700"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {order.order_type === 'buy' ? (
                                                <TrendingUp className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-400" />
                                            )}
                                            <span className={`font-semibold ${
                                                order.order_type === 'buy' ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {order.order_type.toUpperCase()}
                                            </span>
                                            {getStatusBadge(order.status)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-500">Amount:</span>
                                            <span className="text-white ml-1 font-mono">
                                                {order.amount.toLocaleString()} ROD
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Price:</span>
                                            <span className="text-white ml-1 font-mono">
                                                ${order.price_usd.toFixed(8)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Total:</span>
                                            <span className="text-white ml-1 font-mono">
                                                ${order.total_usd.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">
                                        {new Date(order.created_date).toLocaleString()}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}