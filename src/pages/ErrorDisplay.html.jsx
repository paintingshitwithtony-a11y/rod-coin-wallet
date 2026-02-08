<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; }
        body { background: #000; color: #ff4444; font-family: monospace; font-size: 12px; padding: 20px; }
        #errors { max-height: 100vh; overflow: auto; }
        .error { margin-bottom: 20px; border-bottom: 1px solid #666; padding-bottom: 10px; }
        .time { color: #ffff44; }
    </style>
</head>
<body>
    <h1 style="color: #ff6666; margin-bottom: 20px;">ERROR LOG</h1>
    <div id="errors"></div>
    <script>
        window.errors = [];
        
        window.addEventListener('error', (e) => {
            const msg = `[${new Date().toLocaleTimeString()}] ${e.message}\n${e.stack || ''}`;
            window.errors.push(msg);
            console.error(msg);
            updateDisplay();
        });

        window.addEventListener('unhandledrejection', (e) => {
            const msg = `[${new Date().toLocaleTimeString()}] UNHANDLED REJECTION: ${e.reason}`;
            window.errors.push(msg);
            console.error(msg);
            updateDisplay();
        });

        function updateDisplay() {
            const container = document.getElementById('errors');
            container.innerHTML = window.errors.map((err, i) => 
                `<div class="error"><span class="time">${new Date().toLocaleTimeString()}</span><br><pre>${err}</pre></div>`
            ).join('');
        }

        // Catch any immediate errors
        console.log('Error display loaded and ready');
    </script>
</body>
</html>