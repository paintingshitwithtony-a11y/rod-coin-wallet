import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email } = await req.json();

        if (!email) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        // Find the account
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ email });

        if (accounts.length === 0) {
            // Don't reveal if email exists or not for security
            return Response.json({ 
                success: true,
                message: 'If an account exists with this email, a password reset email has been sent.'
            });
        }

        const account = accounts[0];

        // Send email with password (in production, you'd want to send a reset link instead)
        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'ROD Wallet',
            to: email,
            subject: 'ROD Wallet - Password Recovery',
            body: `
Hello,

You requested password recovery for your ROD Wallet account.

Your wallet email: ${email}

For security reasons, we recommend changing your password after logging in.

To login:
1. Go to your wallet
2. Use your email and the password you set during registration

If you did not request this, please ignore this email.

Best regards,
ROD Wallet Team
            `.trim()
        });

        return Response.json({ 
            success: true,
            message: 'Password recovery instructions have been sent to your email.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return Response.json({ 
            error: 'Failed to process request',
            message: 'If an account exists with this email, a password reset email has been sent.'
        }, { status: 500 });
    }
});