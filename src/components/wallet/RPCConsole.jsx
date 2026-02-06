import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Terminal, Send, Trash2, Copy, CheckCircle2, Info, Lightbulb, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function RPCConsole({ account }) {
    const [command, setCommand] = useState('');
    const [commandHistory, setCommandHistory] = useState([]);
    const [outputHistory, setOutputHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [aiExplaining, setAiExplaining] = useState(null);
    const [alerts, setAlerts] = useState([]);

    const getCommonCommands = () => [
        { label: 'Get Block Count', cmd: 'getblockcount' },
        { label: 'Get Blockchain Info', cmd: 'getblockchaininfo' },
        { label: 'Get Network Info', cmd: 'getnetworkinfo' },
        { label: 'Get Balance', cmd: `getbalance "" 0 "${account?.wallet_address || ''}"` },
        { label: 'Get New Address', cmd: 'getnewaddress' },
        { label: 'List Transactions', cmd: 'listtransactions "" 10' },
        { label: 'Get Mining Info', cmd: 'getmininginfo' },
        { label: 'Get Connection Count', cmd: 'getconnectioncount' }
    ];

    const executeCommand = async (cmdToExecute = command) => {
        if (!cmdToExecute.trim()) return;

        setLoading(true);
        setShowSuggestions(false);
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

            // Check for node issues and create alerts
            analyzeForIssues(method, response.data);
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

    const analyzeForIssues = (method, result) => {
        const newAlerts = [];

        if (method === 'getblockchaininfo' && result.result) {
            const data = result.result;
            if (data.blocks && data.headers && (data.headers - data.blocks) > 10) {
                newAlerts.push({
                    type: 'warning',
                    message: `Node is ${data.headers - data.blocks} blocks behind. Syncing in progress.`
                });
            }
            if (data.verificationprogress && data.verificationprogress < 0.99) {
                newAlerts.push({
                    type: 'info',
                    message: `Chain verification: ${(data.verificationprogress * 100).toFixed(2)}% complete`
                });
            }
        }

        if (method === 'getconnectioncount' && result.result !== undefined) {
            if (result.result === 0) {
                newAlerts.push({
                    type: 'error',
                    message: 'No peer connections! Node may be isolated from network.'
                });
            } else if (result.result < 3) {
                newAlerts.push({
                    type: 'warning',
                    message: `Only ${result.result} peer connections. Consider checking network connectivity.`
                });
            }
        }

        if (method === 'getmempoolinfo' && result.result) {
            const mempool = result.result;
            if (mempool.size > 1000) {
                newAlerts.push({
                    type: 'warning',
                    message: `Large mempool detected (${mempool.size} transactions). Network may be congested.`
                });
            }
        }

        if (newAlerts.length > 0) {
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 5));
        }
    };

    const getSuggestions = async (input) => {
        if (!input.trim() || input.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Given the user input "${input}" for a ROD cryptocurrency RPC console, suggest 3 relevant RPC commands they might want to execute. 

Common commands include: getblockcount, getblockchaininfo, getbalance, getnewaddress, listtransactions, getnetworkinfo, getpeerinfo, getmininginfo, getconnectioncount, getmempoolinfo, listaccounts, validateaddress, sendtoaddress, getblock, getblockhash, getrawtransaction.

Return ONLY the command names, one per line, no explanations.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        commands: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            });

            if (response.commands && response.commands.length > 0) {
                setSuggestions(response.commands.slice(0, 3));
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error('Failed to get suggestions:', err);
        }
    };

    const explainOutput = async (output) => {
        setAiExplaining(output.timestamp);
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Explain this ROD RPC command output in simple terms for a non-technical user:

Command: ${output.command}
Output: ${JSON.stringify(output.result, null, 2)}

Provide a brief, clear explanation of what this output means and any important information the user should know. Keep it under 100 words.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        explanation: { type: "string" }
                    }
                }
            });

            if (response.explanation) {
                setOutputHistory(prev => prev.map(item => 
                    item.timestamp === output.timestamp 
                        ? { ...item, aiExplanation: response.explanation }
                        : item
                ));
                toast.success('Explanation generated');
            }
        } catch (err) {
            toast.error('Failed to generate explanation');
        } finally {
            setAiExplaining(null);
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
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleCommandChange = (value) => {
        setCommand(value);
        if (value.trim().length >= 2) {
            const timeoutId = setTimeout(() => getSuggestions(value), 500);
            return () => clearTimeout(timeoutId);
        } else {
            setShowSuggestions(false);
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
                            onClick={() => window.open('https://explorer1.rod.spacexpanse.org:3001/rpc-browser', '_blank')}
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
                {/* AI Alerts */}
                {alerts.length > 0 && (
                    <div className="space-y-2">
                        {alerts.map((alert, i) => (
                            <Alert key={i} className={
                                alert.type === 'error' ? 'bg-red-500/10 border-red-500/30' :
                                alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                                'bg-blue-500/10 border-blue-500/30'
                            }>
                                {alert.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> :
                                 alert.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
                                 <Info className="w-4 h-4 text-blue-400" />}
                                <AlertDescription className={
                                    alert.type === 'error' ? 'text-red-300' :
                                    alert.type === 'warning' ? 'text-amber-300' :
                                    'text-blue-300'
                                }>
                                    {alert.message}
                                </AlertDescription>
                            </Alert>
                        ))}
                    </div>
                )}

                {/* Quick Commands */}
                <div>
                    <p className="text-xs text-slate-400 mb-2">Quick Commands:</p>
                    <div className="flex flex-wrap gap-2">
                        {getCommonCommands().map((cmd, i) => (
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
                                    {!output.aiExplanation && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => explainOutput(output)}
                                            disabled={aiExplaining === output.timestamp}
                                            className="mt-2 text-purple-400 hover:text-purple-300 h-7 text-xs">
                                            {aiExplaining === output.timestamp ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    Explaining...
                                                </>
                                            ) : (
                                                <>
                                                    <Lightbulb className="w-3 h-3 mr-1" />
                                                    Explain with AI
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    {output.aiExplanation && (
                                        <div className="mt-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Lightbulb className="w-4 h-4 text-purple-400" />
                                                <span className="text-xs font-semibold text-purple-400">AI Explanation</span>
                                            </div>
                                            <p className="text-sm text-purple-200">{output.aiExplanation}</p>
                                        </div>
                                    )}
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
                            onChange={(e) => handleCommandChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter RPC command (e.g., getblockcount)"
                            disabled={loading}
                            className="pl-8 bg-slate-950/50 border-slate-700 text-white font-mono"
                        />
                        {/* AI Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-purple-500/50 rounded-lg shadow-xl z-10">
                                <div className="p-2 border-b border-slate-700 flex items-center gap-2">
                                    <Lightbulb className="w-3 h-3 text-purple-400" />
                                    <span className="text-xs text-purple-400 font-semibold">AI Suggestions</span>
                                </div>
                                {suggestions.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setCommand(suggestion);
                                            setShowSuggestions(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-purple-500/20 hover:text-white transition-colors">
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
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
                    <p>• See <a href="https://explorer1.rod.spacexpanse.org:3001/rpc-browser" target="_blank" className="text-purple-400 hover:underline">RPC Browser</a> for full command reference</p>
                </div>
            </CardContent>
        </Card>
    );
}