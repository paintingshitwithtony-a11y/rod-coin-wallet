import React, { useEffect, useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const tabs = [
    { value: 'overview', label: 'Home', Icon: Wallet },
    { value: 'send', label: 'Send', Icon: ArrowUpRight },
    { value: 'receive', label: 'Receive', Icon: ArrowDownLeft },
    { value: 'history', label: 'History', Icon: Clock },
    { value: 'messages', label: 'Messages', Icon: MessageCircle }
];

export default function MobileWalletTabs({ activeTab, onTabChange, unreadCount }) {
    const [autoUnreadCount, setAutoUnreadCount] = useState(0);
    const displayUnreadCount = unreadCount ?? autoUnreadCount;

    useEffect(() => {
        let cancelled = false;
        let accountId = null;

        const loadUnreadCount = async () => {
            try {
                if (!accountId) {
                    const user = await base44.auth.me();
                    const accounts = await base44.entities.WalletAccount.filter({ email: user.email });
                    accountId = accounts[0]?.id;
                }
                if (!accountId || cancelled) return;
                const response = await base44.functions.invoke('listWalletMessages', { accountId });
                if (response.data.success && !cancelled) {
                    setAutoUnreadCount((response.data.inbox || []).filter((message) => !message.read_by_recipient).length);
                }
            } catch (_err) {}
        };

        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, 30000);
        window.addEventListener('focus', loadUnreadCount);

        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('focus', loadUnreadCount);
        };
    }, []);

    const Badge = () => displayUnreadCount > 0 ? (
        <span className="absolute -top-2 -right-3 min-w-5 h-5 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white border border-slate-950">
            {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
        </span>
    ) : null;

    return (
        <>
            {displayUnreadCount > 0 && activeTab !== 'messages' && (
                <button
                    type="button"
                    onClick={() => onTabChange('messages')}
                    className="hidden md:flex fixed right-5 bottom-5 z-50 items-center gap-2 rounded-full border border-red-400/50 bg-slate-950/95 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 backdrop-blur-xl"
                >
                    <span className="relative">
                        <MessageCircle className="w-5 h-5 text-cyan-300" />
                        <Badge />
                    </span>
                    Messages
                </button>
            )}

            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-purple-500/30 bg-slate-950/95 backdrop-blur-xl px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <div className="grid grid-cols-5 gap-1">
                    {tabs.map(({ value, label, Icon }) => (
                        <button
                            key={value}
                            type="button"
                            aria-current={activeTab === value ? 'page' : undefined}
                            onClick={() => onTabChange(value)}
                            className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] touch-manipulation select-none ${activeTab === value ? 'text-amber-300 bg-purple-500/20' : 'text-slate-400'}`}
                        >
                            <span className="relative">
                                <Icon className="w-5 h-5" />
                                {value === 'messages' && <Badge />}
                            </span>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}