// Simple test to verify the fix for [object Object] issue
import OllamaIntegration from './src/ai/OllamaIntegration.js';

// Mock MCP client
const mockMcpClient = {
    listTools: async () => ({
        tools: [{
            name: 'get_all_notes',
            qualifiedName: 'get_all_notes',
            serverName: 'notes',
            description: 'Get all notes',
            inputSchema: { type: 'object', properties: {} }
        }]
    }),
    listResources: async () => ({ resources: [] }),
    callTool: async ({ name, arguments: args }) => ({
        content: [{ text: JSON.stringify([{ name: 'Test', content: 'Test content' }]) }]
    })
};

async function testFix() {
    const ollama = new OllamaIntegration();
    
    // Test the analyzeAndExecuteTools method directly
    console.log("Testing analyzeAndExecuteTools method...");
    const result = await ollama.analyzeAndExecuteTools("show all notes", mockMcpClient);
    console.log("Result type:", typeof result);
    console.log("Result:", result);
    
    if (result && result.formatted) {
        console.log("✅ analyzeAndExecuteTools returns object with formatted property");
        console.log("Formatted result type:", typeof result.formatted);
        console.log("Formatted result:", result.formatted);
    } else {
        console.log("❌ analyzeAndExecuteTools doesn't return expected object structure");
    }
    
    // Test the generateResponse method (this should return a string, not an object)
    console.log("\nTesting generateResponse method...");
    const response = await ollama.generateResponse("show all notes", mockMcpClient);
    console.log("Response type:", typeof response);
    console.log("Response:", response);
    
    if (typeof response === 'string') {
        console.log("✅ generateResponse returns string (fix successful!)");
    } else {
        console.log("❌ generateResponse still returns object (fix failed!)");
    }
}

testFix().catch(console.error);
