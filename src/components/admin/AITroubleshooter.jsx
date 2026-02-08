import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Zap, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function AITroubleshooter() {
    const [open, setOpen] = useState(false);
    const [errorLog, setErrorLog] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        if (!errorLog.trim()) {
            toast.error('Please paste an error message or log');
            return;
        }

        setLoading(true);
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `You are an expert Node.js/Vite/Electron developer. Analyze this error and provide clear troubleshooting steps:

ERROR/LOG:
${errorLog}

Provide:
1. What the error means
2. Root cause(s)
3. Step-by-step solutions (numbered)
4. Commands to run if applicable
5. Prevention tips

Be concise and practical.`,
                add_context_from_internet: false
            });

            setAnalysis(response);
            toast.success('Analysis complete');
        } catch (err) {
            toast.error('Analysis failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
                <Zap className="w-4 h-4 mr-2" />
                AI Troubleshooter
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-950 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-cyan-400" />
                            AI Error Analyzer
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {!analysis ? (
                            <>
                                <div>
                                    <label className="text-sm text-slate-300 mb-2 block">
                                        Paste error message or console log:
                                    </label>
                                    <Textarea
                                        value={errorLog}
                                        onChange={(e) => setErrorLog(e.target.value)}
                                        placeholder="[plugin:vite:import-analysis] Failed to resolve import..."
                                        className="bg-slate-800 border-slate-700 text-white min-h-32"
                                    />
                                </div>

                                <Button
                                    onClick={handleAnalyze}
                                    disabled={loading || !errorLog.trim()}
                                    className="w-full bg-cyan-600 hover:bg-cyan-700">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 mr-2" />
                                            Analyze Error
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Card className="bg-slate-900 border-cyan-500/30 p-4">
                                    <div className="prose prose-invert max-w-none text-sm">
                                        <ReactMarkdown
                                            components={{
                                                code: ({ inline, children }) =>
                                                    inline ? (
                                                        <code className="bg-slate-800 px-2 py-1 rounded text-cyan-300">
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <pre className="bg-slate-800 p-3 rounded overflow-x-auto">
                                                            <code className="text-cyan-300">{children}</code>
                                                        </pre>
                                                    ),
                                                p: ({ children }) => <p className="mb-2 text-slate-300">{children}</p>,
                                                ol: ({ children }) => <ol className="ml-4 mb-2 space-y-1 list-decimal">{children}</ol>,
                                                li: ({ children }) => <li className="text-slate-300">{children}</li>,
                                                strong: ({ children }) => <strong className="text-cyan-300">{children}</strong>,
                                            }}>
                                            {analysis}
                                        </ReactMarkdown>
                                    </div>
                                </Card>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => {
                                            setAnalysis(null);
                                            setErrorLog('');
                                        }}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600">
                                        Analyze Another Error
                                    </Button>
                                    <Button
                                        onClick={() => setOpen(false)}
                                        variant="outline"
                                        className="flex-1 border-slate-700">
                                        Close
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}