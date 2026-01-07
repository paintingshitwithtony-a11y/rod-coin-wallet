import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { host, port, openPort } = await req.json();

        if (!host || !port) {
            return Response.json({ 
                error: 'Host and port are required' 
            }, { status: 400 });
        }

        // If openPort is requested, try to open the port via firewall
        if (openPort) {
            try {
                const osType = Deno.build.os;
                let command;
                let args;

                if (osType === 'windows') {
                    // Windows Firewall rule
                    command = 'netsh';
                    args = [
                        'advfirewall', 'firewall', 'add', 'rule',
                        `name=ROD Port ${port}`,
                        'dir=in',
                        'action=allow',
                        'protocol=TCP',
                        `localport=${port}`
                    ];
                } else if (osType === 'linux') {
                    // Try ufw first (Ubuntu/Debian)
                    command = 'ufw';
                    args = ['allow', port];
                } else if (osType === 'darwin') {
                    // macOS - requires editing pf.conf or using socketfilterfw
                    return Response.json({
                        open: false,
                        host,
                        port,
                        message: 'Automatic port opening not supported on macOS. Please configure manually in System Preferences > Security & Privacy > Firewall'
                    });
                }

                const cmd = new Deno.Command(command, { args });
                const output = await cmd.output();

                if (output.success) {
                    // Wait a moment for the firewall to update
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    return Response.json({
                        open: true,
                        host,
                        port,
                        message: `Firewall rule added successfully. Port ${port} is now open.`,
                        firewallModified: true
                    });
                } else {
                    const errorText = new TextDecoder().decode(output.stderr);
                    return Response.json({
                        open: false,
                        host,
                        port,
                        message: `Failed to open port: ${errorText || 'Permission denied. May require administrator/root access.'}`,
                        firewallModified: false
                    });
                }
            } catch (err) {
                return Response.json({
                    open: false,
                    host,
                    port,
                    message: `Cannot modify firewall: ${err.message}. This feature requires system permissions that may not be available in this environment.`,
                    firewallModified: false
                });
            }
        }

        // Regular port check
        try {
            // Attempt to connect to the port
            const conn = await Deno.connect({ 
                hostname: host, 
                port: parseInt(port),
                transport: "tcp"
            });
            
            conn.close();
            
            return Response.json({ 
                open: true,
                host,
                port,
                message: 'Port is open and accepting connections'
            });

        } catch (err) {
            return Response.json({ 
                open: false,
                host,
                port,
                message: err.message.includes('ECONNREFUSED') 
                    ? 'Port is closed or no service is listening'
                    : err.message.includes('timeout')
                    ? 'Connection timeout - port may be filtered'
                    : `Connection failed: ${err.message}`
            });
        }

    } catch (error) {
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});