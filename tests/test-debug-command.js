import AIChatLoop from '../src/AIChatLoop.js';

// Mock MCP client for testing
class MockMCPClient {
    async listTools() {
        return {
            tools: [
                {
                    name: 'create_note',
                    description: 'Create a new note',
                    serverName: 'notes-server',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            content: { type: 'string' }
                        },
                        required: ['name', 'content']
                    }
                }
            ]
        };
    }

    async listResources() {
        return { resources: [] };
    }

    async callTool(args) {
        return {
            content: [{
                text: JSON.stringify({ success: true, message: 'Note created successfully' })
            }]
        };
    }
}

async function testDebugCommand() {
    console.log("🧪 Testing debug command functionality...\n");
    
    const mockClient = new MockMCPClient();
    const chatLoop = new AIChatLoop(mockClient);
    
    // Initialize Ollama (this would normally connect to real Ollama)
    chatLoop.ollama = {
        debugLogging: false,
        setDebugLogging: (enabled) => {
            chatLoop.ollama.debugLogging = enabled;
            console.log(`Debug logging set to: ${enabled}`);
        },
        debugLog: (message, data) => {
            if (chatLoop.ollama.debugLogging) {
                const grayColor = '\x1b[90m';
                const resetColor = '\x1b[0m';
                if (data) {
                    console.log(`${grayColor}[DEBUG] ${message}${resetColor}`, data);
                } else {
                    console.log(`${grayColor}[DEBUG] ${message}${resetColor}`);
                }
            }
        }
    };
    
    console.log("1. Testing '/debug' command with no arguments:");
    chatLoop.handleDebugCommand(['debug']);
    
    console.log("\n2. Testing '/debug on' command:");
    chatLoop.handleDebugCommand(['debug', 'on']);
    
    console.log("\n3. Testing debug logging when enabled:");
    chatLoop.ollama.debugLog("This should appear in gray");
    
    console.log("\n4. Testing '/debug off' command:");
    chatLoop.handleDebugCommand(['debug', 'off']);
    
    console.log("\n5. Testing debug logging when disabled:");
    chatLoop.ollama.debugLog("This should NOT appear");
    
    console.log("\n6. Testing invalid debug command:");
    chatLoop.handleDebugCommand(['debug', 'invalid']);
    
    console.log("\n✅ Debug command test completed successfully!");
}

testDebugCommand().catch(console.error);
