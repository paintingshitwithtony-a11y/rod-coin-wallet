import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AutoUpdater() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [checking, setChecking] = useState(false);
    const [lastCheck, setLastCheck] = useState(null);

    useEffect(() => {
        // Auto-check for updates on mount
        checkForUpdates();
        
        // Check every 30 minutes
        const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const checkForUpdates = async () => {
        setChecking(true);
        try {
            // Get current app version from package.json or build metadata
            const response = await fetch(window.location.origin + '/package.json');
            if (!response.ok) throw new Error('Could not fetch version');
            
            const pkg = await response.json();
            const currentVersion = localStorage.getItem('app_version') || pkg.version;
            
            // Check if there's a newer build (via comparing timestamps)
            const buildCheck = await fetch(window.location.origin + '/', {
                method: 'HEAD',
                cache: 'no-store'
            });
            
            const buildTime = buildCheck.headers.get('last-modified') || buildCheck.headers.get('date');
            const lastBuildTime = localStorage.getItem('app_build_time');
            
            if (buildTime && lastBuildTime && buildTime !== lastBuildTime) {
                setUpdateAvailable(true);
                toast.info('New update available - click "Update Now" to reload');
            } else {
                localStorage.setItem('app_version', pkg.version);
                localStorage.setItem('app_build_time', buildTime);
            }
            
            setLastCheck(new Date().toLocaleTimeString());
        } catch (err) {
            console.log('Update check skipped:', err.message);
        } finally {
            setChecking(false);
        }
    };

    const handleUpdate = () => {
        // For web app - reload
        if (!window.electron) {
            window.location.reload();
            return;
        }

        // For Electron - restart the app
        toast.info('Restarting Electron to apply updates...');
        setTimeout(() => {
            window.electron?.ipcRenderer?.send('restart-app');
            // Fallback: just reload
            window.location.reload();
        }, 1000);
    };

    if (!updateAvailable) {
        return (
            <Card className="bg-gradient-to-br from-green-900/50 to-slate-900/80 border-green-500/30">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <div>
                                <p className="text-sm font-semibold text-green-400">App is up to date</p>
                                <p className="text-xs text-slate-400">
                                    {lastCheck ? `Last checked: ${lastCheck}` : 'Checking...'}
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={checkForUpdates}
                            disabled={checking}
                            className="border-green-500/50 text-green-400">
                            {checking ? 'Checking...' : 'Check Now'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Alert className="bg-amber-900/50 border-amber-500/50">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-100">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="font-semibold">Update Available</p>
                        <p className="text-sm text-amber-200">A new version has been released. Restart to apply changes.</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleUpdate}
                        className="bg-amber-600 hover:bg-amber-700 whitespace-nowrap">
                        <Download className="w-4 h-4 mr-1" />
                        Update Now
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}