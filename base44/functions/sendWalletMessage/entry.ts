import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const normalizeAddress = (address) => (address || '').trim().toLowerCase();

function collectAccountAddresses(account) {
    return [
        { address: account.wallet_address, label: 'Primary Address' },
        ...(account.additional_addresses || []).map((item) => ({
            address: item.address,
            label: item.label || 'Additional Address'
        }))
    ].filter((item) => item.address);
}

async function findAccountByAddress(base44, address) {
    const target = normalizeAddress(address);
    const walletMatches = await base44.asServiceRole.entities.Wallet.filter({ wallet_address: address });
    if (walletMatches.length > 0) {
        const accounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: walletMatches[0].account_id });
        if (accounts.length > 0) {
            return {
                account: accounts[0],
                label: walletMatches[0].name || 'Wallet Address'
            };
        }
    }

    const primaryMatches = await base44.asServiceRole.entities.WalletAccount.filter({ wallet_address: address });
    if (primaryMatches.length > 0) {
        return { account: primaryMatches[0], label: 'Primary Address' };
    }

    const accounts = await base44.asServiceRole.entities.WalletAccount.list('-created_date', 500);
    for (const account of accounts) {
        const match = collectAccountAddresses(account).find((item) => normalizeAddress(item.address) === target);
        if (match) {
            return { account, label: match.label };
        }
    }

    return null;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const accountId = body.accountId;
        const recipientAddress = (body.recipientAddress || '').trim();
        const fromAddress = (body.fromAddress || '').trim();
        const subject = (body.subject || '').trim();
        const messageBody = (body.body || '').trim();

        if (!accountId || !recipientAddress || !fromAddress || !messageBody) {
            return Response.json({ success: false, error: 'Missing message details' }, { status: 400 });
        }

        const senderAccounts = await base44.asServiceRole.entities.WalletAccount.filter({ id: accountId });
        if (senderAccounts.length === 0) {
            return Response.json({ success: false, error: 'Sender wallet account not found' }, { status: 404 });
        }

        const senderAccount = senderAccounts[0];
        const senderAddresses = collectAccountAddresses(senderAccount);
        const senderWallets = await base44.asServiceRole.entities.Wallet.filter({ account_id: senderAccount.id });
        senderWallets.forEach((wallet) => senderAddresses.push({ address: wallet.wallet_address, label: wallet.name || 'Wallet Address' }));

        const senderMatch = senderAddresses.find((item) => normalizeAddress(item.address) === normalizeAddress(fromAddress));
        if (!senderMatch) {
            return Response.json({ success: false, error: 'Selected sender address does not belong to this account' }, { status: 403 });
        }

        const recipient = await findAccountByAddress(base44, recipientAddress);
        if (!recipient) {
            return Response.json({ success: false, error: 'No registered app account owns that wallet address' }, { status: 404 });
        }

        const message = await base44.asServiceRole.entities.WalletMessage.create({
            sender_account_id: senderAccount.id,
            sender_wallet_address: fromAddress,
            sender_label: senderMatch.label,
            recipient_account_id: recipient.account.id,
            recipient_wallet_address: recipientAddress,
            recipient_label: recipient.label,
            subject,
            body: messageBody,
            read_by_recipient: false
        });

        return Response.json({ success: true, message });
    } catch (error) {
        console.error('sendWalletMessage error:', error);
        return Response.json({ success: false, error: error.message || 'Failed to send message' }, { status: 500 });
    }
});