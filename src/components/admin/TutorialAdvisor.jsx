import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Send, MessageCircle, Download, Info, History, Trash2, Copy, Code } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function TutorialAdvisor() {
    const [open, setOpen] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [unsubscribe, setUnsubscribe] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [generatedFiles, setGeneratedFiles] = useState([]);

    useEffect(() => {
        if (open && !conversationId) {
            initializeConversation();
        }
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [open]);

    useEffect(() => {
        if (messages.length > 0 && conversationId) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'assistant') {
                saveAssistantMessage(lastMessage.content);
            }
        }
    }, [messages]);

    const initializeConversation = async () => {
        try {
            const conversation = await base44.agents.createConversation({
                agent_name: 'tutorialAdvisor',
                metadata: {
                    name: 'Tutorial Advisor',
                    description: 'Get personalized tutorial recommendations'
                }
            });
            setConversationId(conversation.id);
            setMessages(conversation.messages || []);

            // Subscribe to updates
            const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
                setMessages(data.messages || []);
            });
            setUnsubscribe(() => unsub);
        } catch (err) {
            toast.error('Failed to start conversation: ' + err.message);
        }
    };

    const downloadGeneratedFile = (filename, content) => {
        const blob = new Blob([content], { type: 'text/javascript' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success(`${filename} downloaded`);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || !conversationId) return;

        const userMessage = input.trim();
        setInput('');
        setLoading(true);
        setGeneratedFiles([]);

        try {
            // Enhance message with conversation context and file generation instruction
            const conversationContext = messages
                .slice(-4)
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');
            
            const enhancedMessage = conversationContext 
                ? `Previous context:\n${conversationContext}\n\nError/Issue:\n${userMessage}\n\nIf this is a code error, analyze it and provide:\n1. Root cause explanation\n2. Step-by-step fix\n3. If applicable, provide complete corrected .js file code that can be downloaded (electron-main.js, vite.config.js, etc.)`
                : `Error/Issue:\n${userMessage}\n\nIf this is a code error, analyze it and provide:\n1. Root cause explanation\n2. Step-by-step fix\n3. If applicable, provide complete corrected .js file code that can be downloaded (electron-main.js, vite.config.js, etc.)`;

            await base44.agents.addMessage(
                { id: conversationId },
                {
                    role: 'user',
                    content: enhancedMessage
                }
            );
            
            await base44.entities.ConversationMessage.create({
                conversation_id: conversationId,
                role: 'user',
                content: userMessage,
                message_index: messages.length,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            toast.error('Failed to send message: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const saveAssistantMessage = async (content) => {
        try {
            await base44.entities.ConversationMessage.create({
                conversation_id: conversationId,
                role: 'assistant',
                content,
                message_index: messages.length,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('Failed to save assistant message:', err);
        }
    };

    const loadConversationHistory = async () => {
        try {
            const convos = await base44.entities.ConversationMessage.filter(
                { conversation_id: conversationId },
                'message_index'
            );
            return convos;
        } catch (err) {
            toast.error('Failed to load history: ' + err.message);
            return [];
        }
    };

    const loadAllConversations = async () => {
        try {
            const allMessages = await base44.entities.ConversationMessage.list('-created_date', 100);
            const convos = {};
            allMessages.forEach(msg => {
                if (!convos[msg.conversation_id]) {
                    convos[msg.conversation_id] = {
                        id: msg.conversation_id,
                        messages: [],
                        lastMessage: msg.created_date,
                        preview: ''
                    };
                }
                convos[msg.conversation_id].messages.push(msg);
            });
            setConversations(Object.values(convos).map(c => ({
                ...c,
                preview: c.messages[0]?.content?.substring(0, 50) + '...'
            })));
        } catch (err) {
            toast.error('Failed to load conversations: ' + err.message);
        }
    };

    const deleteConversation = async (convId) => {
        try {
            const messages = await base44.entities.ConversationMessage.filter({ conversation_id: convId });
            await Promise.all(messages.map(m => base44.entities.ConversationMessage.delete(m.id)));
            toast.success('Conversation deleted');
            loadAllConversations();
        } catch (err) {
            toast.error('Failed to delete conversation');
        }
    };

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Tutorial Advisor
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl h-[650px] bg-slate-950 border-slate-700 flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                AI Tutorial Advisor
                            </DialogTitle>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setShowHistory(true);
                                    loadAllConversations();
                                }}
                                className="text-slate-400 hover:text-white">
                                <History className="w-4 h-4 mr-1" />
                                History
                            </Button>
                        </div>
                        <p className="text-sm text-slate-400 mt-2">
                            Paste your error logs or describe your issue. I'll analyze it and provide fixed .js files if needed.
                        </p>
                        <div className="bg-blue-900/30 border border-blue-500/30 rounded p-2 mt-3">
                            <p className="text-xs text-blue-200 flex gap-2">
                                <Code className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span><strong>Automatic downloads:</strong> JavaScript code in my responses will have download buttons. Just paste your full error message!</span>
                            </p>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 bg-slate-900/30 rounded-lg p-4">
                        {messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <div className="text-center space-y-3">
                                    <MessageCircle className="w-8 h-8 mx-auto text-slate-500" />
                                    <div>
                                        <p className="font-semibold mb-2">Tell me about your error or issue...</p>
                                        <p className="text-xs text-slate-500 mb-3">Examples:</p>
                                        <ul className="text-xs text-slate-500 space-y-1">
                                            <li>• "Blank white screen after adding .env"</li>
                                            <li>• "Electron window won't load"</li>
                                            <li>• "F12 DevTools not opening"</li>
                                            <li>• "Cannot find module tailwindcss"</li>
                                            <li>• "Vite build failing"</li>
                                            <li>• "Connection failed errors"</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                // Extract code blocks for file generation
                                const codeBlockRegex = /```(javascript|js)\n([\s\S]*?)```/g;
                                const fileMatches = msg.role === 'assistant' ? [...msg.content.matchAll(codeBlockRegex)] : [];
                                
                                return (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[85%] rounded-lg px-4 py-2 ${
                                                msg.role === 'user'
                                                    ? 'bg-slate-800 text-white'
                                                    : 'bg-purple-900/30 border border-purple-500/30 text-slate-100'
                                            }`}>
                                            {msg.role === 'user' ? (
                                                <p className="text-sm">{msg.content}</p>
                                            ) : (
                                                <>
                                                    <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:list-disc [&_li]:ml-4">
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                    {fileMatches.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-purple-500/20 space-y-2">
                                                            {fileMatches.map((match, fIdx) => {
                                                                const code = match[2];
                                                                // Try to detect filename from context
                                                                const filenameMatch = msg.content.substring(Math.max(0, match.index - 100), match.index).match(/(?:file|download|create|save):\s*(\S+\.(js|jsx))/i);
                                                                const filename = filenameMatch?.[1] || `file-${fIdx + 1}.js`;
                                                                
                                                                return (
                                                                    <Button
                                                                        key={fIdx}
                                                                        size="sm"
                                                                        onClick={() => downloadGeneratedFile(filename, code)}
                                                                        className="w-full bg-green-600 hover:bg-green-700 text-white">
                                                                        <Download className="w-3 h-3 mr-1" />
                                                                        Download {filename}
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                        <span className="text-sm text-slate-400">Analyzing your issue...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Paste your error message or describe your issue..."
                            className="bg-slate-800 border-slate-700 text-white resize-none"
                            rows={3}
                        />
                        <Button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="bg-purple-600 hover:bg-purple-700 h-full">
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-w-2xl h-[600px] bg-slate-950 border-slate-700 flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <History className="w-5 h-5 text-purple-400" />
                            Conversation History
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {conversations.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No saved conversations yet</p>
                        ) : (
                            conversations.map(conv => (
                                <Card key={conv.id} className="bg-slate-900/50 border-slate-700 p-4 hover:bg-slate-900/70 transition">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 cursor-pointer" onClick={() => {
                                            setConversationId(conv.id);
                                            setShowHistory(false);
                                            setOpen(true);
                                        }}>
                                            <p className="text-white text-sm font-medium">Conversation {conv.id?.substring(0, 8)}</p>
                                            <p className="text-slate-400 text-xs mt-1">{conv.preview}</p>
                                            <p className="text-slate-500 text-xs mt-2">{conv.messages.length} messages</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(conv.messages.map(m => `${m.role}: ${m.content}`).join('\n\n'));
                                                    toast.success('Conversation copied');
                                                }}
                                                className="text-blue-400 hover:text-blue-300">
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => deleteConversation(conv.id)}
                                                className="text-red-400 hover:text-red-300">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}