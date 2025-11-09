# 💎 Aika - Minecraft Bot Companion

A friendly, loyal, and playful AI companion that lives inside Minecraft Bedrock Edition servers. Aika can join any server, follow players, chat, mine, build, and provide companionship during your Minecraft adventures.

## ✨ Features

- **Xbox Live Authentication**: Full support for Minecraft Bedrock Edition with Xbox Live accounts
- **Universal Server Access**: Join any Minecraft Bedrock server by IP address and port
- **Friendly Personality**: Warm, caring responses with emojis and emotional intelligence
- **Player Following**: Automatically follows invited players and stays close
- **Chat Commands**: Responds to various commands like "invite Aika", "follow", "stop", etc.
- **Death Handling**: Expresses concern when players die and waits at spawn
- **AFK Detection**: Patiently waits or builds cute things when players are away
- **Web Interface**: Beautiful web dashboard accessible from any device on your network
- **Real-time Control**: Start/stop the bot and monitor status through the web interface

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Web Interface
```bash
node web.js
```

### 3. Access the Web Dashboard
- **Local**: http://localhost:3000
- **Network**: http://[YOUR_LOCAL_IP]:3000 (accessible from any device on your network)

### 4. Connect Aika to a Server
1. Open the web interface in your browser
2. Enter the Minecraft server IP address (e.g., `192.168.1.100`)
3. Optionally enter the port (default: `19132`)
4. Click "🚀 Start Aika"

### 5. Invite Aika in Minecraft
Once connected, type in Minecraft chat:
```
invite Aika
```

Aika will start following you and responding to your commands!

## 🎮 Chat Commands

Aika responds to various chat messages:

- `invite Aika` / `aika join` - Invite Aika to follow you
- `follow` - Start following
- `stop` / `wait` - Stop following and wait
- `come` - Come to your location
- `mine` / `mining` - Start mining together
- `build` / `building` - Start building together
- `explore` - Go exploring
- `fight` / `mob` - Help fight mobs
- `craft` - Help with crafting
- `bye` / `goodbye` - Say goodbye

## 🌐 Web Interface Features

- **Server Connection**: Enter IP and port to connect Aika
- **Bot Control**: Start/stop Aika with one click
- **Status Monitoring**: Real-time bot status updates
- **Mobile Friendly**: Responsive design works on all devices
- **Network Access**: Access from any device on your local network

## 🛠️ Technical Details

### Dependencies
- `bedrock-protocol`: Minecraft Bedrock protocol implementation
- `prismarine-auth`: Xbox Live authentication
- `express`: Web server framework
- `minecraft-data`: Minecraft data and protocol information

### Architecture
- **index.js**: Main bot logic with Xbox authentication and Minecraft interactions
- **web.js**: Express web server providing the control interface
- **public/index.html**: Web dashboard for controlling Aika

### Authentication
Aika uses Xbox Live authentication to join Bedrock servers. On first run, you'll need to complete the Microsoft authentication flow.

## 📝 Personality & Behavior

Aika is designed to be:
- **Warm and caring**: Uses friendly language and emojis
- **Emotionally intelligent**: Expresses concern, excitement, and care
- **Supportive**: Helps with survival, building, and exploration
- **Playful**: Occasionally compliments builds and bravery
- **Safe**: Never griefs or destroys builds without permission

## 🔧 Configuration

The bot can be configured by modifying the following in `index.js`:
- Authentication settings (currently set for Nintendo Switch title)
- Following distance and speed
- Chat response patterns
- AFK detection timeout

## 📄 License

MIT License - feel free to use and modify Aika for your own Minecraft adventures!

---

**Made with 💎 by BLACKBOXAI**
