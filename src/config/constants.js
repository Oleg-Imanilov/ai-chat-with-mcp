// Configuration constants and defaults
export const DEFAULTS = {
    // AI Configuration
    MAX_CONTEXT_LENGTH: 100,
    INCREASED_CONTEXT_LENGTH: 500,
    CONFIDENCE_THRESHOLD: 0.7,
    CONTEXT_HISTORY_SLICE: 5,
    PARAMETER_EXTRACTION_HISTORY: 3,
    RECENT_ENTITIES_LIMIT: 10,
    
    // Debug and Logging
    DEBUG_LOGGING: false,
};

// Command constants
export const COMMANDS = {
    HELP: '/help',
    TOOLS: '/tools',
    RESOURCES: '/resources',
    PROMPTS: '/prompts',
    MODEL: '/model',
    CLEAR: '/clear',
    CONTEXT: '/context',
    DEBUG: '/debug',
    EXIT: '/exit'
};

// Message role constants
export const MESSAGE_ROLES = {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system'
};

// Error codes
export const ERROR_CODES = {
    METHOD_NOT_FOUND: -32601
};

// Debug actions
export const DEBUG_ACTIONS = {
    ON: ['on', 'enable', 'true'],
    OFF: ['off', 'disable', 'false']
};

// UI Messages
export const UI_MESSAGES = {
    STARTING_CHAT: "\n=== Starting AI-powered MCP Chat ===",
    OLLAMA_INIT_FAILED: "Failed to initialize Ollama. Make sure Ollama is running on your system.",
    OLLAMA_DOWNLOAD_LINK: "You can download and install Ollama from: https://ollama.ai",
    THINKING: "Thinking...",
    GOODBYE: "Goodbye! 👋",
    HISTORY_CLEARED: "Conversation history cleared! 🧹",
    DEBUG_ENABLED: "🐛 Debug logging enabled - internal LLM calls will now be shown in gray",
    DEBUG_DISABLED: "🐛 Debug logging disabled - internal LLM calls will be hidden",
    CONTEXT_REFERENCE_TIP: "\n💡 You can now use contextual references like \"update mentioned note\" or \"delete that note\"",
    NATURAL_TYPING_TIP: "\n🚀 Just type naturally - tools are detected and executed automatically!"
};


// System prompt template keys
export const SYSTEM_PROMPT_KEYS = {
    MCP_TOOLS: 'MCP_TOOLS',
    MCP_RESOURCES: 'MCP_RESOURCES',
    TOOL_CONTEXT: 'TOOL_CONTEXT'
};
