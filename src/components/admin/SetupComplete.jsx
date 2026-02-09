import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, RefreshCw, Folder, Terminal } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SetupComplete() {
    const [step, setStep] = useState(1);

    const steps = [
        {
            id: 1,
            title: "Create src/api/ folder",
            description: "In your project root, create: src/api/",
            command: "mkdir src\\api",
            icon: Folder
        },
        {
            id: 2,
            title: "Place base44Client.js",
            description: "Move the downloaded base44Client.js into src/api/ folder",
            icon: CheckCircle2
        },
        {
            id: 3,
            title: "Stop Vite Dev Server",
            description: "Press Ctrl+C in the terminal running 'npm run dev'",
            command: "Ctrl+C",
            icon: Terminal
        },
        {
            id: 4,
            title: "Stop Electron",
            description: "Press Ctrl+C in the terminal running 'npm run electron:dev'",
            command: "Ctrl+C",
            icon: Terminal
        },
        {
            id: 5,
            title: "Restart Vite",
            description: "Run: npm run dev",
            command: "npm run dev",
            icon: RefreshCw
        },
        {
            id: 6,
            title: "Restart Electron",
            description: "Run: npm run electron:dev",
            command: "npm run electron:dev",
            icon: RefreshCw
        }
    ];

    return (
        <Card className="bg-gradient-to-br from-green-900/50 to-slate-900/80 border-green-500/30">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                    Setup Almost Complete!
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="bg-green-900/20 border-green-500/50">
                    <AlertCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-300">
                        403 errors mean the APP_ID is working! Now complete these steps to finish setup.
                    </AlertDescription>
                </Alert>

                <div className="space-y-3">
                    {steps.map((s) => {
                        const Icon = s.icon;
                        return (
                            <div 
                                key={s.id}
                                className={`p-3 rounded-lg border transition-all ${
                                    step >= s.id 
                                        ? 'border-green-500/50 bg-green-900/20' 
                                        : 'border-slate-700 bg-slate-800/50'
                                }`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        step >= s.id ? 'bg-green-500/20' : 'bg-slate-700'
                                    }`}>
                                        {step > s.id ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        ) : (
                                            <Icon className={`w-5 h-5 ${step >= s.id ? 'text-green-400' : 'text-slate-400'}`} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-white mb-1">
                                            Step {s.id}: {s.title}
                                        </h4>
                                        <p className="text-sm text-slate-300 mb-2">{s.description}</p>
                                        {s.command && (
                                            <code className="text-xs bg-slate-950 px-2 py-1 rounded text-green-400 block w-fit">
                                                {s.command}
                                            </code>
                                        )}
                                    </div>
                                    {step === s.id && (
                                        <Button
                                            size="sm"
                                            onClick={() => setStep(step + 1)}
                                            className="bg-green-600 hover:bg-green-700">
                                            Done
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {step > steps.length && (
                    <Alert className="bg-purple-900/20 border-purple-500/50">
                        <CheckCircle2 className="h-4 w-4 text-purple-400" />
                        <AlertDescription className="text-purple-300">
                            ✅ Setup Complete! Your wallet should now load without 404 errors.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}