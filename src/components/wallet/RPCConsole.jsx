import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Send, Trash2, Copy, CheckCircle2, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function RPCConsole({ account }) {
    const [command, setCommand] = useState('');
    const [commandHistory, setCommandHistory] = useState([]);
    const [outputHistory, setOutputHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const commonCommands = [
        { label: 'Get Block Count', cmd: 'getblockcount' },
        { label: 'Get Blockchain Info', cmd: 'getblockchaininfo' },
        { label: 'Get Network Info', cmd: 'getnetworkinfo' },
        { label: 'Get Balance', cmd: 'getbalance' },
        { label: 'Get New Address', cmd: 'getnewaddress' },
        { label: 'List Transactions', cmd: 'listtransactions "" 10' },
        { label: 'Get Mining Info', cmd: 'getmininginfo' },
        { label: 'Get Connection Count', cmd: 'getconnectioncount' }
    ];

    const executeCommand = async (cmdToExecute = command) => {
        if (!cmdToExecute.trim()) return;

        setLoading(true);
        const timestamp = new Date().toLocaleTimeString();

        try {
            // Parse command and params
            const parts = cmdToExecute.trim().split(/\s+/);
            const method = parts[0];
            const params = parts.slice(1).map(p => {
                try {
                    return JSON.parse(p);
                } catch {
                    return p;
                }
            });

            const response = await base44.functions.invoke('executeRPCCommand', {
                method,
                params
            });

            const output = {
                timestamp,
                command: cmdToExecute,
                result: response.data,
                success: response.data.success !== false
            };

            setOutputHistory(prev => [...prev, output]);
            setCommandHistory(prev => [...prev, cmdToExecute]);
            setHistoryIndex(-1);
            setCommand('');
        } catch (err) {
            const output = {
                timestamp,
                command: cmdToExecute,
                result: { error: err.message },
                success: false
            };
            setOutputHistory(prev => [...prev, output]);
            toast.error('Command failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeCommand();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = historyIndex + 1;
                if (newIndex < commandHistory.length) {
                    setHistoryIndex(newIndex);
                    setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setCommand('');
            }
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
        toast.success('Copied to clipboard');
    };

    const clearHistory = () => {
        setOutputHistory([]);
        setCommandHistory([]);
        toast.success('Console cleared');
    };

    return (
        <Card className="bg-slate-900/80 border-slate-700/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-green-400" />
                        RPC Command Console
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('http://explorer1.rod.spacexpanse.org:3001/rpc-browser', '_blank')}
                            className="text-purple-400 border-purple-500/50">
                            <Info className="w-4 h-4 mr-1" />
                            RPC Docs
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearHistory}
                            className="text-red-400 border-red-500/50">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Quick Commands */}
                <div>
                    <p className="text-xs text-slate-400 mb-2">Quick Commands:</p>
                    <div className="flex flex-wrap gap-2">
                        {commonCommands.map((cmd, i) => (
                            <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                onClick={() => executeCommand(cmd.cmd)}
                                disabled={loading}
                                className="text-xs text-slate-300 border-slate-600 hover:border-purple-500/50">
                                {cmd.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Command Output */}
                <ScrollArea className="h-96 rounded-lg bg-slate-950/50 border border-slate-700/50 p-4">
                    <div className="space-y-3 font-mono text-xs">
                        {outputHistory.length === 0 ? (
                            <div className="text-slate-500 text-center py-8">
                                <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No commands executed yet</p>
                                <p className="text-xs mt-1">Type a command below or use quick commands</p>
                            </div>
                        ) : (
                            outputHistory.map((output, i) => (
                                <div key={i} className="border-b border-slate-800 pb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">{output.timestamp}</span>
                                            <Badge variant={output.success ? "default" : "destructive"} className="text-xs">
                                                {output.success ? 'Success' : 'Error'}
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => copyToClipboard(output.result)}
                                            className="h-6 w-6 text-slate-400 hover:text-white">
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <div className="text-green-400 mb-2">
                                        $ {output.command}
                                    </div>
                                    <pre className="text-slate-300 whitespace-pre-wrap overflow-x-auto">
                                        {typeof output.result === 'string' 
                                            ? output.result 
                                            : JSON.stringify(output.result, null, 2)}
                                    </pre>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Command Input */}
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-mono">$</span>
                        <Input
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter RPC command (e.g., getblockcount)"
                            disabled={loading}
                            className="pl-8 bg-slate-950/50 border-slate-700 text-white font-mono"
                        />
                    </div>
                    <Button
                        onClick={() => executeCommand()}
                        disabled={loading || !command.trim()}
                        className="bg-green-600 hover:bg-green-700">
                        <Send className="w-4 h-4 mr-2" />
                        Execute
                    </Button>
                </div>

                <div className="text-xs text-slate-500">
                    <p>• Use <kbd className="px-1 py-0.5 bg-slate-800 rounded">↑</kbd> <kbd className="px-1 py-0.5 bg-slate-800 rounded">↓</kbd> to navigate command history</p>
                    <p>• Press <kbd className="px-1 py-0.5 bg-slate-800 rounded">Enter</kbd> to execute command</p>
                    <p>• See <a href="http://explorer1.rod.spacexpanse.org:3001/rpc-browser" target="_blank" className="text-purple-400 hover:underline">RPC Browser</a> for full command reference</p>
                </div>
            </CardContent>
        </Card>
    );
}