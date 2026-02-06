import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's RPC config from WalletAccount
    const accounts = await base44.asServiceRole.entities.WalletAccount.filter({
      id: user.id
    });

    if (!accounts || accounts.length === 0) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    const account = accounts[0];
    const { rpc_host, rpc_port, rpc_username, rpc_password } = account;

    if (!rpc_host || !rpc_port) {
      return Response.json({ error: 'RPC not configured', balance: 0, success: false });
    }

    // Call RPC getbalance
    const rpcUrl = `http://${rpc_host}:${rpc_port}`;
    const auth = btoa(`${rpc_username}:${rpc_password}`);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'getbalance',
        params: [],
        id: 1
      })
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message, success: false }, { status: 400 });
    }

    const rpcBalance = data.result;

    // Update account balance in database
    await base44.asServiceRole.entities.WalletAccount.update(user.id, {
      balance: rpcBalance
    });

    return Response.json({
      success: true,
      balance: rpcBalance
    });
  } catch (error) {
    console.error('getRPCBalance error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});