import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

const tabs = [
    { value: 'overview', label: 'Home', Icon: Wallet },
    { value: 'send', label: 'Send', Icon: ArrowUpRight },
    { value: 'receive', label: 'Receive', Icon: ArrowDownLeft },
    { value: 'history', label: 'History', Icon: Clock }
];

export default function MobileWalletTabs({ activeTab, onTabChange }) {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-purple-500/30 bg-slate-950/95 backdrop-blur-xl px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-4 gap-1">
                {tabs.map(({ value, label, Icon }) => (
                    <button
                        key={value}
                        onClick={() => onTabChange(value)}
                        className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs ${activeTab === value ? 'text-amber-300 bg-purple-500/20' : 'text-slate-400'}`}
                    >
                        <Icon className="w-5 h-5" />
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}