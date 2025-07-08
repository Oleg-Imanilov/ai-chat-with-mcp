import { highlight } from "../ui/utils.js";
import { COMMANDS, UI_MESSAGES } from "../config/constants.js";

export default class InfoCommands {
    showHelp() {
        console.log(`
📋 Commands:
  ${COMMANDS.TOOLS} - List available MCP tools
  ${COMMANDS.RESOURCES} - List available MCP resources
  ${COMMANDS.PROMPTS} - List available prompts
  ${COMMANDS.MODEL} <model-name> - Switch Ollama model
  ${COMMANDS.CLEAR} - Clear conversation history
  ${COMMANDS.CONTEXT} - Show tracked entities and recent conversation
  ${COMMANDS.DEBUG} <on|off> - Toggle debug logging for internal LLM calls
  ${COMMANDS.EXIT} - Exit the chat
  ${COMMANDS.HELP} - Show this help message

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
${UI_MESSAGES.NATURAL_TYPING_TIP}`);
    }
}
