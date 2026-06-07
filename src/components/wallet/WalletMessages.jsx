import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Send, Inbox, Reply, Clock, CheckCircle2, Circle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const shortAddress = (address) => address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '';

export default function WalletMessages({ account, addresses = [], currentWallet }) {
    const [recipientAddress, setRecipientAddress] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [fromAddress, setFromAddress] = useState(currentWallet?.wallet_address || account.wallet_address);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState({ inbox: [], sent: [] });
    const [selectedInboxMessage, setSelectedInboxMessage] = useState(null);

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

    const recipientOptions = useMemo(() => {
        const byAddress = new Map();
        contacts.forEach((contact) => {
            if (contact.address && !byAddress.has(contact.address)) {
                byAddress.set(contact.address, {
                    address: contact.address,
                    label: contact.label || 'Contact'
                });
            }
        });
        if (recipientAddress && !byAddress.has(recipientAddress)) {
            byAddress.set(recipientAddress, { address: recipientAddress, label: 'Reply Recipient' });
        }
        return Array.from(byAddress.values());
    }, [contacts, recipientAddress]);

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
        base44.entities.AddressBook.filter({ account_id: account.id }).then(setContacts);
    }, [account.id]);

    const sendMessage = async (event) => {
        if (event) event.preventDefault();
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
                setSelectedInboxMessage(null);
                await loadMessages();
            } else {
                toast.error(response.data.error || 'Failed to send message');
            }
        } finally {
            setSending(false);
        }
    };

    const unreadCount = messages.inbox.filter((message) => !message.read_by_recipient).length;

    const selectInboxMessage = async (message) => {
        setSelectedInboxMessage(message);
        if (!message.read_by_recipient) {
            setMessages((current) => ({
                ...current,
                inbox: current.inbox.map((item) => item.id === message.id ? { ...item, read_by_recipient: true } : item)
            }));
            await base44.functions.invoke('markWalletMessageRead', {
                accountId: account.id,
                messageId: message.id
            });
        }
    };

    const startReply = (message) => {
        setRecipientAddress(message.sender_wallet_address);
        setFromAddress(message.recipient_wallet_address);
        setSubject(message.subject?.startsWith('Re:') ? message.subject : `Re: ${message.subject || 'Wallet message'}`);
        setBody(`\n\n--- Original message ---\n${message.body}`);
        toast.info('Reply ready on the left');
    };

    const MessageList = ({ items, type }) => (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {items.length === 0 ? (
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center text-slate-400">
                    No {type} messages yet.
                </div>
            ) : items.map((message) => {
                const isInbox = type === 'inbox';
                const isUnread = isInbox && !message.read_by_recipient;
                const isSelected = selectedInboxMessage?.id === message.id;
                return (
                    <button
                        key={message.id}
                        type="button"
                        onClick={() => isInbox ? selectInboxMessage(message) : setSelectedInboxMessage(null)}
                        className={`w-full text-left rounded-xl border p-3 transition-colors ${isSelected ? 'border-purple-400 bg-purple-500/10' : 'border-slate-700/50 bg-slate-800/50 hover:bg-slate-800'} ${isUnread ? 'ring-1 ring-cyan-400/40' : ''}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    {isUnread ? <Circle className="w-2.5 h-2.5 fill-cyan-400 text-cyan-400 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                                    <p className={`font-medium truncate ${isUnread ? 'text-white' : 'text-slate-300'}`}>{message.subject || 'No subject'}</p>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    {isInbox ? 'From' : 'To'} {shortAddress(isInbox ? message.sender_wallet_address : message.recipient_wallet_address)}
                                </p>
                                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{message.body}</p>
                            </div>
                            <Badge variant="outline" className="border-purple-500/50 text-purple-300 shrink-0">
                                {new Date(message.created_date).toLocaleDateString()}
                            </Badge>
                        </div>
                    </button>
                );
            })}
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
                            {recipientOptions.length > 0 ? (
                                <select
                                    value={recipientAddress}
                                    onChange={(e) => setRecipientAddress(e.target.value)}
                                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                                >
                                    <option value="">Select a contact</option>
                                    {recipientOptions.map((option) => (
                                        <option key={option.address} value={option.address}>{option.label} — {shortAddress(option.address)}</option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    value={recipientAddress}
                                    onChange={(e) => setRecipientAddress(e.target.value)}
                                    placeholder="Paste ROD wallet address"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            )}
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
                        <TabsList className="bg-slate-800/70 mb-4 flex flex-wrap h-auto">
                            <TabsTrigger value="inbox" className="data-[state=active]:bg-purple-600">
                                <Inbox className="w-4 h-4 mr-2" /> Inbox ({messages.inbox.length})
                            </TabsTrigger>
                            <TabsTrigger value="sent" className="data-[state=active]:bg-purple-600">
                                <Send className="w-4 h-4 mr-2" /> Sent ({messages.sent.length})
                            </TabsTrigger>
                            {unreadCount > 0 && (
                                <Badge className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                                    {unreadCount} unread
                                </Badge>
                            )}
                        </TabsList>
                        <TabsContent value="inbox">
                            <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
                                <MessageList items={messages.inbox} type="inbox" />
                                <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 min-h-[260px]">
                                    {selectedInboxMessage ? (
                                        <div className="space-y-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-semibold text-white break-words">{selectedInboxMessage.subject || 'No subject'}</h3>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        From {selectedInboxMessage.sender_label || 'Wallet'} · {shortAddress(selectedInboxMessage.sender_wallet_address)}
                                                    </p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                        <Clock className="w-3 h-3" /> {new Date(selectedInboxMessage.created_date).toLocaleString()}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => startReply(selectedInboxMessage)}
                                                    className="bg-cyan-600 hover:bg-cyan-700 shrink-0"
                                                >
                                                    <Reply className="w-4 h-4 mr-2" /> Reply
                                                </Button>
                                            </div>
                                            <div className="rounded-lg bg-slate-950/40 border border-slate-700/50 p-4 text-sm text-slate-200 whitespace-pre-wrap">
                                                {selectedInboxMessage.body}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center text-slate-400">
                                            <Inbox className="w-10 h-10 mb-3 text-slate-600" />
                                            <p className="font-medium text-slate-300">Select a message</p>
                                            <p className="text-xs mt-1">Open an inbox message to mark it read and reply.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
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