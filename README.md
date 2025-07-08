# AI-Powered MCP Client

This is an enhanced Model Context Protocol (MCP) client that integrates with Ollama to provide AI-powered chat capabilities with access to MCP tools and resources.

## Features

- 🤖 **AI-Powered Chat**: Natural language interactions powered by Ollama
- 🔧 **Automatic MCP Tool Usage**: Automatically detects intent and executes tools
- 🎯 **Smart Intent Recognition**: Understands natural requests like "create a note" or "show all notes"
- 🌐 **Multi-Server Support**: Connect to multiple MCP servers simultaneously
- 🧠 **Enhanced Context Memory**: Remembers entities (notes, folders) from conversation history
- 🔗 **Contextual References**: Use phrases like "update mentioned note" or "delete that note"
- 📚 **Resource Access**: Read and utilize MCP resources automatically across servers
- 💬 **Prompt Templates**: Use predefined prompts from any connected server
- 🔄 **Model Switching**: Switch between different Ollama models
- 📝 **Extended Conversation History**: Maintains up to 500 messages for better context
- 🚀 **Zero-Command Interface**: Just speak naturally - no need to learn commands!
- 🔍 **Debug Mode**: Toggle detailed logging of AI reasoning and tool selection
- 🎛️ **Smart Tool Routing**: Automatically routes tool calls to appropriate servers

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Ollama** installed and running
   - Download from: https://ollama.ai
   - Make sure it's running on `http://localhost:11434`
3. **Compatible MCP server(s)** configured in `config.json`
   - The system supports multiple MCP servers simultaneously
   - Each server should be uniquely named in the configuration
   - For simplicity, this client uses only stdio transport (not HTTP)
   - For testing and debugging, you can use the simple but fully working MCP server: https://github.com/Oleg-Imanilov/js-notes-mcp

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your settings in `config.json`
4. Make sure Ollama is running with your preferred model:
   ```bash
   ollama pull qwen2.5:latest
   ```

## Configuration

Edit `config.json` to customize your setup:

```json
{
  "ollama": {
    "host": "http://localhost:11434",
    "defaultModel": "qwen2.5:latest",
    "systemPrompt": "Your custom system prompt..."
  },
  "mcp": {
    "server-name-1": {
      "command": "node",
      "args": ["path/to/your/first-mcp-server.js"],
      "cwd": "working/directory"
    },
    "server-name-2": {
      "command": "node", 
      "args": ["path/to/your/second-mcp-server.js"],
      "cwd": "working/directory"
    }
  }
}
```

### Multi-Server Support

The client now supports connecting to multiple MCP servers simultaneously. Each server is identified by a unique name in the configuration. The system automatically:

- Aggregates tools, resources, and prompts from all connected servers
- Routes tool calls to the appropriate server
- Provides server information in tool/resource listings
- Handles server-specific failures gracefully

## Usage

### Start the AI-Powered Chat

```bash
npm start
```

or

```bash
node index.js
```

### Chat Commands

Once in the AI chat mode, you can use these commands:

- `/tools` - List available MCP tools from all connected servers
- `/resources` - List available MCP resources from all connected servers  
- `/prompts` - List available prompts from all connected servers
- `/model <model-name>` - Switch Ollama model
- `/clear` - Clear conversation history and entity tracking
- `/context` - Show tracked entities and conversation context
- `/debug <on|off>` - Toggle debug logging for internal AI calls
- `/help` - Show help message
- `/exit` - Exit the chat

## Contextual Features

The AI client now features enhanced context memory that tracks entities mentioned in your conversation:

### Entity Tracking
- **Notes**: Remembers note names when you create, update, or mention them
- **Folders**: Tracks folder paths when discussing storage locations
- **Conversation History**: Maintains up to 150 messages for deep context understanding

### Contextual References
You can now use natural references that rely on conversation context:

```
You: Create a note called "project status" with initial content
AI: ✅ Successfully created note "project status" with the content: "initial content"

You: Update mentioned note with the latest progress
AI: 🤖 Auto-executing tool: update_note with AI-extracted args: {"name": "project status"}
✅ Successfully updated note "project status" with new content: "the latest progress"

You: Delete that note
AI: 🤖 Auto-executing tool: delete_note with AI-extracted args: {"name": "project status"}  
✅ Successfully deleted note "project status"
```

### Context Commands
- Use `/context` to see what entities the system is tracking
- The system automatically remembers:
  - Note names from creation, updates, and references
  - Folder paths from configuration changes
  - Frequency of mentions and last mention times

### Smart Parameter Extraction
The AI uses the full conversation context to extract parameters:
- **"update mentioned note"** → finds the most recently discussed note
- **"delete that note"** → identifies the note from context
- **"show the project note"** → uses context if "project" was mentioned before
- **"change it to..."** → understands what "it" refers to from conversation

### Example Interactions

**Automatic Note Management:**
```
You: Create a note called "meeting agenda" with today's discussion points
AI: 🤖 Auto-executing tool: create_note
✅ Successfully created note "meeting agenda" with the content: "today's discussion points"

You: Show me all my notes
AI: 🤖 Auto-executing tool: get_all_notes  
📋 Here are all your notes (2 total):
1. **meeting agenda** (modified: 7/8/2025)
   today's discussion points
2. **project ideas** (modified: 7/6/2025)
   AI integration concepts...

You: Update mentioned note with the final decisions
AI: 🤖 Auto-executing tool: update_note with AI-extracted args: {"name": "meeting agenda"}
✅ Successfully updated note "meeting agenda" with new content: "the final decisions"
```

**Contextual References:**
```
You: Create a project note with initial brainstorming ideas
AI: ✅ Successfully created note "project" with the content: "initial brainstorming ideas"

You: Also create a budget note for the project costs
AI: ✅ Successfully created note "budget" with the content: "for the project costs"

You: Update that budget note with $50,000 estimate
AI: 🤖 Using conversation context to identify "budget" note
✅ Successfully updated note "budget" with new content: "$50,000 estimate"

You: Delete the project note, we're going with a different approach
AI: 🤖 Found "project" in conversation context
✅ Successfully deleted note "project"
```

**Context Tracking:**
```
You: /context
AI: 📊 Current Context Information:

💬 Conversation: 12 messages stored (up to 500 messages retained)

📝 Recently mentioned notes (2):
  1. budget - mentioned 2 time(s), last: 7/8/2025, 3:15:22 PM
  2. project - mentioned 3 time(s), last: 7/8/2025, 3:14:45 PM

💡 You can now use contextual references like "update mentioned note" or "delete that note"
Multi-server context tracking ensures references work across all connected servers
```

**Natural Conversation with Multi-Server Support:**
```
You: What can you help me with?
AI: I can help you manage notes, access resources, and more! I have access to tools from multiple servers. Just ask naturally like "create a note" or "show my notes".

You: Do we have any resources available?
AI: 📚 Auto-reading resources from all connected servers...
📚 Found resources from notes-server: notes://all
📚 Found resources from files-server: files://documents
📚 Resource contains data from multiple servers...
```

**Multi-Server Tool Usage:**
```
You: Create a note and also backup my files
AI: 🤖 Auto-executing tools from multiple servers:
    - notes-server.create_note with content: "backup my files"
    - files-server.backup_files with default settings
✅ Successfully created note and initiated backup across servers
```

## Available Models

The client supports any Ollama model. Popular options include:
- `qwen2.5:latest` (example from config)
- `llama3.2`
- `llama3.1`
- `mistral`
- `codellama`
- `llama2`

Switch models using `/model <model-name>` in the chat.

## Advanced Features

### Debug Mode
Use `/debug on` to enable detailed logging of internal AI reasoning and tool analysis. This helps understand how the system interprets your requests and makes tool execution decisions.

### Multi-Server Tool Routing
When multiple servers provide similar tools, the system intelligently routes requests to the most appropriate server based on context and tool capabilities.

### Enhanced Context Management
The system maintains up to 500 conversation messages (configurable) and tracks entities with sophisticated LLM-based analysis for contextual understanding.

## LLM-Powered Tool Analysis

The system uses sophisticated LLM-based analysis to understand user intent and automatically execute appropriate tools. This happens through a multi-step process:

### Intent Detection
The system analyzes user messages to determine if they indicate a desire to use MCP tools:
- **Natural Language Processing**: Uses the LLM to understand user intent from natural language
- **Context Awareness**: Considers conversation history for ambiguous references
- **Confidence Scoring**: Only executes tools when confidence is high (≥70%)

### Tool Selection and Parameter Extraction
When tool usage is detected, the system:
- **Identifies the Appropriate Tool**: Matches user intent to available tools across all servers
- **Extracts Parameters**: Uses conversation context to fill in tool parameters
- **Handles Ambiguity**: Resolves references like "that note" or "mentioned item"

### Execution Flow
1. **User Input Analysis**: LLM analyzes the user's message for tool usage intent
2. **Tool Execution**: If detected, the appropriate tool is called automatically
3. **Response Generation**: LLM creates a user-friendly response based on tool output
4. **Context Update**: Conversation history and entity tracking are updated

### Example Analysis Process
```
User: "Show me all my notes"
→ LLM detects: get_all_notes tool needed
→ System executes: get_all_notes()
→ LLM generates: "Here are all your notes: [formatted output]"
```

This creates a seamless experience where users can speak naturally without needing to know specific commands or tool names.

## Troubleshooting

### Ollama Connection Issues
- Make sure Ollama is running: `ollama serve`
- Check if your model is available: `ollama list`
- Pull the model if needed: `ollama pull qwen2.5:latest`

### MCP Server Issues
- Verify MCP server paths in `config.json`
- Check that MCP servers are executable and accessible
- Review server logs for connection errors
- Use `/debug on` to see detailed server interaction logs

### Multi-Server Issues
- If one server fails, the system continues with others
- Check individual server configurations in `config.json`
- Verify each server's command paths and working directories
- Test servers individually if experiencing issues

### AI Integration Issues
- Ensure the Ollama model supports the features you're using
- Try switching models with `/model <model-name>`
- Use `/debug on` to see AI reasoning and tool selection process
- Check conversation context with `/context` command

### Common Commands
```bash
# Check Ollama status
ollama list

# Pull a new model
ollama pull qwen2.5:latest

# Start Ollama (if not running as service)
ollama serve
```

## Architecture

The client consists of several key modules:

### Core Files
- `index.js` - Main entry point with multi-server initialization
- `config.json` - Configuration for Ollama and MCP servers

### Source Modules (`src/`)
- `AIChatLoop.js` - AI-powered chat interface with command handling
- `OllamaIntegration.js` - Advanced Ollama integration with LLM-powered tool analysis
- `MultiServerClient.js` - Multi-server MCP client wrapper and tool routing
- `client-helpers.js` - MCP client utility functions for testing and exploration
- `utils.js` - Terminal color utilities and formatting helpers

### Data Directory (`data/`)
- `notes_storage.json` - Example data storage for notes MCP server

### Test Directory (`tests/`)
- `test-auto-execution.js` - Tests for automatic tool execution
- `test-debug-command.js` - Tests for debug command functionality
- `test-debug.js` - Debug functionality tests
- `test-patterns.js` - Pattern matching tests
- `test-simple.js` - Basic functionality tests

### Key Architecture Features

#### Multi-Server Support
- **`MultiServerClient`**: Manages connections to multiple MCP servers
- **Tool Aggregation**: Combines tools from all servers with server identification
- **Smart Routing**: Routes tool calls to appropriate servers automatically
- **Graceful Degradation**: Continues working if some servers fail

#### Enhanced AI Integration  
- **`OllamaIntegration`**: Sophisticated LLM-powered tool detection and execution
- **Intent Analysis**: Uses LLM to analyze user messages for tool usage intent
- **Context Tracking**: Maintains conversation history and entity mentions
- **Auto-execution**: Automatically executes tools based on user intent
- **Response Generation**: Creates user-friendly responses from tool outputs

#### Conversation Management
- **Entity Tracking**: Remembers notes, folders, and other entities mentioned
- **Contextual References**: Resolves "that note", "mentioned item", etc.
- **Extended History**: Maintains up to 500 messages for deep context
- **Debug Logging**: Optional detailed logging of AI reasoning processes

## Technical Details

### ES Module Support
The project uses modern ES modules (`type: "module"` in package.json) with:
- Import/export syntax throughout
- Proper file extensions (`.js`) in imports
- Dynamic imports where needed

### Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `ollama`: Ollama API integration
- Built-in Node.js modules: `fs`, `path`, `readline`, `url`

### Error Handling
- Graceful server connection failures
- Robust tool execution error handling
- Fallback mechanisms for AI analysis failures
- Detailed error logging and user feedback

## Contributing

Feel free to contribute by:
- Adding new features to the multi-server architecture
- Improving the AI integration and LLM-powered tool analysis
- Adding support for more Ollama models
- Enhancing the user interface and chat experience
- Improving error handling and resilience
- Adding tests for new functionality
- Optimizing performance for large conversation histories
- Extending context tracking capabilities

## License

This project is licensed under the ISC License.
