import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Send, Inbox, Clock, MessageCircle, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const normalizeAddress = (address) => (address || '').trim().toLowerCase();
const shortAddress = (address) => address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '';

export default function WalletMessages({ account, addresses = [], currentWallet, onUnreadCountChange }) {
    const [recipientAddress, setRecipientAddress] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [fromAddress, setFromAddress] = useState(currentWallet?.wallet_address || account.wallet_address);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState({ inbox: [], sent: [] });
    const [selectedConversationKey, setSelectedConversationKey] = useState(null);
    const threadEndRef = useRef(null);

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
                byAddress.set(contact.address, { address: contact.address, label: contact.label || 'Contact' });
            }
        });
        if (recipientAddress && !byAddress.has(recipientAddress)) {
            byAddress.set(recipientAddress, { address: recipientAddress, label: 'Current recipient' });
        }
        return Array.from(byAddress.values());
    }, [contacts, recipientAddress]);

    const allThreadMessages = useMemo(() => {
        const inbox = messages.inbox.map((message) => ({ ...message, direction: 'incoming' }));
        const sent = messages.sent.map((message) => ({ ...message, direction: 'outgoing', read_by_recipient: true }));
        return [...inbox, ...sent].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    }, [messages]);

    const conversations = useMemo(() => {
        const byKey = new Map();
        allThreadMessages.forEach((message) => {
            const incoming = message.direction === 'incoming';
            const partnerAccountId = incoming ? message.sender_account_id : message.recipient_account_id;
            const partnerAddress = incoming ? message.sender_wallet_address : message.recipient_wallet_address;
            const partnerLabel = incoming ? message.sender_label : message.recipient_label;
            const key = `${partnerAccountId}:${normalizeAddress(partnerAddress)}`;
            const current = byKey.get(key) || {
                key,
                partnerAccountId,
                partnerAddress,
                partnerLabel: partnerLabel || 'Wallet',
                messages: [],
                unreadCount: 0,
                latest: null
            };
            current.messages.push(message);
            if (incoming && !message.read_by_recipient) current.unreadCount += 1;
            current.latest = message;
            if (!current.subject && message.subject) current.subject = message.subject;
            byKey.set(key, current);
        });
        return Array.from(byKey.values()).sort((a, b) => new Date(b.latest?.created_date || 0) - new Date(a.latest?.created_date || 0));
    }, [allThreadMessages]);

    const selectedConversation = conversations.find((conversation) => conversation.key === selectedConversationKey) || null;
    const unreadCount = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);

    useEffect(() => {
        onUnreadCountChange?.(unreadCount);
    }, [unreadCount, onUnreadCountChange]);

    useEffect(() => {
        loadMessages();
        base44.entities.AddressBook.filter({ account_id: account.id }).then(setContacts);
    }, [account.id]);

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedConversationKey, selectedConversation?.messages.length]);

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

    const selectConversation = async (conversation) => {
        setSelectedConversationKey(conversation.key);
        setRecipientAddress(conversation.partnerAddress);
        setSubject(conversation.subject || '');
        const latestIncoming = [...conversation.messages].reverse().find((message) => message.direction === 'incoming');
        setFromAddress(latestIncoming?.recipient_wallet_address || currentWallet?.wallet_address || account.wallet_address);

        const unreadMessages = conversation.messages.filter((message) => message.direction === 'incoming' && !message.read_by_recipient);
        if (unreadMessages.length === 0) return;

        setMessages((current) => ({
            ...current,
            inbox: current.inbox.map((item) => unreadMessages.some((message) => message.id === item.id) ? { ...item, read_by_recipient: true } : item)
        }));
        await Promise.all(unreadMessages.map((message) => base44.functions.invoke('markWalletMessageRead', {
            accountId: account.id,
            messageId: message.id
        })));
    };

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
                const sentMessage = response.data.message;
                setSelectedConversationKey(`${sentMessage.recipient_account_id}:${normalizeAddress(sentMessage.recipient_wallet_address)}`);
                setBody('');
                await loadMessages();
            } else {
                toast.error(response.data.error || 'Failed to send message');
            }
        } finally {
            setSending(false);
        }
    };

    const startNewMessage = () => {
        setSelectedConversationKey(null);
        setRecipientAddress('');
        setSubject('');
        setBody('');
        setFromAddress(currentWallet?.wallet_address || account.wallet_address);
    };

    const deleteConversation = async () => {
        if (!selectedConversation) return;
        if (!confirm('Delete this conversation from your messages?')) return;

        setLoading(true);
        try {
            const response = await base44.functions.invoke('deleteWalletConversation', {
                accountId: account.id,
                partnerAccountId: selectedConversation.partnerAccountId,
                partnerAddress: selectedConversation.partnerAddress
            });
            if (response.data.success) {
                toast.success('Conversation deleted');
                setSelectedConversationKey(null);
                await loadMessages();
            } else {
                toast.error(response.data.error || 'Failed to delete conversation');
            }
        } finally {
            setLoading(false);
        }
    };

    const ConversationList = () => (
        <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {conversations.length === 0 ? (
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center text-slate-400">
                    No conversations yet.
                </div>
            ) : conversations.map((conversation) => {
                const isSelected = selectedConversationKey === conversation.key;
                return (
                    <button
                        key={conversation.key}
                        type="button"
                        onClick={() => selectConversation(conversation)}
                        className={`w-full text-left rounded-2xl border p-3 transition-colors ${isSelected ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700/50 bg-slate-800/50 hover:bg-slate-800'}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-white truncate">{conversation.partnerLabel}</p>
                                    {conversation.unreadCount > 0 && (
                                        <Badge className="bg-red-500 text-white border-red-400 rounded-full h-5 min-w-5 px-1.5 text-[11px]">
                                            {conversation.unreadCount}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{shortAddress(conversation.partnerAddress)}</p>
                                <p className={`text-xs mt-2 line-clamp-2 ${conversation.unreadCount > 0 ? 'text-cyan-200 font-medium' : 'text-slate-500'}`}>
                                    {conversation.latest?.direction === 'outgoing' ? 'You: ' : ''}{conversation.latest?.body}
                                </p>
                            </div>
                            <span className="text-[11px] text-slate-500 shrink-0">
                                {new Date(conversation.latest?.created_date).toLocaleDateString()}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <Card className="bg-slate-900/80 border-slate-700/50">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Inbox className="w-5 h-5 text-cyan-400" />
                        Messages
                        {unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white border-red-400 rounded-full h-6 min-w-6 px-2">
                                {unreadCount}
                            </Badge>
                        )}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadMessages} disabled={loading} className="text-slate-300">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={startNewMessage} className="w-full bg-amber-600 hover:bg-amber-700">
                        <Send className="w-4 h-4 mr-2" /> New Message
                    </Button>
                    <ConversationList />
                </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-700/50 min-h-[640px]">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-white flex items-center gap-2 min-w-0">
                        <MessageCircle className="w-5 h-5 text-purple-400 shrink-0" />
                        <span className="truncate">{selectedConversation ? selectedConversation.partnerLabel : 'New Wallet Message'}</span>
                    </CardTitle>
                    {selectedConversation && (
                        <Button variant="ghost" size="sm" onClick={deleteConversation} className="text-red-300 hover:text-red-200">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {selectedConversation ? (
                        <div className="rounded-3xl border border-slate-700/50 bg-slate-950/40 p-3 md:p-4 h-[430px] overflow-y-auto space-y-3">
                            {selectedConversation.messages.map((message) => {
                                const outgoing = message.direction === 'outgoing';
                                return (
                                    <div key={`${message.direction}-${message.id}`} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[82%] rounded-3xl px-4 py-2.5 ${outgoing ? 'bg-purple-600 text-white rounded-br-md' : 'bg-slate-800 text-slate-100 rounded-bl-md'}`}>
                                            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                                            <p className={`text-[10px] mt-1 ${outgoing ? 'text-purple-100/80' : 'text-slate-500'}`}>
                                                {new Date(message.created_date).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={threadEndRef} />
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-slate-700/50 bg-slate-950/40 p-8 min-h-[260px] flex flex-col items-center justify-center text-center text-slate-400">
                            <Mail className="w-12 h-12 mb-3 text-slate-600" />
                            <p className="font-medium text-slate-300">Select a conversation or start a new message</p>
                            <p className="text-xs mt-1">Messages stay in the thread until you delete the conversation.</p>
                        </div>
                    )}

                    <form onSubmit={sendMessage} className="space-y-4 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
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
                                <Label className="text-slate-300">To</Label>
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
                        <div className="flex gap-2 items-end">
                            <Textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Type a message..."
                                className="min-h-20 bg-slate-800 border-slate-700 text-white rounded-2xl"
                            />
                            <Button type="submit" disabled={sending} className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 shrink-0" title="Send message">
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}