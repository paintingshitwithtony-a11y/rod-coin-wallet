import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, Mail, Lock, Loader2, CheckCircle2, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateNewRODAddress, generatePrivateKey } from './Base58';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Simple hash function for password (in production, use proper bcrypt on backend)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'rod_wallet_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple encryption for private key (in production, use proper encryption)
async function encryptPrivateKey(privateKey, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(privateKey);
    const keyData = encoder.encode(password.padEnd(32, '0').slice(0, 32));
    
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
}

export default function AuthScreen({ onAuth }) {
    const [activeTab, setActiveTab] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [generatedAddress, setGeneratedAddress] = useState(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const passwordHash = await hashPassword(password);
            
            // Find account by email
            const accounts = await base44.entities.WalletAccount.filter({ email: email.toLowerCase() });
            
            if (accounts.length === 0) {
                setError('Account not found. Please create a new wallet.');
                setLoading(false);
                return;
            }

            const account = accounts[0];
            
            if (account.password_hash !== passwordHash) {
                setError('Invalid password');
                setLoading(false);
                return;
            }

            // Update last login
            await base44.entities.WalletAccount.update(account.id, {
                last_login: new Date().toISOString()
            });

            // Create session record
            const sessionToken = crypto.randomUUID();
            const deviceInfo = navigator.userAgent;
            
            // Get IP address (simplified - in production use a proper service)
            let ipAddress = 'Unknown';
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                ipAddress = ipData.ip;
            } catch (e) {
                // IP detection failed, continue with unknown
            }
            
            await base44.entities.UserSession.create({
                account_id: account.id,
                session_token: sessionToken,
                device_info: deviceInfo,
                ip_address: ipAddress,
                last_active: new Date().toISOString(),
                is_current: true
            });
            
            // Store session
            const session = {
                id: account.id,
                email: account.email,
                wallet_address: account.wallet_address,
                sessionToken: sessionToken,
                timestamp: Date.now()
            };
            
            localStorage.setItem('rod_wallet_session', JSON.stringify(session));
            toast.success('Welcome back!');
            onAuth(account);
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        try {
            // Check if email already exists
            const existing = await base44.entities.WalletAccount.filter({ email: email.toLowerCase() });
            if (existing.length > 0) {
                setError('An account with this email already exists');
                setLoading(false);
                return;
            }

            // Generate new wallet address
            const { address, publicKeyHash } = await generateNewRODAddress();
            const privateKey = generatePrivateKey();
            const passwordHash = await hashPassword(password);
            const encryptedPrivateKey = await encryptPrivateKey(privateKey, password);

            // Create account
            const account = await base44.entities.WalletAccount.create({
                email: email.toLowerCase(),
                password_hash: passwordHash,
                wallet_address: address,
                public_key_hash: publicKeyHash,
                encrypted_private_key: encryptedPrivateKey,
                additional_addresses: [],
                balance: 0,
                last_login: new Date().toISOString()
            });

            setGeneratedAddress({ address, privateKey });

            // Create session record
            const sessionToken = crypto.randomUUID();
            const deviceInfo = navigator.userAgent;
            
            let ipAddress = 'Unknown';
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                ipAddress = ipData.ip;
            } catch (e) {
                // IP detection failed
            }
            
            await base44.entities.UserSession.create({
                account_id: account.id,
                session_token: sessionToken,
                device_info: deviceInfo,
                ip_address: ipAddress,
                last_active: new Date().toISOString(),
                is_current: true
            });

            // Store session
            const session = {
                id: account.id,
                email: account.email,
                wallet_address: account.wallet_address,
                sessionToken: sessionToken,
                timestamp: Date.now()
            };
            
            localStorage.setItem('rod_wallet_session', JSON.stringify(session));
            
            // Import primary address into node (will work once RPC is configured)
            try {
                await base44.functions.invoke('importAddress', {
                    address: address,
                    label: 'Primary Address'
                });
            } catch (importError) {
                // Silently fail - will import when RPC is configured
            }
            
            toast.success('Wallet created successfully!');
            
            // Short delay to show the address, then proceed
            setTimeout(() => {
                onAuth(account);
            }, 3000);
        } catch (err) {
            setError('Failed to create wallet. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotPasswordLoading(true);
        setError('');

        try {
            const response = await base44.functions.invoke('forgotPassword', { 
                email: forgotPasswordEmail.toLowerCase() 
            });
            
            toast.success('Password recovery email sent! Check your inbox.');
            setShowForgotPassword(false);
            setForgotPasswordEmail('');
        } catch (err) {
            toast.info('If an account exists with this email, a recovery email has been sent.');
            setShowForgotPassword(false);
            setForgotPasswordEmail('');
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md mx-auto"
        >
            <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10">
                <CardHeader className="text-center pb-2">
                    <img 
                        src="https://www.spacexpanse.org/img/about.png" 
                        alt="SpaceXpanse Logo" 
                        className="mx-auto mb-4 w-16 h-16 rounded-2xl"
                    />
                    <CardTitle className="text-2xl font-bold text-white">ROD Wallet</CardTitle>
                    <CardDescription className="text-slate-400">
                        SpaceXpanse ROD Coin Wallet
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {generatedAddress ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-center gap-2 text-green-400">
                                <CheckCircle2 className="w-6 h-6" />
                                <span className="font-semibold">Wallet Created!</span>
                            </div>
                            
                            <div className="p-4 rounded-lg bg-slate-800/50 border border-green-500/30">
                                <p className="text-xs text-slate-400 mb-2">Your New ROD Address</p>
                                <code className="text-sm text-amber-400 font-mono break-all">
                                    {generatedAddress.address}
                                </code>
                            </div>

                            <Alert className="bg-amber-500/10 border-amber-500/30">
                                <AlertCircle className="h-4 w-4 text-amber-400" />
                                <AlertDescription className="text-amber-300/80 text-xs">
                                    Your private key is encrypted and stored securely. Never share your password!
                                </AlertDescription>
                            </Alert>

                            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Opening your wallet...
                            </div>
                        </motion.div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                                <TabsTrigger value="login" className="data-[state=active]:bg-purple-600">
                                    Login
                                </TabsTrigger>
                                <TabsTrigger value="signup" className="data-[state=active]:bg-purple-600">
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Create Wallet
                                </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="login" className="space-y-4 mt-4">
                                {showForgotPassword ? (
                                    <motion.form
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onSubmit={handleForgotPassword}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input
                                                    type="email"
                                                    value={forgotPasswordEmail}
                                                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                                    placeholder="your@email.com"
                                                    className="bg-slate-800/50 border-slate-700 text-white pl-10"
                                                    required
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                We'll send password recovery instructions to this email.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setShowForgotPassword(false);
                                                    setForgotPasswordEmail('');
                                                }}
                                                className="flex-1 border-slate-600 text-slate-300"
                                            >
                                                Back to Login
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={forgotPasswordLoading}
                                                className="flex-1 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                                            >
                                                {forgotPasswordLoading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    'Send Recovery Email'
                                                )}
                                            </Button>
                                        </div>
                                    </motion.form>
                                ) : (
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <Input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="your@email.com"
                                                className="bg-slate-800/50 border-slate-700 text-white pl-10"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="bg-slate-800/50 border-slate-700 text-white pl-10 pr-10"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white font-semibold"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Logging in...
                                            </>
                                        ) : (
                                            <>
                                                <Wallet className="w-4 h-4 mr-2" />
                                                Login to Wallet
                                            </>
                                        )}
                                    </Button>
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={() => setShowForgotPassword(true)}
                                            className="text-sm text-purple-400 hover:text-purple-300 underline"
                                        >
                                            Forgot your password?
                                        </button>
                                    </div>
                                </form>
                                )}
                            </TabsContent>
                            
                            <TabsContent value="signup" className="space-y-4 mt-4">
                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                                        <p className="text-xs text-purple-300">
                                            <Sparkles className="w-3 h-3 inline mr-1" />
                                            Creating an account will generate a unique ROD wallet address for you
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <Input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="your@email.com"
                                                className="bg-slate-800/50 border-slate-700 text-white pl-10"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Min 8 characters"
                                                className="bg-slate-800/50 border-slate-700 text-white pl-10 pr-10"
                                                required
                                                minLength={8}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Confirm Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Confirm password"
                                                className="bg-slate-800/50 border-slate-700 text-white pl-10"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white font-semibold"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Creating Wallet...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Create New Wallet
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    )}
                    
                    {error && (
                        <Alert variant="destructive" className="bg-red-900/30 border-red-500/50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}