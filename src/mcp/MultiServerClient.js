import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Multi-server client wrapper
export default class MultiServerClient {
    constructor() {
        this.servers = new Map();
        this.serverNames = [];
    }

    async addServer(name, serverConfig) {
        try {
            console.log(`Connecting to MCP server: ${name}...`);
            
            const transport = new StdioClientTransport({
                command: serverConfig.command,
                args: serverConfig.args,
                cwd: serverConfig.cwd
            });

            const client = new Client({ name: "example-client", version: "1.0.0" }, { capabilities: {} });
            await client.connect(transport);
            
            this.servers.set(name, client);
            this.serverNames.push(name);
            
            console.log(`Connected to ${name} successfully!`);
            return client;
        } catch (error) {
            console.error(`Failed to connect to ${name}:`, error.message);
            throw error;
        }
    }

    // Aggregate tools from all servers
    async listTools() {
        const allTools = [];
        for (const [serverName, client] of this.servers) {
            try {
                const { tools } = await client.listTools();
                tools.forEach(tool => {
                    allTools.push({
                        ...tool,
                        serverName, // Add server name to identify which server provides this tool
                        qualifiedName: `${serverName}.${tool.name}`
                    });
                });
            } catch (error) {
                console.warn(`Failed to get tools from ${serverName}:`, error.message);
            }
        }
        return { tools: allTools };
    }

    // Aggregate resources from all servers
    async listResources() {
        const allResources = [];
        for (const [serverName, client] of this.servers) {
            try {
                const { resources } = await client.listResources();
                resources.forEach(resource => {
                    allResources.push({
                        ...resource,
                        serverName,
                        qualifiedUri: `${serverName}:${resource.uri}`
                    });
                });
            } catch (error) {
                console.warn(`Failed to get resources from ${serverName}:`, error.message);
            }
        }
        return { resources: allResources };
    }

    // Aggregate prompts from all servers
    async listPrompts() {
        const allPrompts = [];
        for (const [serverName, client] of this.servers) {
            try {
                const { prompts } = await client.listPrompts();
                prompts.forEach(prompt => {
                    allPrompts.push({
                        ...prompt,
                        serverName,
                        qualifiedName: `${serverName}.${prompt.name}`
                    });
                });
            } catch (error) {
                console.warn(`Failed to get prompts from ${serverName}:`, error.message);
            }
        }
        return { prompts: allPrompts };
    }

    // Call tool on appropriate server
    async callTool({ name, arguments: args }) {
        // Check if tool name is qualified (server.tool)
        let serverName, toolName;
        if (name.includes('.')) {
            [serverName, toolName] = name.split('.', 2);
        } else {
            // Find which server has this tool
            const allTools = await this.listTools();
            const tool = allTools.tools.find(t => t.name === name);
            if (!tool) {
                throw new Error(`Tool ${name} not found on any server`);
            }
            serverName = tool.serverName;
            toolName = name;
        }

        const client = this.servers.get(serverName);
        if (!client) {
            throw new Error(`Server ${serverName} not found`);
        }

        return await client.callTool({ name: toolName, arguments: args });
    }

    // Read resource from appropriate server
    async readResource({ uri }) {
        // Check if URI is qualified (server:uri)
        let serverName, resourceUri;
        if (uri.includes(':')) {
            const colonIndex = uri.indexOf(':');
            const possibleServerName = uri.substring(0, colonIndex);
            if (this.servers.has(possibleServerName)) {
                serverName = possibleServerName;
                resourceUri = uri.substring(colonIndex + 1);
            } else {
                // Not a qualified URI, try to find which server has this resource
                const allResources = await this.listResources();
                const resource = allResources.resources.find(r => r.uri === uri);
                if (!resource) {
                    throw new Error(`Resource ${uri} not found on any server`);
                }
                serverName = resource.serverName;
                resourceUri = uri;
            }
        } else {
            // Find which server has this resource
            const allResources = await this.listResources();
            const resource = allResources.resources.find(r => r.uri === uri);
            if (!resource) {
                throw new Error(`Resource ${uri} not found on any server`);
            }
            serverName = resource.serverName;
            resourceUri = uri;
        }

        const client = this.servers.get(serverName);
        if (!client) {
            throw new Error(`Server ${serverName} not found`);
        }

        return await client.readResource({ uri: resourceUri });
    }

    // Get prompt from appropriate server
    async getPrompt({ name, arguments: args }) {
        // Similar logic to callTool
        let serverName, promptName;
        if (name.includes('.')) {
            [serverName, promptName] = name.split('.', 2);
        } else {
            const allPrompts = await this.listPrompts();
            const prompt = allPrompts.prompts.find(p => p.name === name);
            if (!prompt) {
                throw new Error(`Prompt ${name} not found on any server`);
            }
            serverName = prompt.serverName;
            promptName = name;
        }

        const client = this.servers.get(serverName);
        if (!client) {
            throw new Error(`Server ${serverName} not found`);
        }

        return await client.getPrompt({ name: promptName, arguments: args });
    }

    // Get server capabilities (from primary server or all servers)
    getServerCapabilities() {
        const capabilities = {};
        for (const [serverName, client] of this.servers) {
            capabilities[serverName] = client.getServerCapabilities();
        }
        return capabilities;
    }

    // Get list of connected servers
    getServerNames() {
        return [...this.serverNames];
    }

    // Get specific server client
    getServer(name) {
        return this.servers.get(name);
    }
}

