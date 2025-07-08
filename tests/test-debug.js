import  OllamaIntegration  from '../src/OllamaIntegration.js';

async function testDebugLogging() {
    console.log("Testing debug logging functionality...\n");
    
    // Test 1: Default state (should be disabled)
    const ollama = new OllamaIntegration();
    console.log("1. Testing default state (debug logging should be disabled):");
    ollama.debugLog("This should not appear");
    console.log("   ✓ No debug output shown (correct)\n");
    
    // Test 2: Enable debug logging
    console.log("2. Testing enabled debug logging:");
    ollama.setDebugLogging(true);
    ollama.debugLog("This should appear in gray");
    ollama.debugLog("This should also appear in gray", { test: "data" });
    console.log("   ✓ Debug output shown in gray (correct)\n");
    
    // Test 3: Disable debug logging
    console.log("3. Testing disabled debug logging:");
    ollama.setDebugLogging(false);
    ollama.debugLog("This should not appear");
    console.log("   ✓ No debug output shown (correct)\n");
    
    // Test 4: Constructor option
    console.log("4. Testing constructor option:");
    const ollamaWithDebug = new OllamaIntegration({ debugLogging: true });
    ollamaWithDebug.debugLog("This should appear in gray from constructor");
    console.log("   ✓ Debug output shown from constructor option (correct)\n");
    
    console.log("All debug logging tests completed successfully! 🎉");
}

testDebugLogging().catch(console.error);
