import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    Monitor, Smartphone, Tablet, MapPin, Clock, 
    LogOut, AlertCircle, Loader2, CheckCircle2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function getDeviceIcon(deviceInfo) {
    if (!deviceInfo) return Monitor;
    const lower = deviceInfo.toLowerCase();
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
        return Smartphone;
    }
    if (lower.includes('tablet') || lower.includes('ipad')) {
        return Tablet;
    }
    return Monitor;
}

function formatDeviceName(deviceInfo) {
    if (!deviceInfo) return 'Unknown Device';
    
    // Extract browser and OS info
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
    const os = ['Windows', 'macOS', 'Linux', 'Android', 'iOS'];
    
    let browser = 'Browser';
    let system = '';
    
    for (const b of browsers) {
        if (deviceInfo.includes(b)) {
            browser = b;
            break;
        }
    }
    
    for (const o of os) {
        if (deviceInfo.includes(o)) {
            system = ` on ${o}`;
            break;
        }
    }
    
    return `${browser}${system}`;
}

export default function SessionManagement({ account, currentSessionToken }) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [terminating, setTerminating] = useState(null);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const allSessions = await base44.entities.UserSession.filter({
                account_id: account.id
            }, '-last_active', 50);
            setSessions(allSessions);
        } catch (err) {
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [account]);

    const handleTerminateSession = async (sessionId, isCurrentSession) => {
        if (isCurrentSession) {
            toast.error('Cannot terminate current session. Use logout instead.');
            return;
        }

        setTerminating(sessionId);
        try {
            await base44.entities.UserSession.delete(sessionId);
            setSessions(sessions.filter(s => s.id !== sessionId));
            toast.success('Session terminated');
        } catch (err) {
            toast.error('Failed to terminate session');
        } finally {
            setTerminating(null);
        }
    };

    const handleTerminateAllOthers = async () => {
        if (sessions.length <= 1) {
            toast.info('No other sessions to terminate');
            return;
        }

        setTerminating('all');
        try {
            const otherSessions = sessions.filter(s => s.session_token !== currentSessionToken);
            await Promise.all(otherSessions.map(s => base44.entities.UserSession.delete(s.id)));
            setSessions(sessions.filter(s => s.session_token === currentSessionToken));
            toast.success(`Terminated ${otherSessions.length} session(s)`);
        } catch (err) {
            toast.error('Failed to terminate all sessions');
        } finally {
            setTerminating(null);
        }
    };

    return (
        <Card className="bg-slate-900/80 border-slate-700/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <Monitor className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Active Sessions</CardTitle>
                            <CardDescription className="text-slate-400">
                                Manage your active login sessions
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchSessions}
                            disabled={loading}
                            className="text-slate-400 hover:text-white"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        {sessions.length > 1 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleTerminateAllOthers}
                                disabled={terminating === 'all'}
                                className="bg-red-900/30 hover:bg-red-900/50 border border-red-500/50"
                            >
                                {terminating === 'all' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <LogOut className="w-4 h-4 mr-2" />
                                )}
                                End All Others
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading && sessions.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-12">
                        <Monitor className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500">No active sessions found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {sessions.map((session, index) => {
                                const DeviceIcon = getDeviceIcon(session.device_info);
                                const isCurrentSession = session.session_token === currentSessionToken;
                                const lastActive = new Date(session.last_active || session.created_date);
                                const now = new Date();
                                const diffMs = now - lastActive;
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHours = Math.floor(diffMs / 3600000);
                                const diffDays = Math.floor(diffMs / 86400000);
                                
                                let timeAgo;
                                if (diffMins < 1) timeAgo = 'Just now';
                                else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                                else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
                                else timeAgo = `${diffDays}d ago`;

                                return (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`p-4 rounded-xl border transition-all ${
                                            isCurrentSession
                                                ? 'bg-purple-900/20 border-purple-500/50'
                                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className={`p-2 rounded-lg ${
                                                    isCurrentSession ? 'bg-purple-500/20' : 'bg-slate-700/50'
                                                }`}>
                                                    <DeviceIcon className={`w-5 h-5 ${
                                                        isCurrentSession ? 'text-purple-400' : 'text-slate-400'
                                                    }`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-sm font-medium text-white">
                                                            {formatDeviceName(session.device_info)}
                                                        </h4>
                                                        {isCurrentSession && (
                                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5" />
                                                                Current
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        {session.ip_address && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                <MapPin className="w-3 h-3" />
                                                                {session.ip_address}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                                            <Clock className="w-3 h-3" />
                                                            Last active {timeAgo}
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-mono">
                                                            {session.session_token.slice(0, 16)}...
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {!isCurrentSession && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleTerminateSession(session.id, isCurrentSession)}
                                                    disabled={terminating === session.id}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                >
                                                    {terminating === session.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <LogOut className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}

                <Alert className="bg-slate-800/30 border-slate-700">
                    <AlertCircle className="h-4 w-4 text-slate-400" />
                    <AlertDescription className="text-slate-400 text-xs">
                        If you notice any suspicious sessions, terminate them immediately and change your password.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}