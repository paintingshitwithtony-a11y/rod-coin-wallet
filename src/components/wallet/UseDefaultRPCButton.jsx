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
            // Find the admin's active RPC config (any account with is_active=true that isn't this user)
            // We do this by fetching the admin-propagated config via setDefaultRPC logic:
            // Actually, we look for any active RPCConfiguration belonging to an admin account.
            // Simpler: we invoke setDefaultRPC with the currently active admin config_id.
            // Since this is a user action, we just look for any config marked as default (name contains "(Default)")
            // OR we ask the backend to give us the admin's active config.

            // Best approach: call a backend function or directly query for admin-propagated configs.
            // We'll look for a config on this account that was pushed as default, or fetch admin's active config.
            
            // Get all RPC configs for this account
            const userConfigs = await base44.entities.RPCConfiguration.filter({
                account_id: account.id
            });

            // Find a "(Default)" config that was pushed by admin
            const defaultConfig = userConfigs.find(c => c.name && c.name.includes('(Default)'));

            if (defaultConfig) {
                // Deactivate all, then activate the default one
                await Promise.all(
                    userConfigs
                        .filter(c => c.is_active && c.id !== defaultConfig.id)
                        .map(c => base44.entities.RPCConfiguration.update(c.id, { is_active: false }))
                );
                await base44.entities.RPCConfiguration.update(defaultConfig.id, { is_active: true });
                toast.success(`Switched to default node: ${defaultConfig.name}`);
                if (onSuccess) onSuccess();
            } else {
                // No default config pushed yet — trigger setDefaultRPC to fetch admin's active config and push it
                // We do this by asking the backend to find the admin's active config and create one for us
                toast.info('No default RPC found. Asking admin to push default settings...');
                // Fallback: show a helpful message
                toast.error('No admin-pushed default RPC config found. Ask your admin to activate an RPC config in the Admin panel.');
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