import { highlight, success, error } from "../ui/utils.js";
import { ERROR_CODES } from "../config/constants.js";

export default class ToolCommands {
    constructor(client) {
        this.client = client;
    }

    async handleToolsCommand() {
        try {
            const { tools } = await this.client.listTools();
            console.log(success("\n🔧 Available MCP tools:"));
            tools.forEach(tool => {
                console.log(`  ${tool.serverName?(tool.serverName+'.'):''}${highlight(tool.name)} - ${tool.description}`);
            });
        } catch (err) {
            console.log(error("Error listing tools:", err.message));
        }
    }

    async handleResourcesCommand() {
        try {
            const resources = await this.client.listResources();
            console.log(success("\n📚 Available MCP resources:"));
            resources.resources.forEach(resource => {
                console.log(`  ${highlight(resource.uri)} - ${resource.name || 'No name'}`);
            });
        } catch (err) {
            if (err.code === ERROR_CODES.METHOD_NOT_FOUND) {
                console.log(error("Resources not supported by this MCP server."));
            } else {
                console.log(error("Error listing resources:", err.message));
            }
        }
    }

    async handlePromptsCommand() {
        try {
            const prompts = await this.client.listPrompts();
            console.log(success("\n💬 Available MCP prompts:"));
            prompts.prompts.forEach(prompt => {
                console.log(`  ${highlight(prompt.name)} - ${prompt.description}`);
            });
        } catch (err) {
            if (err.code === ERROR_CODES.METHOD_NOT_FOUND) {
                console.log(error("Prompts not supported by this MCP server."));
            } else {
                console.log(error("Error listing prompts:", err.message));
            }
        }
    }
}
