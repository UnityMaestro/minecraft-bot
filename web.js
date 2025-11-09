const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Store bot process and server process
let botProcess = null;
let serverProcess = null;

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/start-bot', (req, res) => {
    const { ip, port, createServer } = req.body;

    let serverIP = ip;
    let serverPort = port || '19132';

    // If createServer is true and no IP provided, start local server
    if (createServer && !ip) {
        // Start local Minecraft Bedrock server
        if (!serverProcess) {
            console.log('Starting local Minecraft Bedrock server...');
            // Assuming BDS is installed in a 'bedrock-server' directory
            // Note: You need to download and install Minecraft Bedrock Dedicated Server separately
            serverProcess = spawn('./bedrock-server/bedrock_server.exe', [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: __dirname
            });

            serverProcess.stdout.on('data', (data) => {
                console.log('Server output:', data.toString());
            });

            serverProcess.stderr.on('data', (data) => {
                console.error('Server error:', data.toString());
            });

            serverProcess.on('close', (code) => {
                console.log(`Server process exited with code ${code}`);
                serverProcess = null;
            });

            // Wait a bit for server to start
            setTimeout(() => {
                serverIP = '127.0.0.1';
                serverPort = '19132';
                startBot();
            }, 5000);
        } else {
            serverIP = '127.0.0.1';
            serverPort = '19132';
            startBot();
        }
    } else {
        if (!serverIP) {
            return res.status(400).json({ error: 'Server IP is required' });
        }
        startBot();
    }

    function startBot() {
        // Kill existing bot process if running
        if (botProcess) {
            botProcess.kill();
        }

        // Start new bot process with server details
        botProcess = spawn('node', ['index.js', serverIP, serverPort], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: __dirname
        });

        let output = '';
        let errorOutput = '';

        botProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log('Bot output:', data.toString());
        });

        botProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('Bot error:', data.toString());
        });

        botProcess.on('close', (code) => {
            console.log(`Bot process exited with code ${code}`);
        });

        res.json({
            message: `Bot started successfully! Aika is attempting to connect to ${serverIP}:${serverPort}`,
            status: 'started',
            serverIP: serverIP,
            serverPort: serverPort
        });
    }
});

app.post('/stop-bot', (req, res) => {
    if (botProcess) {
        botProcess.kill();
        botProcess = null;
    }

    // Also stop server if running
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }

    res.json({ message: 'Aika and server have been stopped', status: 'stopped' });
});

app.post('/reset-bot', (req, res) => {
    console.log('Resetting bot...');
    if (botProcess) {
        botProcess.kill();
        botProcess = null;
    }

    setTimeout(() => {
        // Start with default Aternos server
        botProcess = spawn('node', ['index.js', 'd4uliveQVBC.aternos.me', '48770'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: __dirname
        });

        let output = '';
        let errorOutput = '';

        botProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log('Bot output:', data.toString());
        });

        botProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('Bot error:', data.toString());
        });

        botProcess.on('close', (code) => {
            console.log(`Bot process exited with code ${code}`);
        });

        res.json({ message: 'Aika has been reset and restarted on Aternos server', status: 'reset' });
    }, 1000);
});

app.get('/bot-status', (req, res) => {
    const isRunning = botProcess && !botProcess.killed;
    res.json({
        running: isRunning,
        pid: isRunning ? botProcess.pid : null
    });
});

// Create public directory and HTML file
const fs = require('fs');
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aika - Minecraft Bot Companion</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        h1 {
            color: #333;
            margin-bottom: 0.5rem;
        }
        .subtitle {
            color: #666;
            margin-bottom: 2rem;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
            box-sizing: border-box;
        }
        input:focus {
            border-color: #667eea;
            outline: none;
        }
        .button-group {
            display: flex;
            gap: 1rem;
            margin-top: 1.5rem;
        }
        button {
            flex: 1;
            padding: 0.75rem;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .start-btn {
            background-color: #28a745;
            color: white;
        }
        .start-btn:hover {
            background-color: #218838;
        }
        .stop-btn {
            background-color: #dc3545;
            color: white;
        }
        .stop-btn:hover {
            background-color: #c82333;
        }
        .status {
            margin-top: 1.5rem;
            padding: 1rem;
            border-radius: 5px;
            display: none;
        }
        .status.success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .features {
            text-align: left;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #eee;
        }
        .features h3 {
            color: #333;
            margin-bottom: 1rem;
        }
        .features ul {
            list-style: none;
            padding: 0;
        }
        .features li {
            margin-bottom: 0.5rem;
            padding-left: 1.5rem;
            position: relative;
        }
        .features li:before {
            content: "💎";
            position: absolute;
            left: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💎 Aika</h1>
        <p class="subtitle">Your Friendly Minecraft Bot Companion</p>

        <form id="botForm">
            <div class="form-group">
                <label for="serverIP">Server IP Address:</label>
                <input type="text" id="serverIP" name="ip" placeholder="e.g., 192.168.1.100 (leave empty to create server)">
            </div>
            <div class="form-group">
                <label for="serverPort">Server Port (optional):</label>
                <input type="number" id="serverPort" name="port" placeholder="19132" value="19132">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="createServer" name="createServer"> Create local server if no IP provided
                </label>
            </div>
            <div class="button-group">
                <button type="submit" class="start-btn">🚀 Start Aika</button>
                <button type="button" id="stopBtn" class="stop-btn">⏹️ Stop Aika</button>
            </div>
        </form>

        <div id="statusMessage" class="status"></div>

        <div class="features">
            <h3>✨ Features</h3>
            <ul>
                <li>Xbox Live Authentication for Bedrock Edition</li>
                <li>Dynamic server joining via IP address</li>
                <li>Friendly personality with caring responses</li>
                <li>Player following and companionship</li>
                <li>Chat commands: invite Aika, follow, stop, etc.</li>
                <li>Death handling and AFK detection</li>
                <li>Mining, building, fighting, and crafting support</li>
            </ul>
        </div>
    </div>

    <script>
        const form = document.getElementById('botForm');
        const stopBtn = document.getElementById('stopBtn');
        const statusMessage = document.getElementById('statusMessage');

        function showStatus(message, type = 'success') {
            statusMessage.textContent = message;
            statusMessage.className = 'status ' + type;
            statusMessage.style.display = 'block';
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 5000);
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const ip = formData.get('ip');
            const port = formData.get('port');
            const createServer = formData.get('createServer') === 'on';

            try {
                const response = await fetch('/start-bot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ip, port, createServer })
                });

                const result = await response.json();

                if (response.ok) {
                    showStatus(result.message, 'success');
                } else {
                    showStatus(result.error, 'error');
                }
            } catch (error) {
                showStatus('Failed to start Aika: ' + error.message, 'error');
            }
        });

        stopBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/stop-bot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const result = await response.json();
                showStatus(result.message, 'success');
            } catch (error) {
                showStatus('Failed to stop Aika: ' + error.message, 'error');
            }
        });

        // Check bot status periodically
        setInterval(async () => {
            try {
                const response = await fetch('/bot-status');
                const status = await response.json();

                if (status.running) {
                    stopBtn.disabled = false;
                    stopBtn.textContent = '⏹️ Stop Aika';
                } else {
                    stopBtn.disabled = true;
                    stopBtn.textContent = '⏹️ Aika Stopped';
                }
            } catch (error) {
                console.error('Failed to check bot status:', error);
            }
        }, 2000);
    </script>
</body>
</html>
`;

fs.writeFileSync('public/index.html', htmlContent);

console.log('Web interface created successfully!');
console.log('Run "node web.js" to start the web server at http://localhost:3000');

app.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';

    // Find the local IP address
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
                break;
            }
        }
        if (localIP !== 'localhost') break;
    }

    console.log(`Aika Web Interface running at:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${localIP}:${PORT}`);
    console.log('Access from any device on your network using the Network URL!');
    console.log('Open your browser and navigate to either URL to control Aika!');
});
