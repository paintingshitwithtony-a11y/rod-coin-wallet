import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Unlock, Loader2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AdminNodeUnlock() {
  const [passphrase, setPassphrase] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const handlePermanentUnlock = async () => {
    if (!passphrase.trim()) {
      toast.error('Enter the node wallet passphrase');
      return;
    }

    setUnlocking(true);
    try {
      const response = await base44.functions.invoke('executeRPCCommand', {
        method: 'walletpassphrase',
        params: [passphrase, 100000000]
      });

      if (response.data?.success) {
        toast.success('Node wallet unlocked until restart or manual lock');
        setPassphrase('');
      } else {
        toast.error(response.data?.error || 'Failed to unlock node wallet');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to unlock node wallet');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <Card className="bg-slate-900/80 border-green-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Unlock className="w-5 h-5 text-green-400" />
          Permanent Node Unlock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200/90">
            Unlocks the node wallet for the maximum supported duration, until the node restarts or is manually locked.
          </AlertDescription>
        </Alert>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Label className="text-slate-300">Node Wallet Passphrase</Label>
            <Input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePermanentUnlock(); }}
              placeholder="Enter passphrase"
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>
          <Button
            onClick={handlePermanentUnlock}
            disabled={unlocking || !passphrase.trim()}
            className="bg-green-600 hover:bg-green-700">
            {unlocking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
            Unlock Node
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}