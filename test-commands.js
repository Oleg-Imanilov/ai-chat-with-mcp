// Simple test to verify command structure
import CommandHandler from './src/commands/CommandHandler.js';

// Mock objects for testing
const mockClient = {
    listTools: async () => ({ tools: [] }),
    listResources: async () => ({ resources: [] }),
    listPrompts: async () => ({ prompts: [] })
};

const mockOllama = {
    setModel: (model) => console.log(`Mock: Set model to ${model}`),
    clearHistory: () => console.log('Mock: History cleared'),
    conversationHistory: [],
    debugLogging: false,
    setDebugLogging: (enabled) => console.log(`Mock: Debug logging ${enabled ? 'enabled' : 'disabled'}`)
};

// Test the command handler
const commandHandler = new CommandHandler(mockClient, mockOllama);

console.log('Testing command structure...');
console.log('Available commands:', Object.getOwnPropertyNames(CommandHandler.prototype));

// Test help command
await commandHandler.handleCommand('/help');

console.log('\nCommand structure test completed successfully!');
