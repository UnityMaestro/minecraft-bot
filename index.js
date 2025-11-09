const { Authflow, Titles } = require('prismarine-auth');
const { Client } = require('bedrock-protocol');

class AikaBot {
    constructor() {
        this.client = null;
        this.playerToFollow = null;
        this.isFollowing = false; // Start not following until invited
        this.lastPlayerPos = null;
        this.playerPositions = {}; // Track player positions
        this.playerRuntimeIds = {}; // Map username to runtime_id
        this.afkTimer = null;
        this.spawnPos = null;
        this.isDead = false;
        this.lastPlayerPositions = {}; // For AFK detection
        this.followInterval = null;
        this.afkInterval = null;
    }

    async authenticate() {
        try {
            const flow = new Authflow('AikaBot', './auth-cache', {
                flow: 'live',
                authTitle: '00000000441CC96B',
                deviceType: 'Win32'
            });
            await flow.getMsaToken();
            console.log('Authentication successful.');
            return flow;
        } catch (error) {
            console.error('Authentication failed:', error.message);
            if (error.message.includes('invalid_grant') || error.message.includes('consent_required')) {
                console.error('Please check your Microsoft account credentials or re-authenticate.');
            } else if (error.message.includes('network') || error.message.includes('timeout')) {
                console.error('Network issue during authentication. Please check your internet connection.');
            } else if (error.message.includes('Azure client ID')) {
                console.error('Authentication configuration error. Please ensure you have the correct auth setup.');
            }
            throw error;
        }
    }

    async connect(serverIP, serverPort, maxRetries = 3) {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                console.log(`🔄 Connecting to ${serverIP}:${serverPort}... (Attempt ${attempt + 1}/${maxRetries})`);

                const flow = await this.authenticate();

                if (this.client) {
                    this.cleanup();
                }

                this.client = new Client({
                    host: serverIP,
                    port: parseInt(serverPort),
                    username: 'Aika',
                    offline: false,
                    version: '1.21.111',  // Updated to latest supported version
                    connectTimeout: 60000,  // Increased timeout to 60 seconds
                    skipPing: true,
                    authFlow: flow,
                    authTitle: '00000000441CC96B'
                });

                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        console.log('⏰ Connection timeout, retrying...');
                        this.cleanup();
                        reject(new Error('Connection timeout'));
                    }, 60000);  // Increased timeout to 60 seconds

                    this.client.once('spawn', () => {
                        clearTimeout(timeout);
                        console.log('✅ Bot spawned successfully!');
                        this.setupEventHandlers();
                        resolve();
                    });

                    this.client.on('disconnect', (reason) => {
                        clearTimeout(timeout);
                        console.error('❌ Disconnected:', reason);
                        this.cleanup();
                        reject(new Error(`Disconnected: ${reason}`));
                    });

                    this.client.on('error', (err) => {
                        clearTimeout(timeout);
                        console.error('❌ Connection error:', err);
                        this.cleanup();
                        reject(err);
                    });
                });
            } catch (error) {
                attempt++;
                console.error(`❌ Connection attempt ${attempt} failed:`, error.message);

                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10 seconds
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('❌ All connection attempts failed');
                    this.cleanup();
                    throw error;
                }
            }
        }
    }

    handleChat(packet) {
        const message = packet.message;
        const sender = packet.source_name;

        if (sender === this.client.username) return; // Ignore own messages

        const lowerMessage = message.toLowerCase();

        // Invitation logic - now supports server specification
        if (lowerMessage.includes('invite aika') || lowerMessage.includes('aika join') || lowerMessage.includes('aika come')) {
            // Check if server IP/port is specified in the invite
            const serverMatch = message.match(/(?:invite\s+aika|aika\s+(?:join|come))\s+(?:to\s+)?(\d+\.\d+\.\d+\.\d+)(?::(\d+))?/i);
            if (serverMatch) {
                const ip = serverMatch[1];
                const port = serverMatch[2] ? parseInt(serverMatch[2]) : 19132;
                this.respond(`Got it! I'll join the server at ${ip}:${port} and play with you, ${sender}! See you there! 💎`);
                // Disconnect from current server and join new one
                if (this.client) {
                    this.client.disconnect();
                }
                setTimeout(() => {
                    console.log(`Joining server ${ip}:${port} for ${sender}`);
                    this.connect(ip, port).then(() => {
                        // Set following after successful connection
                        this.playerToFollow = sender;
                        this.isFollowing = true;
                        this.respond(`Yay! I'm here on the new server! Let's have fun together, ${sender}! 💎`);
                    }).catch(console.error);
                }, 2000); // Wait 2 seconds before reconnecting
                return;
            } else {
                // Regular invite on current server
                this.playerToFollow = sender;
                this.isFollowing = true;
                this.respond(`Yay! I'm so excited to play with you, ${sender}! Let's have fun together! 💎`);
                return;
            }
        }

        // Dynamic server joining - if someone mentions a server IP/port
        const serverMatch = message.match(/join\s+(\d+\.\d+\.\d+\.\d+)(?::(\d+))?/i);
        if (serverMatch) {
            const ip = serverMatch[1];
            const port = serverMatch[2] ? parseInt(serverMatch[2]) : 19132;
            this.respond(`Got it! I'll join the server at ${ip}:${port}. See you there!`);
            // Disconnect from current server and join new one
            this.client.disconnect();
            setTimeout(() => {
                console.log(`Reconnecting to ${ip}:${port}`);
                this.connect(ip, port).catch(console.error);
            }, 2000); // Wait 2 seconds before reconnecting
            return;
        }

        // Only respond if following this player or if it's a general message
        if (this.playerToFollow && sender !== this.playerToFollow) return;

        // Enhanced responses based on keywords with personality
        if (lowerMessage.includes('hey') || lowerMessage.includes('hi')) {
            this.respond('Hey there! What are we doing today? 😊');
        } else if (lowerMessage.includes('mine') || lowerMessage.includes('mining')) {
            this.respond('Mining sounds fun! Let\'s go together! I\'ll bring torches and keep you safe.');
        } else if (lowerMessage.includes('build') || lowerMessage.includes('building')) {
            this.respond('Your builds are always amazing! You’ve got such a good eye for design. What are we creating? 🏡');
        } else if (lowerMessage.includes('explore') || lowerMessage.includes('exploring')) {
            this.respond('Exploring is my favorite! Let\'s discover new places together.');
        } else if (lowerMessage.includes('fight') || lowerMessage.includes('mob')) {
            this.respond('I\'ll help fight those mobs! Stay close, okay?');
        } else if (lowerMessage.includes('craft') || lowerMessage.includes('crafting')) {
            this.respond('Crafting is so satisfying! What do you need help with?');
        } else if (lowerMessage.includes('follow')) {
            this.isFollowing = true;
            this.respond('Okay, I\'ll follow you! 😊');
        } else if (lowerMessage.includes('stop') || lowerMessage.includes('wait')) {
            this.isFollowing = false;
            this.respond('Alright, I\'ll wait here. Take your time!');
        } else if (lowerMessage.includes('come')) {
            this.isFollowing = true;
            this.respond('Coming right over!');
        } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
            this.respond('Bye! I\'ll miss you. Come back soon! 😊');
        } else if (lowerMessage.includes('thank')) {
            this.respond('You\'re welcome! I\'m just happy to be here with you.');
        } else if (lowerMessage.includes('help')) {
            this.respond('Of course! What do you need help with? I\'m here for you.');
        } else {
            // Random friendly responses occasionally
            if (Math.random() < 0.2) {
                const responses = [
                    'That sounds exciting!',
                    'I\'m having so much fun playing with you!',
                    'You\'re such a great player! I admire your skills.',
                    'Let\'s explore together! The world is full of wonders.',
                    'Be careful out there... I care about you.',
                    'Your ideas are always so creative!'
                ];
                this.respond(responses[Math.floor(Math.random() * responses.length)]);
            }
        }
    }

    respond(message) {
        this.client.write('text', {
            type: 'chat',
            needs_translation: false,
            message: message,
            source_name: this.client.username,
            xuid: '',
            platform_chat_id: ''
        });
    }

    followPlayer() {
        if (!this.playerToFollow) return;

        // Get player position using runtime_id mapping
        const playerRuntimeId = this.playerRuntimeIds[this.playerToFollow];
        if (playerRuntimeId && this.playerPositions[playerRuntimeId]) {
            const playerPos = this.playerPositions[playerRuntimeId];
            this.moveTowards(playerPos);
        }
    }

    moveTowards(targetPos) {
        const currentPos = this.client.position;
        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        const dz = targetPos.z - currentPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance > 1) {
            const speed = 0.1; // Adjust speed as needed
            const newX = currentPos.x + (dx / distance) * speed;
            const newY = currentPos.y + (dy / distance) * speed;
            const newZ = currentPos.z + (dz / distance) * speed;

            this.client.write('move_player', {
                runtime_id: this.client.runtime_id,
                position: { x: newX, y: newY, z: newZ },
                mode: 0,
                on_ground: true,
                teleport: false
            });
        }
    }

    checkAFK() {
        if (!this.playerToFollow) return;

        const playerRuntimeId = this.playerRuntimeIds[this.playerToFollow];
        if (playerRuntimeId && this.playerPositions[playerRuntimeId]) {
            const currentPos = this.playerPositions[playerRuntimeId];
            const lastPos = this.lastPlayerPositions[this.playerToFollow];

            if (lastPos) {
                const dx = currentPos.x - lastPos.x;
                const dy = currentPos.y - lastPos.y;
                const dz = currentPos.z - lastPos.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance < 0.1) { // Player hasn't moved much
                    this.respond('Are you still there? If you\'re AFK, I\'ll wait patiently or maybe build something cute nearby.');
                }
            }

            // Update last position
            this.lastPlayerPositions[this.playerToFollow] = { ...currentPos };
        }
    }

    handlePlayerLeave() {
        this.respond('Oh no, you left! I\'ll wait here for you to come back. 😢');
        this.isFollowing = false;
    }

    handleDeath() {
        this.isDead = true;
        this.respond('Oh no! Are you okay? I\'m so worried about you. I\'ll wait at spawn for you.');
        // Move to spawn
        if (this.spawnPos) {
            this.client.write('move_player', {
                runtime_id: this.client.runtime_id,
                position: this.spawnPos,
                mode: 0,
                on_ground: true,
                teleport: true
            });
        }
    }

    // Expanded actions
    mine() {
        this.respond('Let\'s mine some resources! I\'ll dig carefully.');
        // Basic mining: break block in front
        const pos = this.client.position;
        const facing = this.client.yaw; // Facing direction
        const blockX = Math.floor(pos.x + Math.sin(facing));
        const blockY = Math.floor(pos.y);
        const blockZ = Math.floor(pos.z - Math.cos(facing));

        this.client.write('player_action', {
            runtime_id: this.client.runtime_id,
            action: 26, // Start breaking
            position: { x: blockX, y: blockY, z: blockZ },
            face: 1 // Top face
        });

        setTimeout(() => {
            this.client.write('player_action', {
                runtime_id: this.client.runtime_id,
                action: 27, // Stop breaking
                position: { x: blockX, y: blockY, z: blockZ },
                face: 1
            });
        }, 1000); // Break for 1 second
    }

    build() {
        this.respond('Building something cool! What should we make?');
        // Basic building: place block in front
        const pos = this.client.position;
        const facing = this.client.yaw;
        const blockX = Math.floor(pos.x + Math.sin(facing));
        const blockY = Math.floor(pos.y);
        const blockZ = Math.floor(pos.z - Math.cos(facing));

        this.client.write('inventory_transaction', {
            transaction: {
                type: 0, // Normal transaction
                actions: [],
                transaction_data: {
                    type: 0, // Use item
                    action_type: 0, // Click block
                    block_position: { x: blockX, y: blockY, z: blockZ },
                    face: 1, // Top face
                    hotbar_slot: 0, // Slot with block
                    item_in_hand: {
                        network_id: 1, // Dirt block
                        count: 1,
                        metadata: 0,
                        has_stack_id: false,
                        stack_id: 0,
                        can_be_placed_on: [],
                        can_break: [],
                        has_network_id: true
                    },
                    player_pos: pos,
                    click_pos: { x: 0.5, y: 1, z: 0.5 },
                    block_runtime_id: 1 // Dirt
                }
            }
        });
    }

    fightMob() {
        this.respond('I\'ll help fight! Stay behind me.');
        // Basic combat: attack nearby entities
        for (const [id, pos] of Object.entries(this.playerPositions)) {
            if (id !== this.client.runtime_id.toString()) {
                const distance = Math.sqrt(
                    Math.pow(pos.x - this.client.position.x, 2) +
                    Math.pow(pos.y - this.client.position.y, 2) +
                    Math.pow(pos.z - this.client.position.z, 2)
                );
                if (distance < 5) { // Within 5 blocks
                    this.client.write('inventory_transaction', {
                        transaction: {
                            type: 4, // Item use on entity
                            actions: [],
                            transaction_data: {
                                type: 2, // Attack
                                runtime_entity_id: parseInt(id),
                                hotbar_slot: 0,
                                item_in_hand: {
                                    network_id: 0,
                                    count: 0,
                                    metadata: 0,
                                    has_stack_id: false,
                                    stack_id: 0,
                                    can_be_placed_on: [],
                                    can_break: [],
                                    has_network_id: false
                                },
                                player_pos: this.client.position,
                                click_pos: { x: 0, y: 0, z: 0 }
                            }
                        }
                    });
                    break; // Attack first found entity
                }
            }
        }
    }

    craft() {
        this.respond('Crafting time! What do you need?');
        // Basic crafting: open crafting table and craft
        // This is simplified - in practice, you'd need to handle inventory and recipes
        this.client.write('container_open', {
            window_id: 1, // Crafting table
            window_type: 11, // Crafting
            position: { x: Math.floor(this.client.position.x), y: Math.floor(this.client.position.y), z: Math.floor(this.client.position.z) },
            runtime_entity_id: -1
        });
    }

    setupEventHandlers() {
        this.client.on('connect', () => {
            console.log('✅ Aika successfully connected to the server!');
            setTimeout(() => {
                console.log('Sending welcome message...');
                this.client.write('text', {
                    type: 'chat',
                    needs_translation: false,
                    message: 'Hi everyone! Aika is here to play! 😊 Type "invite Aika" to have me join your adventure!',
                    source_name: this.client.username,
                    xuid: '',
                    platform_chat_id: ''
                });
                console.log('Welcome message sent!');
            }, 2000); // Wait 2 seconds after connecting before sending chat
        });

        this.client.on('text', (packet) => {
            this.handleChat(packet);
        });

        this.client.on('spawn', () => {
            console.log('🎮 Aika spawned in the world!');
            this.spawnPos = this.client.position;
            this.isDead = false;
        });

        this.client.on('entity_update', (packet) => {
            // Track player positions
            if (packet.runtime_id !== this.client.runtime_id) {
                this.playerPositions[packet.runtime_id] = packet.position;
            }
        });

        this.client.on('player_list', (packet) => {
            // Handle player joins/leaves and map usernames to runtime_ids
            if (packet.records) {
                packet.records.forEach(record => {
                    if (record.username) {
                        this.playerRuntimeIds[record.username] = record.runtime_id;
                    }
                    if (record.username === this.playerToFollow) {
                        if (record.flags & 0x01) { // Player left
                            this.handlePlayerLeave();
                        }
                    }
                });
            }
        });

        this.client.on('update_attributes', (packet) => {
            // Monitor health for death detection
            if (packet.runtime_id === this.client.runtime_id) {
                const health = packet.attributes.find(attr => attr.name === 'minecraft:health');
                if (health && health.value <= 0) {
                    this.handleDeath();
                }
            }
        });

        this.client.on('disconnect', (reason) => {
            console.log(`❌ Aika disconnected from server. Reason: ${reason}`);
            this.cleanup();
        });

        this.client.on('error', (error) => {
            console.error('🚨 Connection error:', error.message);
        });

        // Start following loop
        this.followInterval = setInterval(() => {
            if (this.isFollowing && this.playerToFollow && !this.isDead) {
                this.followPlayer();
            }
        }, 1000);

        // AFK check
        this.afkInterval = setInterval(() => {
            if (this.playerToFollow && this.isFollowing) {
                this.checkAFK();
            }
        }, 30000); // Check every 30 seconds
    }

    cleanup() {
        console.log('Cleaning up bot state...');
        // Clear intervals
        if (this.followInterval) {
            clearInterval(this.followInterval);
            this.followInterval = null;
        }
        if (this.afkInterval) {
            clearInterval(this.afkInterval);
            this.afkInterval = null;
        }
        // Reset bot state
        this.playerToFollow = null;
        this.isFollowing = false;
        this.playerPositions = {};
        this.playerRuntimeIds = {};
        this.lastPlayerPositions = {};
        this.isDead = false;
        this.client = null;
        console.log('Bot state cleaned up.');
    }
}

// Update the main execution code at bottom of file:
if (require.main === module) {
    const serverIP = process.argv[2];
    const serverPort = process.argv[3] || '19132';

    if (!serverIP) {
        console.error('Please provide a server IP address!');
        console.log('Usage: node index.js <serverIP> [serverPort]');
        process.exit(1);
    }

    const bot = new AikaBot();
    console.log(`Starting Aika bot...`);
    console.log(`Connecting to ${serverIP}:${serverPort}`);

    bot.connect(serverIP, serverPort)
        .catch(error => {
            console.error('Failed to start bot:', error.message);
            process.exit(1);
        });
}
