import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ChatInterface from "./src/ui/ChatInterface.js";
import MultiServerClient from "./src/mcp/MultiServerClient.js";
import ConfigManager from "./src/config/ConfigManager.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize configuration manager
const configManager = new ConfigManager();


async function main() {
    try {
        // Validate and load configuration
        configManager.validate();
        const serverNames = configManager.getMCPServerNames();

        if (serverNames.length === 0) {
            console.error("No MCP servers configured in config.json");
            process.exit(1);
        }

        console.log(`Found ${serverNames.length} MCP server(s) configured: ${serverNames.join(', ')}`);

        // Create multi-server client
        const multiClient = new MultiServerClient();

        // Connect to all servers
        for (const serverName of serverNames) {
            const serverConfig = configManager.getMCPServerConfig(serverName);
            try {
                await multiClient.addServer(serverName, serverConfig);
            } catch (error) {
                console.error(`Failed to connect to ${serverName}, continuing with other servers...`);
            }
        }

        if (multiClient.servers.size === 0) {
            console.error("No servers connected successfully");
            process.exit(1);
        }

        // Start AI-powered interactive MCP chat (powered by Ollama)
        console.log(`
Successfully connected to ${multiClient.servers.size} server(s)

🤖 Starting AI-powered chat with multi-server MCP integration...
Make sure Ollama is running on your system!
If you don't have Ollama, download it from: https://ollama.ai`);
        
        const chatLoop = new ChatInterface(multiClient, configManager);
        await chatLoop.run();    

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main().catch(console.error);