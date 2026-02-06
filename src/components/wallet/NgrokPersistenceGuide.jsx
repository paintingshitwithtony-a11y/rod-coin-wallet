import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Terminal, Zap, Shield, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function NgrokPersistenceGuide() {
    const [copied, setCopied] = useState({});

    const copyCommand = (id, command) => {
        navigator.clipboard.writeText(command);
        setCopied({ ...copied, [id]: true });
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied({ ...copied, [id]: false }), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-900/80 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center gap-2">
                        <Zap className="w-6 h-6 text-purple-400" />
                        ngrok Persistence Setup Guide
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Keep your ROD RPC tunnel running 24/7, even after restarts
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Overview */}
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <Info className="w-4 h-4 text-blue-400" />
                        <AlertDescription className="text-blue-300">
                            <strong>Why persistence?</strong> By default, ngrok stops when you close the terminal. This guide shows how to run it as a background service that auto-starts on reboot.
                        </AlertDescription>
                    </Alert>

                    <Tabs defaultValue="windows" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                            <TabsTrigger value="windows">Windows</TabsTrigger>
                            <TabsTrigger value="mac">macOS</TabsTrigger>
                            <TabsTrigger value="linux">Linux</TabsTrigger>
                        </TabsList>

                        {/* Windows Setup */}
                        <TabsContent value="windows" className="space-y-4 mt-4">
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">1</div>
                                        <h3 className="text-white font-semibold">Get Your Auth Token</h3>
                                    </div>
                                    <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                                        <li>Go to <a href="https://dashboard.ngrok.com" target="_blank" className="text-purple-400 hover:underline">dashboard.ngrok.com</a></li>
                                        <li>Sign in to your ngrok account</li>
                                        <li>Copy your auth token from the dashboard</li>
                                    </ol>
                                </div>

                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">2</div>
                                        <h3 className="text-white font-semibold">Create Batch Script</h3>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-3">Create a file called <code className="bg-slate-950 px-2 py-1 rounded text-green-400">start-ngrok.bat</code></p>
                                    <div className="relative group">
                                        <pre className="bg-slate-950 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-green-500/20">
{`@echo off
REM Start ngrok tunnel for ROD RPC (port 9766)
cd %USERPROFILE%\\AppData\\Local\\ngrok
ngrok authtoken YOUR_AUTH_TOKEN
ngrok tcp 9766`}