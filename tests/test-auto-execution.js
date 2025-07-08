import OllamaIntegration  from '../src/OllamaIntegration.js';

// Mock MCP client for testing
const mockMcpClient = {
    async listTools() {
        return {
            tools: [
                { 
                    name: 'get_all_notes',
                    description: 'Get all notes',
                    inputSchema: { type: 'object', properties: {} }
                },
                { 
                    name: 'get_note',
                    description: 'Get a specific note',
                    inputSchema: { type: 'object', properties: { name: { type: 'string' } } }
                },
                { 
                    name: 'create_note',
                    description: 'Create a new note',
                    inputSchema: { type: 'object', properties: { name: { type: 'string' }, content: { type: 'string' } } }
                }
            ]
        };
    },
    async listResources() {
        return { resources: [] };
    },
    async callTool({ name, arguments: args }) {
        console.log(`Mock tool call: ${name} with args:`, args);
        
        // Simulate tool responses
        switch (name) {
            case 'get_all_notes':
                return {
                    content: [{
                        text: JSON.stringify([
                            { name: 'Meeting', content: 'Team sync at 2pm', created_at: new Date().toISOString(), modified_at: new Date().toISOString() },
                            { name: 'Project', content: 'Deadline next Friday', created_at: new Date().toISOString(), modified_at: new Date().toISOString() }
                        ])
                    }]
                };
            case 'get_note':
                return {
                    content: [{
                        text: JSON.stringify({ content: 'Test note content', created_at: new Date().toISOString(), modified_at: new Date().toISOString() })
                    }]
                };
            case 'create_note':
                return {
                    content: [{
                        text: 'Note created successfully'
                    }]
                };
            default:
                return { content: [{ text: 'Tool executed successfully' }] };
        }
    }
};

const testMessages = [
    "analyze all my notes",
    "analyze my notes",
    "show all notes",
    "show me all my notes", 
    "get all notes",
    "list notes",
    "what notes do I have",
    "create a note called test with content hello",
    "get the meeting note",
    "show the project note"
];

async function testAutoExecution() {
    const ollama = new OllamaIntegration();
    
    console.log("Testing auto-execution patterns:");
    console.log("================================");
    
    for (const message of testMessages) {
        console.log(`\n🔍 Testing: "${message}"`);
        console.log("----------------------------");
        
        const result = await ollama.analyzeAndExecuteTools(message, mockMcpClient);
        
        if (result) {
            console.log(`✅ Auto-executed successfully!`);
            console.log(`� Tool: ${result.toolName}`);
            console.log(`�📝 Formatted: ${result.formatted}`);
            console.log(`🗂️ Raw result: ${JSON.stringify(result.rawResult, null, 2)}`);
        } else {
            console.log(`❌ No auto-execution triggered`);
        }
    }
}

testAutoExecution().catch(console.error);
