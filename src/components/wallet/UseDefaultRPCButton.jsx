import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function UseDefaultRPCButton({ account, onSuccess }) {
    const [loading, setLoading] = useState(false);

    const handleUseDefault = async () => {
        setLoading(true);
        try {
            // Get all RPC configs for this account
            const userConfigs = await base44.entities.RPCConfiguration.filter({
                account_id: account.id
            });

            // Look for a "(Default)" config first
            let defaultConfig = userConfigs.find(c => c.name && c.name.includes('(Default)'));

            if (!defaultConfig && userConfigs.length > 0) {
                // Use only this account's saved configurations; never fall back to shared admin secrets.
                defaultConfig = userConfigs[0];
            }

            if (defaultConfig) {
                // Deactivate all others
                await Promise.all(
                    userConfigs
                        .filter(c => c.is_active && c.id !== defaultConfig.id)
                        .map(c => base44.entities.RPCConfiguration.update(c.id, { is_active: false }))
                );
                await base44.entities.RPCConfiguration.update(defaultConfig.id, { is_active: true });
                toast.success(`Switched to: ${defaultConfig.name}`);
                if (onSuccess) onSuccess();
            } else {
                toast.error('No RPC configurations available. Please add one manually.');
            }
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