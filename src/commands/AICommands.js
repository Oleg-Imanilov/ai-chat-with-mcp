import { highlight, success, error } from "../ui/utils.js";
import { UI_MESSAGES, DEBUG_ACTIONS, DEFAULTS } from "../config/constants.js";

export default class AICommands {
    constructor(ollama) {
        this.ollama = ollama;
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
        console.log(success(UI_MESSAGES.HISTORY_CLEARED));
    }

    handleContextCommand() {
        const conversationLength = this.ollama.conversationHistory.length;
        
        console.log(success("\n📊 Current Context Information:"));
        console.log(`\n💬 Conversation: ${conversationLength} messages stored`);
        
        if (conversationLength > 0) {
            console.log(`\n📝 Recent conversation history (last ${Math.min(5, conversationLength)} messages):`);
            const recentHistory = this.ollama.conversationHistory.slice(-5);
            recentHistory.forEach((msg, i) => {
                const timestamp = new Date(msg.timestamp).toLocaleString();
                const preview = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content;
                console.log(`  ${i + 1}. ${highlight(msg.role.toUpperCase())} (${timestamp}): ${preview}`);
            });
        } else {
            console.log("\n� No conversation history yet");
        }
        
        console.log(UI_MESSAGES.CONTEXT_REFERENCE_TIP);
    }

    handleDebugCommand(parts) {
        if (parts.length < 2) {
            const currentState = this.ollama.debugLogging ? "enabled" : "disabled";
            console.log(`Debug logging is currently ${highlight(currentState)}`);
            console.log("Usage: /debug <on|off>");
            return;
        }

        const action = parts[1].toLowerCase();
        if (DEBUG_ACTIONS.ON.includes(action)) {
            this.ollama.setDebugLogging(true);
            console.log(success(UI_MESSAGES.DEBUG_ENABLED));
        } else if (DEBUG_ACTIONS.OFF.includes(action)) {
            this.ollama.setDebugLogging(false);
            console.log(success(UI_MESSAGES.DEBUG_DISABLED));
        } else {
            console.log(error("Invalid option. Use 'on' or 'off'"));
        }
    }
}
