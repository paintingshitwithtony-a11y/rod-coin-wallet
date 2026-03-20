import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { projectPath } = await req.json();

        if (!projectPath) {
            return Response.json({ error: 'Project path is required' }, { status: 400 });
        }

        // Return instructions and file contents that user needs to create
        const fileStructure = {
            success: true,
            message: 'Project structure template ready - follow the steps below',
            projectPath,
            instructions: `
## Project Setup Instructions

Your project will be created at: ${projectPath}

### Step 1: Create the folder structure
Create these folders in your project root:
- public/
- src/

### Step 2-5: Create and populate files

Copy the content below into each file:
            `,
            files: {
                'public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ROD Wallet</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
                'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`,
                'src/App.jsx': `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to ROD Wallet!</h1>
        <p>Your Electron app is almost ready.</p>
      </header>
    </div>
  );
}

export default App;`,
                'src/index.css': `/* Import Tailwind CSS */
@tailwind base;
@tailwind components;
@tailwind utilities;`,
                'src/App.css': `/* App styles */
.App {
  text-align: center;
  padding: 20px;
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}`
            },
            setupSteps: [
                {
                    step: 1,
                    title: 'Create Folder Structure',
                    description: 'In your project root, create public/ and src/ folders'
                },
                {
                    step: 2,
                    title: 'Create and Populate Files',
                    description: 'Create each file below and copy its content:',
                    files: ['public/index.html', 'src/main.jsx', 'src/App.jsx', 'src/index.css', 'src/App.css']
                },
                {
                    step: 3,
                    title: 'Install Dependencies',
                    description: 'Make sure you have downloaded package.json from Admin Panel > RPC Configuration',
                    command: 'npm install'
                },
                {
                    step: 4,
                    title: 'Download Configuration Files',
                    description: 'Get these from Admin Panel > RPC Configuration section:',
                    files: ['vite.config.js', 'electron-main.js', 'package.json (if not already done)']
                },
                {
                    step: 5,
                    title: 'Start Development Server',
                    description: 'Run your application',
                    command: 'npm start'
                }
            ],
            nextSteps: [
                'Open your project root in a terminal',
                'Create the folders and files with the content provided above',
                'Place downloaded vite.config.js and electron-main.js in your root directory',
                'Run: npm install',
                'Run: npm start'
            ]
        };

        return Response.json(fileStructure);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});