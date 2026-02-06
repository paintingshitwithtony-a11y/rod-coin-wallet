import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Zap, Info, AlertTriangle, Monitor } from 'lucide-react';
import { toast } from 'sonner';

export default function NgrokSetupGuide() {
    const [copied, setCopied] = useState({});

    const copyToClipboard = (id, text) => {
        navigator.clipboard.writeText(text);
        setCopied({ ...copied, [id]: true });
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied({ ...copied, [id]: false }), 2000);
    };

    const CodeBlock = ({ id, code, language = 'bash' }) => (
        <div className="relative group">
            <pre className="bg-slate-950 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto border border-green-500/20">
                <code>{code}</code>
            </pre>
            <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
                onClick={() => copyToClipboard(id, code)}
            >
                {copied[id] ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="bg-slate-900/80 border-slate-700/50">
                    <CardHeader>
                        <CardTitle className="text-3xl text-white flex items-center gap-2">
                            <Zap className="w-7 h-7 text-purple-400" />
                            ngrok Persistence Setup
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Run ngrok in the background with auto-start on reboot
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <Alert className="bg-purple-500/10 border-purple-500/30">
                            <Info className="w-4 h-4 text-purple-400" />
                            <AlertDescription className="text-purple-300">
                                <strong>Prerequisites:</strong> ngrok installed and your auth token ready
                            </AlertDescription>
                        </Alert>

                        <Tabs defaultValue="windows" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                                <TabsTrigger value="windows">Windows</TabsTrigger>
                                <TabsTrigger value="mac">macOS</TabsTrigger>
                                <TabsTrigger value="linux">Linux</TabsTrigger>
                            </TabsList>

                            {/* Windows */}
                            <TabsContent value="windows" className="space-y-4 mt-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">1</div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold mb-2">Create Startup Script</h3>
                                                <p className="text-sm text-slate-400 mb-2">Create a file <code className="bg-slate-950 px-2 py-1 rounded text-green-400 text-xs">C:\ngrok\start-ngrok.bat</code></p>
                                                <CodeBlock id="win_script" code={`@echo off
REM Start ngrok tunnel for ROD RPC
ngrok authtoken YOUR_AUTH_TOKEN_HERE
ngrok tcp 9766`} />
                                                <p className="text-xs text-slate-500 mt-2">Replace YOUR_AUTH_TOKEN_HERE with your actual token from <a href="https://dashboard.ngrok.com" target="_blank" className="text-purple-400 hover:underline">dashboard.ngrok.com</a></p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">2</div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold mb-2">Create Shortcut for Startup Folder</h3>
                                                <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                                                    <li>Right-click <code className="text-xs">start-ngrok.bat</code> → Create shortcut</li>
                                                    <li>Press <kbd className="bg-slate-950 px-2 py-1 rounded text-xs">Win + R</kbd>, type <code className="text-xs">shell:startup</code>, press Enter</li>
                                                    <li>Move the shortcut into this folder</li>
                                                    <li>Reboot to test</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </div>

                                    <Alert className="bg-green-500/10 border-green-500/30">
                                        <Check className="w-4 h-4 text-green-400" />
                                        <AlertDescription className="text-green-300 text-sm">
                                            Your ngrok tunnel will now start automatically whenever Windows boots
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </TabsContent>

                            {/* macOS */}
                            <TabsContent value="mac" className="space-y-4 mt-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">1</div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold mb-2">Create Launch Agent</h3>
                                                <p className="text-sm text-slate-400 mb-2">Create <code className="bg-slate-950 px-2 py-1 rounded text-green-400 text-xs">~/Library/LaunchAgents/com.ngrok.plist</code></p>
                                                <CodeBlock id="mac_plist" code={`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ngrok.tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ngrok</string>
        <string>tcp</string>
        <string>9766</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ngrok.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ngrok-error.log</string>
</dict>
</plist>`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">2</div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold mb-2">Authenticate & Load</h3>
                                                <CodeBlock id="mac_auth" code={`ngrok authtoken YOUR_AUTH_TOKEN_HERE
launchctl load ~/Library/LaunchAgents/com.ngrok.plist`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-sm text-slate-400 space-y-2">
                                        <p><strong>To check if running:</strong></p>
                                        <CodeBlock id="mac_check" code={`launchctl list | grep ngrok`} />
                                        <p><strong>To stop:</strong></p>
                                        <CodeBlock id="mac_stop" code={`launchctl unload ~/Library/LaunchAgents/com.ngrok.plist`} />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Linux */}
                            <TabsContent value="linux" className="space-y-4 mt-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">1</div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold mb-2">Create Systemd Service</h3>
                                                <p className="text-sm text-slate-400 mb-2">Create <code className="bg-slate-950 px-2 py-1 rounded text-green-400 text-xs">/etc/systemd/system/ngrok.service</code></p>
                                                <CodeBlock id="linux_service" code={`[Unit]
Description=ngrok TCP tunnel for ROD RPC
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
ExecStart=/usr/local/bin/ngrok tcp 9766
Environment="NGROK_AUTHTOKEN=YOUR_AUTH_TOKEN_HERE"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`} />
                                                <p className="text-xs text-slate-500 mt-2">Replace YOUR_USERNAME and YOUR_AUTH_TOKEN_HERE</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">2</div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold mb-2">Enable & Start Service</h3>
                                                <CodeBlock id="linux_enable" code={`sudo systemctl daemon-reload
sudo systemctl enable ngrok.service
sudo systemctl start ngrok.service
sudo systemctl status ngrok.service`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-sm text-slate-400 space-y-2">
                                        <p><strong>View logs:</strong></p>
                                        <CodeBlock id="linux_logs" code={`sudo journalctl -u ngrok.service -f`} />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Verify Setup */}
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-green-400" />
                                    Verify Your Setup
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                                    <li>Reboot your computer</li>
                                    <li>Go to <a href="https://dashboard.ngrok.com/status" target="_blank" className="text-purple-400 hover:underline">ngrok dashboard</a> → Sessions</li>
                                    <li>You should see an active TCP session for <code className="text-xs">localhost:9766</code></li>
                                    <li>Copy the ngrok URL and add it to Admin → RPC Configuration</li>
                                </ol>
                            </CardContent>
                        </Card>

                        <Alert className="bg-amber-500/10 border-amber-500/30">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            <AlertDescription className="text-amber-300 text-sm">
                                <strong>Important:</strong> Keep your auth token private. Anyone with it can use your ngrok account.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}