import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function UseDefaultRPCButton({ account, onSuccess }) {
    const [loading, setLoading] = useState(false);

    const getWalletSessionPayload = () => {
        const savedSession = localStorage.getItem('rod_wallet_session');
        if (!savedSession) return {};
        try {
            const session = JSON.parse(savedSession);
            return {
                account_id: session.id,
                session_token: session.sessionToken
            };
        } catch (_error) {
            return {};
        }
    };

    const handleUseDefault = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('manageRPCConfig', { action: 'useDefault', ...getWalletSessionPayload() });
            toast.success(`Switched to: ${response.data.config.name}`);
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error('Failed to apply default RPC: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleUseDefault}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <Star className="w-4 h-4 mr-2" />
            )}
            Use Default
        </Button>
    );
}