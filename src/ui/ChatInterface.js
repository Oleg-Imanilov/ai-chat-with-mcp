import readline from "readline";
import { highlight, success, dim, error } from "./utils.js";
import OllamaIntegration from "../ai/OllamaIntegration.js";
import CommandHandler from "../commands/CommandHandler.js";
import { DEFAULTS, COMMANDS, UI_MESSAGES } from "../config/constants.js";

class ChatInterface {
    constructor(client, configManager) {
        this.client = client;
        this.configManager = configManager;
        this.ollama = null;
        this.commandHandler = null;
    }

    async run() {
        console.log(success(UI_MESSAGES.STARTING_CHAT));

        console.log(`
🤖 This chat automatically detects and executes MCP tools based on your requests!
✨ Examples of what you can say:
   ${highlight("Create a note called 'meeting' with content 'Team sync at 2pm'")}
   ${highlight("Show me all my notes")}
   ${highlight("Analyze all my notes")}
   ${highlight("Get the note called 'meeting'")}
   ${highlight("Update my meeting note with 'Rescheduled to 3pm'")}
   ${highlight("Delete the old note")}
   ${highlight("Update mentioned note with new content")} (uses conversation context!)
   ${highlight("Delete that note")} (references previously discussed note!)
   ${highlight("What resources are available?")}

🧠 Enhanced Context Features:
  • The system automatically detects when you want to use tools (like "analyze all my notes")
  • Tools are executed first, then the AI analyzes the results for you
  • You get human-readable responses from the AI, not raw tool output
  • The system remembers note names, folders, and entities from your conversation
  • You can say "update mentioned note" and it will know which note you mean
  • References like "that note", "it", "the one we discussed" work with context
  • Use ${highlight(COMMANDS.CONTEXT)} to see what the system remembers`);
        
        // Initialize Ollama with configuration
        this.ollama = new OllamaIntegration({
            host: this.configManager.getOllamaHost(),
            model: this.configManager.getDefaultModel(),
            maxContextLength: DEFAULTS.INCREASED_CONTEXT_LENGTH,
            systemPrompt: this.configManager.getSystemPrompt()
        });

        // Initialize command handler
        this.commandHandler = new CommandHandler(this.client, this.ollama);

        const initialized = await this.ollama.initialize();
        if (!initialized) {
            console.log(error(UI_MESSAGES.OLLAMA_INIT_FAILED));
            console.log(UI_MESSAGES.OLLAMA_DOWNLOAD_LINK);
            return;
        }

        // Show help initially
        this.commandHandler.infoCommands.showHelp();

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = async () => {
            rl.question(highlight("You: "), async (input) => {
                const trimmedInput = input.trim();
                
                if (trimmedInput.toLowerCase() === COMMANDS.EXIT) {
                    console.log(success(UI_MESSAGES.GOODBYE));
                    rl.close();
                    process.exit(0);
                }

                // Handle special commands
                if (trimmedInput.startsWith("/")) {
                    await this.commandHandler.handleCommand(trimmedInput);
                    askQuestion();
                    return;
                }

                // Generate AI response with proactive tool execution
                try {
                    console.log(highlight("\nAI: "), UI_MESSAGES.THINKING);
                    
                    // First, check if the user's message suggests tool usage and execute if needed
                    const toolExecutionResult = await this.proactiveToolExecution(trimmedInput);
                    
                    let response;
                    if (toolExecutionResult) {
                        // Tool was executed - generate AI response using the tool result as context
                        response = await this.ollama.generateResponseWithToolContext(
                            trimmedInput, 
                            toolExecutionResult, 
                            this.client
                        );
                    } else {
                        // No tool execution - generate normal response
                        response = await this.ollama.generateResponse(trimmedInput, this.client);
                    }
                    
                    // Clear the "Thinking..." line and show the response
                    process.stdout.write("\r\x1b[K"); // Clear current line
                    console.log(highlight("AI: ") + response);

                } catch (err) {
                    console.log(error("Error generating response:", err.message));
                }

                console.log(); // Add some spacing
                askQuestion();
            });
        };

        askQuestion();
    }

    async proactiveToolExecution(userMessage) {
        try {
            // Use the ollama integration to analyze and execute tools proactively
            const toolExecutionResult = await this.ollama.analyzeAndExecuteTools(userMessage, this.client);
            
            if (toolExecutionResult) {
                if(this.ollama.debugLogging) {
                    console.log(highlight("\n🔧 Tool executed: ") + dim(toolExecutionResult.formatted));
                }
                return toolExecutionResult;
            }
            
            return null;
        } catch (error) {
            console.error('Error in proactive tool execution:', error.message);
            return null;
        }
    }
}

// Default export
export default ChatInterface;
