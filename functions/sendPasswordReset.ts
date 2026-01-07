import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email } = await req.json();

        if (!email) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        // Find account
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ 
            email: email.toLowerCase() 
        });

        if (accounts.length === 0) {
            return Response.json({ error: 'Account not found' }, { status: 404 });
        }

        const account = accounts[0];

        // Generate a unique reset token (valid for 1 hour)
        const resetToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

        // Store reset token in account (you could create a separate PasswordReset entity for better security)
        await base44.asServiceRole.entities.WalletAccount.update(account.id, {
            password_reset_token: resetToken,
            password_reset_expires: expiresAt
        });

        // Send email with reset instructions
        const resetUrl = `${new URL(req.url).origin}?reset=${resetToken}`;
        
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: 'ROD Wallet - Password Reset Request',
            body: `
Hello,

You requested to reset your password for your ROD Wallet account.

Your account is associated with the email: ${email}

To reset your password, please click the link below (valid for 1 hour):
${resetUrl}

If you did not request this reset, please ignore this email and your password will remain unchanged.

For security reasons, we cannot send you your current password as it is encrypted.

Best regards,
ROD Wallet Team
            `.trim()
        });

        return Response.json({ 
            success: true,
            message: 'Password reset instructions sent to your email'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});