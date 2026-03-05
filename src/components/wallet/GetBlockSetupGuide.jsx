import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Server, Plug, Plus, Copy, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function GetBlockSetupGuide({ account, configs, onConfigsChanged }) {
    const [saving, setSaving] = useState(false);

    const addConfig = async (name, host, port, apiKey = '', use_ssl = true) => {
        setSaving(true);
        try {
            const newConfig = await base44.entities.RPCConfiguration.create({
                account_id: account.id,
                name,
                connection_type: 'api',
                host,
                port: port || '',
                username: '',
                password: '',
                api_key: apiKey,
                curl_command: '',
                use_ssl,
                is_active: configs.length === 0,
                connection_status: 'untested'
            });
            if (configs.length === 0) {
                await base44.entities.WalletAccount.update(account.id, {
                    rpc_host: host,
                    rpc_port: port || '',
                    rpc_username: '',
                    rpc_password: ''
                });
            }
            toast.success(`${name} added`);
            if (onConfigsChanged) onConfigsChanged(newConfig);
        } catch (err) {
            toast.error('Failed to add configuration');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 space-y-4">
            <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-green-400" />
                <h4 className="text-white font-medium">GetBlock.io - SSH Tunnel Setup</h4>
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/30">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300/80 text-sm">
                    Set up a local tunnel to connect your ROD Core wallet to GetBlock.io via localhost
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="direct" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                    <TabsTrigger value="direct">Direct Connection</TabsTrigger>
                    <TabsTrigger value="tunnel">SSH Tunnel</TabsTrigger>
                </TabsList>

                <TabsContent value="direct" className="space-y-3 mt-3">
                    <p className="text-sm text-slate-300 mb-3">Quick-connect to popular gateways:</p>
                    <div className="space-y-2">
                        {[
                            { name: 'Tatum Bitcoin Mainnet', host: 'bitcoin-mainnet.gateway.tatum.io', color: 'from-blue-600 to-purple-600' },
                            { name: 'Tatum Powerful Gateway', host: 'my-powerful-gateway-7576da75.gateway.tatum.io', color: 'from-purple-600 to-pink-600' },
                            { name: 'GetBlock.io ROD', host: 'go.getblock.io/538cb5800e2747ab8afb8a782857bc63', color: 'from-green-600 to-blue-600' },
                        ].map(({ name, host, color }) => (
                            <Button
                                key={name}
                                onClick={() => addConfig(name, host, '', '', true)}
                                disabled={saving}
                                className={`w-full bg-gradient-to-r ${color} hover:opacity-90`}
                            >
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plug className="w-4 h-4 mr-2" />}
                                {name}
                            </Button>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="tunnel" className="space-y-3 mt-3">
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-amber-300/80 text-xs">
                            Use this method if you need to connect via localhost (e.g., for desktop wallets)
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-slate-300 text-sm mb-2 block">Step 1: Create SSH Tunnel</Label>
                            <div className="relative group">
                                <pre className="bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-green-500/20">
ssh -L 9766:go.getblock.io:443 -N user@your-server.com</pre>
                                <Button size="sm" variant="ghost" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
                                    onClick={() => { navigator.clipboard.writeText('ssh -L 9766:go.getblock.io:443 -N user@your-server.com'); toast.success('Copied'); }}>
                                    <Copy className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Label className="text-slate-300 text-sm mb-2 block">Step 2: Add Localhost Configuration</Label>
                            <Button
                                onClick={() => addConfig('GetBlock.io (via Tunnel)', 'localhost', '9766', '', false)}
                                disabled={saving}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Localhost:9766 Configuration
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}