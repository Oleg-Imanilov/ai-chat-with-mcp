import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class ConfigManager {
    constructor() {
        this.config = null;
        this.configPath = path.join(__dirname, '..', '..', 'config.json');
    }

    load() {
        if (this.config) {
            return this.config;
        }

        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
            return this.config;
        } catch (error) {
            console.error('Error loading configuration:', error.message);
            throw new Error(`Failed to load configuration from ${this.configPath}`);
        }
    }

    getOllamaConfig() {
        const config = this.load();
        return config.ollama || {};
    }

    getMCPConfig() {
        const config = this.load();
        return config.mcp || {};
    }

    getOllamaHost() {
        const ollamaConfig = this.getOllamaConfig();
        return ollamaConfig.host || 'http://localhost:11434';
    }

    getDefaultModel() {
        const ollamaConfig = this.getOllamaConfig();
        return ollamaConfig.defaultModel || 'llama3.2:latest';
    }

    getSystemPrompt() {
        const ollamaConfig = this.getOllamaConfig();
        return ollamaConfig.systemPrompt || this.getDefaultSystemPrompt();
    }

    getDefaultSystemPrompt() {
        return `You are an AI assistant with access to MCP (Model Context Protocol) tools and enhanced conversation memory. 
You can help users by utilizing various tools and resources available through the MCP server.

Key capabilities:
- You maintain conversation context and can reference previously mentioned items
- When users say "update mentioned note" or "delete that note", you can identify what they're referring to from the conversation history
- You automatically track note names, folder paths, and other entities mentioned in conversation
- You can extract parameters from context even when the current message is ambiguous

When a user asks for something that might require tool usage, you can suggest using specific tools.

To use a tool, you can say something like "I'll use the [tool-name] tool" or "Let me call [tool-name] with [arguments]".
Be conversational and helpful. Explain what you're doing and why certain tools might be useful.

Always be helpful and explain what tools are available and how they might help with the user's request.

Examples of contextual understanding:
- If someone mentions "meeting note" earlier, and later says "update mentioned note", you should understand they mean the meeting note
- If they ask "delete that note" after discussing a specific note, use the context to identify which note
- Track all note names, folder paths, and other entities for future reference`;
    }

    getMCPServerNames() {
        const mcpConfig = this.getMCPConfig();
        return Object.keys(mcpConfig);
    }

    getMCPServerConfig(serverName) {
        const mcpConfig = this.getMCPConfig();
        return mcpConfig[serverName] || null;
    }

    // Validate configuration
    validate() {
        const config = this.load();
        
        if (!config.ollama) {
            throw new Error('Missing ollama configuration');
        }

        if (!config.mcp) {
            throw new Error('Missing mcp configuration');
        }

        const serverNames = this.getMCPServerNames();
        if (serverNames.length === 0) {
            throw new Error('No MCP servers configured');
        }

        // Validate each server configuration
        for (const serverName of serverNames) {
            const serverConfig = this.getMCPServerConfig(serverName);
            if (!serverConfig.command) {
                throw new Error(`Missing command for server ${serverName}`);
            }
        }

        return true;
    }

    // Reload configuration
    reload() {
        this.config = null;
        return this.load();
    }
}
