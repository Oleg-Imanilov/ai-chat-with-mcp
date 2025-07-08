import readline from "readline";
import { highlight, success, dim, error } from "./utils.js";
import OllamaIntegration from "./OllamaIntegration.js";

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant with access to MCP (Model Context Protocol) tools and enhanced conversation memory. 
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
- Track all note names, folder paths, and other entities for future reference`

class AIChatLoop {
    constructor(client) {
        this.client = client;
        this.ollama = null;
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
            if (err.code === -32601) {
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
            if (err.code === -32601) {
                console.log(error("Prompts not supported by this MCP server."));
            } else {
                console.log(error("Error listing prompts:", err.message));
            }
        }
    }

    handleModelCommand(parts) {
        if (parts.length < 2) {
            console.log("Usage: /model <model-name>");
            console.log("Example: /model llama3.2");
            return;
        }
        const newModel = parts[1];
        try {
            this.ollama.setModel(newModel);
            console.log(success(`Switched to model: ${newModel}`));
        } catch (err) {
            console.log(error(`Error switching to model ${newModel}:`, err.message));
        }
    }

    handleClearCommand() {
        this.ollama.clearHistory();
        console.log(success("Conversation history cleared! 🧹"));
    }

    handleContextCommand() {
        const recentNotes = this.ollama.getRecentEntities('note', 10);
        const recentFolders = this.ollama.getRecentEntities('folder', 5);
        const conversationLength = this.ollama.conversationHistory.length;
        
        console.log(success("\n📊 Current Context Information:"));
        console.log(`\n💬 Conversation: ${conversationLength} messages stored`);
        
        if (recentNotes.length > 0) {
            console.log(`\n📝 Recently mentioned notes (${recentNotes.length}):`);
            recentNotes.forEach((note, i) => {
                console.log(`  ${i + 1}. ${highlight(note.name)} - mentioned ${note.frequency} time(s), last: ${new Date(note.lastMentioned).toLocaleString()}`);
            });
        } else {
            console.log("\n📝 No notes mentioned yet");
        }
        
        if (recentFolders.length > 0) {
            console.log(`\n📁 Recently mentioned folders (${recentFolders.length}):`);
            recentFolders.forEach((folder, i) => {
                console.log(`  ${i + 1}. ${highlight(folder.path)} - mentioned ${folder.frequency} time(s), last: ${new Date(folder.lastMentioned).toLocaleString()}`);
            });
        } else {
            console.log("\n📁 No folders mentioned yet");
        }
        
        console.log(`\n💡 You can now use contextual references like "update mentioned note" or "delete that note"`);
    }

    handleDebugCommand(parts) {
        if (parts.length < 2) {
            const currentState = this.ollama.debugLogging ? "enabled" : "disabled";
            console.log(`Debug logging is currently ${highlight(currentState)}`);
            console.log("Usage: /debug <on|off>");
            return;
        }

        const action = parts[1].toLowerCase();
        if (action === 'on' || action === 'enable' || action === 'true') {
            this.ollama.setDebugLogging(true);
            console.log(success("🐛 Debug logging enabled - internal LLM calls will now be shown in gray"));
        } else if (action === 'off' || action === 'disable' || action === 'false') {
            this.ollama.setDebugLogging(false);
            console.log(success("🐛 Debug logging disabled - internal LLM calls will be hidden"));
        } else {
            console.log(error("Invalid option. Use 'on' or 'off'"));
        }
    }

    async run() {
        console.log(success("\n=== Starting AI-powered MCP Chat ==="));

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
  • Use ${highlight("/context")} to see what the system remembers`);
        
        this.showHelp();

        // Initialize Ollama
        this.ollama = new OllamaIntegration({
            maxContextLength: 500, // Increased context retention
            systemPrompt: DEFAULT_SYSTEM_PROMPT
        });

        const initialized = await this.ollama.initialize();
        if (!initialized) {
            console.log(error("Failed to initialize Ollama. Make sure Ollama is running on your system."));
            console.log("You can download and install Ollama from: https://ollama.ai");
            return;
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = async () => {
            rl.question(highlight("You: "), async (input) => {
                const trimmedInput = input.trim();
                
                if (trimmedInput.toLowerCase() === "/exit") {
                    console.log(success("Goodbye! 👋"));
                    rl.close();
                    process.exit(0);
                }

                // Handle special commands
                if (trimmedInput.startsWith("/")) {
                    const parts = trimmedInput.split(" ");
                    const command = parts[0].toLowerCase();

                    switch (command) {
                        case "/help":
                            this.showHelp();
                            break;

                        case "/tools":
                            await this.handleToolsCommand();
                            break;

                        case "/resources":
                            await this.handleResourcesCommand();
                            break;

                        case "/prompts":
                            await this.handlePromptsCommand();
                            break;

                        case "/model":
                            this.handleModelCommand(parts);
                            break;

                        case "/clear":
                            this.handleClearCommand();
                            break;

                        case "/context":
                            this.handleContextCommand();
                            break;

                        case "/debug":
                            this.handleDebugCommand(parts);
                            break;

                        default:
                            console.log(error(`Unknown command: ${command}. Type '/help' for available commands.`));
                    }

                    askQuestion();
                    return;
                }

                // Generate AI response with proactive tool execution
                try {
                    console.log(highlight("\nAI: "), "Thinking...");
                    
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

    showHelp() {
        console.log(`
📋 Commands:
  /tools - List available MCP tools
  /resources - List available MCP resources
  /prompts - List available prompts
  /model <model-name> - Switch Ollama model
  /clear - Clear conversation history
  /context - Show tracked entities and recent conversation
  /debug <on|off> - Toggle debug logging for internal LLM calls
  /exit - Exit the chat
  /help - Show this help message

✨ Examples of natural requests:
  'Create a note called meeting with agenda items'
  'Show me all my notes'
  'Analyze all my notes'
  'Update my project note with new deadline'
  'Delete the old meeting note'
  'Update mentioned note' (uses conversation context!)
  'Delete that note' (references previous note!)
  'What resources do we have access to?'

🧠 The system automatically detects tool usage and executes them first!
🤖 Then the AI analyzes the results and gives you human-readable responses!
📝 It remembers entities from your conversation for contextual commands!

🚀 Just type naturally - tools are detected and executed automatically!`);
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
export default AIChatLoop;
