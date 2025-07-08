import { error } from "../ui/utils.js";
import ToolCommands from "./ToolCommands.js";
import AICommands from "./AICommands.js";
import InfoCommands from "./InfoCommands.js";

export default class CommandHandler {
    constructor(client, ollama) {
        this.client = client;
        this.ollama = ollama;
        
        // Initialize command handlers
        this.toolCommands = new ToolCommands(client);
        this.aiCommands = new AICommands(ollama);
        this.infoCommands = new InfoCommands();
    }

    async handleCommand(trimmedInput) {
        const parts = trimmedInput.split(" ");
        const command = parts[0].toLowerCase();

        switch (command) {
            case "/help":
                this.infoCommands.showHelp();
                break;

            case "/tools":
                await this.toolCommands.handleToolsCommand();
                break;

            case "/resources":
                await this.toolCommands.handleResourcesCommand();
                break;

            case "/prompts":
                await this.toolCommands.handlePromptsCommand();
                break;

            case "/model":
                this.aiCommands.handleModelCommand(parts);
                break;

            case "/clear":
                this.aiCommands.handleClearCommand();
                break;

            case "/context":
                this.aiCommands.handleContextCommand();
                break;

            case "/debug":
                this.aiCommands.handleDebugCommand(parts);
                break;

            default:
                console.log(error(`Unknown command: ${command}. Type '/help' for available commands.`));
        }
    }
}
