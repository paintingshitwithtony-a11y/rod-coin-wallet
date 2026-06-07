import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Send, Inbox } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const shortAddress = (address) => address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '';

export default function WalletMessages({ account, addresses = [], currentWallet }) {
    const [recipientAddress, setRecipientAddress] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [fromAddress, setFromAddress] = useState(currentWallet?.wallet_address || account.wallet_address);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState({ inbox: [], sent: [] });

    const senderOptions = useMemo(() => {
        const byAddress = new Map();
        [{ address: account.wallet_address, label: 'Primary Address' }, ...addresses].forEach((item) => {
            const address = item.address || item.wallet_address;
            if (address && !byAddress.has(address)) {
                byAddress.set(address, { address, label: item.label || item.name || 'Wallet Address' });
            }
        });
        return Array.from(byAddress.values());
    }, [account, addresses]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('listWalletMessages', { accountId: account.id });
            if (response.data.success) {
                setMessages({ inbox: response.data.inbox || [], sent: response.data.sent || [] });
            } else {
                toast.error(response.data.error || 'Failed to load messages');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMessages();
    }, [account.id]);

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!recipientAddress.trim() || !body.trim()) {
            toast.error('Enter a wallet address and message');
            return;
        }

        setSending(true);
        try {
            const response = await base44.functions.invoke('sendWalletMessage', {
                accountId: account.id,
                fromAddress,
                recipientAddress,
                subject,
                body
            });

            if (response.data.success) {
                toast.success('Message sent');
                setRecipientAddress('');
                setSubject('');
                setBody('');
                await loadMessages();
            } else {
                toast.error(response.data.error || 'Failed to send message');
            }
        } finally {
            setSending(false);
        }
    };

    const MessageList = ({ items, type }) => (
        <div className="space-y-3 max-h-[460px] overflow-y-auto">
            {items.length === 0 ? (
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center text-slate-400">
                    No {type} messages yet.
                </div>
            ) : items.map((message) => (
                <div key={message.id} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-medium text-white truncate">{message.subject || 'No subject'}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {type === 'inbox' ? 'From' : 'To'} {shortAddress(type === 'inbox' ? message.sender_wallet_address : message.recipient_wallet_address)}
                            </p>
                        </div>
                        <Badge variant="outline" className="border-purple-500/50 text-purple-300 shrink-0">
                            {new Date(message.created_date).toLocaleDateString()}
                        </Badge>
                    </div>
                    <p className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">{message.body}</p>
                </div>
            ))}
        </div>
    );

    return (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <Card className="bg-slate-900/80 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Send className="w-5 h-5 text-amber-400" />
                        New Wallet Message
                    </CardTitle>
                    <p className="text-xs text-slate-400">Send a private app message to the registered owner of a wallet address.</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={sendMessage} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">From</Label>
                            <select
                                value={fromAddress}
                                onChange={(e) => setFromAddress(e.target.value)}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                            >
                                {senderOptions.map((option) => (
                                    <option key={option.address} value={option.address}>{option.label} — {shortAddress(option.address)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Recipient Wallet Address</Label>
                            <Input
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                placeholder="Paste ROD wallet address"
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Subject</Label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Optional subject"
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Message</Label>
                            <Textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Write your message..."
                                className="min-h-32 bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                        <Button type="submit" disabled={sending} className="w-full bg-amber-600 hover:bg-amber-700">
                            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Send Message
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-700/50">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-cyan-400" />
                        Messages
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadMessages} disabled={loading} className="text-slate-300">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                    </Button>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="inbox">
                        <TabsList className="bg-slate-800/70 mb-4">
                            <TabsTrigger value="inbox" className="data-[state=active]:bg-purple-600">
                                <Inbox className="w-4 h-4 mr-2" /> Inbox ({messages.inbox.length})
                            </TabsTrigger>
                            <TabsTrigger value="sent" className="data-[state=active]:bg-purple-600">
                                <Send className="w-4 h-4 mr-2" /> Sent ({messages.sent.length})
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="inbox">
                            <MessageList items={messages.inbox} type="inbox" />
                        </TabsContent>
                        <TabsContent value="sent">
                            <MessageList items={messages.sent} type="sent" />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}