import { Ollama } from 'ollama';
import { 
    DEFAULTS, 
    MESSAGE_ROLES 
} from '../config/constants.js';
import ConfigManager from '../config/ConfigManager.js';


// Initialize configuration manager
const cfg = new ConfigManager();

export default class OllamaIntegration {
    constructor(options = {}) {
        this.ollama = new Ollama({
            host: options.host || cfg.getOllamaHost()
        });
        this.model = options.model || cfg.getDefaultModel();
        this.systemPrompt = options.systemPrompt || cfg.getSystemPrompt();
        this.conversationHistory = [];
        this.maxContextLength = options.maxContextLength || DEFAULTS.MAX_CONTEXT_LENGTH;
        this.debugLogging = options.debugLogging || DEFAULTS.DEBUG_LOGGING;
    }

    async initialize() {
        try {
            // Test connection to Ollama
            const models = await this.ollama.list();
            console.log(`Connected to Ollama. Available models: [${models.models.map(m => m.name).join(', ')}]`);
            
            // Check if our preferred model exists
            const modelExists = models.models.some(m => m.name.includes(this.model));
            if (!modelExists) {
                console.log(`Model ${this.model} not found. Trying to pull it...`);
                await this.ollama.pull({ model: this.model });
                console.log(`Successfully pulled model ${this.model}`);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Ollama:', error.message);
            return false;
        }
    }

    async generateResponse(userMessage, mcpClient = null) {
        try {
            // Add user message to conversation history
            this.conversationHistory.push({
                role: MESSAGE_ROLES.USER,
                content: userMessage,
                timestamp: new Date().toISOString()
            });

            // Analyze user message and automatically execute tools if needed
            const autoExecutionResult = await this.analyzeAndExecuteTools(userMessage, mcpClient);
            if (autoExecutionResult) {
                // If tools were automatically executed, add the formatted result to conversation
                this.conversationHistory.push({
                    role: MESSAGE_ROLES.ASSISTANT,
                    content: autoExecutionResult.formatted,
                    timestamp: new Date().toISOString()
                });
                return autoExecutionResult.formatted;
            }

            // Prepare context about available MCP tools/resources
            let mcpContext = '';
            if (mcpClient) {
                try {
                    const tools = await mcpClient.listTools();
                    const toolsList = tools.tools.map(tool => {
                        const serverInfo = tool.serverName ? ` (${tool.serverName})` : '';
                        return `- ${tool.qualifiedName || tool.name}${serverInfo}(${this.getToolParameters(tool)}): ${tool.description || 'No description'}`;
                    }).join('\n');
                    mcpContext += `\nAvailable MCP Tools:\n${toolsList}\n`;
                } catch (error) {
                    // Tools might not be available
                }

                try {
                    const resources = await mcpClient.listResources();
                    const resourcesList = resources.resources.map(resource => {
                        const serverInfo = resource.serverName ? ` (${resource.serverName})` : '';
                        return `- ${resource.qualifiedUri || resource.uri}${serverInfo}: ${resource.name || 'Resource'}`;
                    }).join('\n');
                    mcpContext += `\nAvailable MCP Resources:\n${resourcesList}\n`;
                } catch (error) {
                    // Resources might not be available
                }
            }

            // Enhanced system prompt for automatic tool usage
            const enhancedSystemPrompt = this.systemPrompt + mcpContext + `

IMPORTANT: You have access to the MCP tools listed above from multiple servers. When a user asks for something that can be accomplished with these tools, you should:
1. Identify the appropriate tool(s) to use (note server names in parentheses)
2. Determine the required parameters
3. Execute the tool(s) automatically
4. Provide a helpful response based on the results

The system will automatically route tool calls to the correct server based on the tool information.

For example:
- If asked to "create a note" or "save information", use create_note tool
- If asked to "read notes" or "show me notes", use get_all_notes or get_note tool  
- If asked to "update" or "modify" a note, use update_note tool
- If asked to "delete" or "remove" a note, use delete_note tool
- If asked about "what notes do I have", use get_all_notes tool

Always explain what you're doing and provide the results in a user-friendly format.`;

            // Create messages for the model
            const messages = [
                {
                    role: MESSAGE_ROLES.SYSTEM,
                    content: enhancedSystemPrompt
                },
                ...this.conversationHistory
            ];

            this.debugLog("Generating main response with system prompt:", enhancedSystemPrompt);

            // Generate response from Ollama
            const response = await this.ollama.chat({
                model: this.model,
                messages: messages,
                stream: false
            });

            const assistantMessage = response.message.content;
            this.debugLog("Main response generated:", assistantMessage);

            // Add assistant response to conversation history
            this.conversationHistory.push({
                role: MESSAGE_ROLES.ASSISTANT,
                content: assistantMessage,
                timestamp: new Date().toISOString()
            });

            // Keep conversation history manageable (last N messages)
            if (this.conversationHistory.length > this.maxContextLength) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxContextLength);
            }

            return assistantMessage;

        } catch (error) {
            console.error('Error generating response:', error.message);
            return 'Sorry, I encountered an error while generating a response. Please try again.';
        }
    }

    async executeToolIfRequested(response, mcpClient) {
        if (!mcpClient) return null;

        try {
            // Get available tools to understand what's possible
            const tools = await mcpClient.listTools();
            if (tools.tools.length === 0) return null;

            // Use LLM to analyze if the assistant's response suggests tool execution
            const toolAnalysis = await this.analyzeAssistantResponseForTools(response, tools.tools);
            
            if (toolAnalysis && toolAnalysis.shouldExecute) {
                const toolName = toolAnalysis.toolName;
                
                // Get the specific tool definition - check both name and qualified name
                const tool = tools.tools.find(t => t.name === toolName || t.qualifiedName === toolName);
                if (!tool) {
                    return `Tool "${toolName}" is not available. Available tools: ${tools.tools.map(t => t.qualifiedName || t.name).join(', ')}`;
                }

                // Use the tool's server name for execution if available, otherwise use the tool name directly
                const executionName = tool.serverName ? tool.name : toolName;
                
                console.log(`\n🔧 Executing tool from AI response analysis: ${toolName} (server: ${tool.serverName || 'unknown'}) with args:`, toolAnalysis.arguments);
                const toolResult = await mcpClient.callTool({
                    name: executionName,
                    arguments: toolAnalysis.arguments
                });

                console.log('Tool result:', JSON.stringify(toolResult, null, 2));
                
                return this.formatToolResponseDynamic(toolName, toolResult, toolAnalysis.arguments, tool);
            }

            return null;
            
        } catch (error) {
            console.error('Error in executeToolIfRequested:', error.message);
            return null;
        }
    }

    async analyzeAssistantResponseForTools(assistantResponse, tools) {
        try {
            const toolsInfo = tools.map(tool => ({
                name: tool.name,
                qualifiedName: tool.qualifiedName || tool.name,
                serverName: tool.serverName || 'unknown',
                description: tool.description || 'No description',
                parameters: this.getToolParameters(tool),
                schema: tool.inputSchema
            }));

            const prompt = `Analyze the assistant's response to determine if it suggests or implies that a tool should be executed.

Assistant's response: "${assistantResponse}"

Available tools (with server information):
${toolsInfo.map(tool => `- ${tool.qualifiedName || tool.name} (${tool.serverName}): ${tool.description} [${tool.parameters}]`).join('\n')}

Recent conversation context:
${this.conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Instructions:
1. Look for implicit or explicit mentions of actions that could be performed with available tools
2. Consider context from the conversation history
3. Identify if the assistant is suggesting to perform an action that matches a tool
4. Extract the necessary parameters based on the conversation context
5. When multiple servers have similar tools, prefer the most appropriate one based on context
6. Examples of what to look for:
   - "Let me create a note for you"
   - "I'll save this information"
   - "I can update that note"
   - "Let me retrieve your notes"
   - "I'll delete that for you"

Respond with a JSON object:
{
  "shouldExecute": true/false,
  "toolName": "tool_name_if_should_execute",
  "serverName": "server_name_if_should_execute",
  "arguments": {"param1": "value1", "param2": "value2"},
  "confidence": 0.0-1.0,
  "reasoning": "explanation of why this tool should/shouldn't be executed"
}

If shouldExecute is false, only include shouldExecute, confidence, and reasoning.
Use the exact tool name (not qualified name) for toolName field.`;

            this.debugLog("Analyzing assistant response for tools with prompt:", prompt);

            const response = await this.ollama.generate({
                model: this.model,
                prompt: prompt,
                stream: false
            });

            const cleanResponse = response.response.trim();
            this.debugLog("Raw LLM response for tool analysis:", cleanResponse);

            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : cleanResponse;
            
            const analysis = JSON.parse(jsonString);
            this.debugLog("Parsed tool analysis result:", analysis);
            
            // Only execute if confidence is high enough
            if (analysis.shouldExecute && analysis.confidence >= DEFAULTS.CONFIDENCE_THRESHOLD) {
                this.debugLog("Tool execution approved with confidence:", analysis.confidence);
                return analysis;
            }
            
            this.debugLog("Tool execution rejected - confidence too low or shouldExecute is false");
            return null;
            
        } catch (error) {
            console.error('Error analyzing assistant response for tools:', error.message);
            return null;
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    setModel(model) {
        this.model = model;
    }

    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
    }

    setDebugLogging(enabled) {
        this.debugLogging = enabled;
    }

    debugLog(message, data = null) {
        if (this.debugLogging) {
            const grayColor = '\x1b[90m'; // Gray color
            const resetColor = '\x1b[0m'; // Reset color
            if (data) {
                console.log(`${grayColor}[DEBUG] ${message}${resetColor}`, data);
            } else {
                console.log(`${grayColor}[DEBUG] ${message}${resetColor}`);
            }
        }
    }

    getRecentEntities(type = null, limit = DEFAULTS.RECENT_ENTITIES_LIMIT) {
        // Legacy method - now returns empty array as entities are handled by LLM context
        return [];
    }

    buildContextualPrompt(userMessage, toolName, toolSchema) {
        // Get conversation context (last N messages for parameter extraction)
        const recentHistory = this.conversationHistory.slice(-DEFAULTS.RECENT_ENTITIES_LIMIT);
        const conversationContext = recentHistory.map(msg => 
            `${msg.role}: ${msg.content}`
        ).join('\n');

        return `Extract parameters for the tool "${toolName}" from this user message, considering the full conversation context.

Current user message: "${userMessage}"

Recent conversation context:
${conversationContext}

Tool schema: ${JSON.stringify(toolSchema, null, 2)}

Instructions:
1. Look at the ENTIRE conversation context to understand what the user is referring to
2. If the user says "update mentioned note" or "delete that note", find the note name from previous messages
3. If the user refers to "it", "that", "the one", etc., use context to determine what they mean
4. When extracting parameters, prefer recently mentioned items if the current message is ambiguous
5. Use conversation context to fill in missing parameters

Please respond with ONLY a valid JSON object containing the extracted parameters. If a parameter cannot be determined from the message or context, omit it from the response.

Examples:
- Current: "update mentioned note" + Context shows "meeting note" was discussed → {"name": "meeting"}
- Current: "create a note called meeting with agenda items" → {"name": "meeting", "content": "agenda items"}
- Current: "delete that note" + Context shows "project note" was last mentioned → {"name": "project"}

JSON response:`;
    }

    getToolParameters(tool) {
        if (!tool.inputSchema || !tool.inputSchema.properties) {
            return '';
        }
        const params = Object.keys(tool.inputSchema.properties);
        const required = tool.inputSchema.required || [];
        return params.map(param => required.includes(param) ? param : `[${param}]`).join(', ');
    }

    async analyzeAndExecuteTools(userMessage, mcpClient) {
        if (!mcpClient) return null;

        try {
            // Get available tools and resources from MCP server(s)
            const [toolsResponse, resourcesResponse] = await Promise.allSettled([
                mcpClient.listTools(),
                mcpClient.listResources()
            ]);

            const tools = toolsResponse.status === 'fulfilled' ? toolsResponse.value.tools : [];
            const resources = resourcesResponse.status === 'fulfilled' ? resourcesResponse.value.resources : [];

            if (tools.length === 0) {
                return null; // No tools available for auto-execution
            }

            // Use LLM to analyze user intent and determine if any tools should be executed
            const toolMatch = await this.analyzeUserIntentWithLLM(userMessage, tools, resources);
            
            if (toolMatch && toolMatch.shouldExecute) {
                // Find the tool definition to get server information
                const tool = tools.find(t => t.name === toolMatch.toolName || t.qualifiedName === toolMatch.toolName);
                if (!tool) {
                    console.error(`Tool "${toolMatch.toolName}" not found in available tools`);
                    return null;
                }

                // Use the tool's server name for execution if available, otherwise use the tool name directly
                const executionName = tool.serverName ? tool.name : toolMatch.toolName;
                
                this.debugLog(`\n🤖 Auto-executing tool: ${toolMatch.toolName} (server: ${tool.serverName || 'unknown'}) with LLM-determined args: ${toolMatch.arguments}`);
                
                const toolResult = await mcpClient.callTool({
                    name: executionName,
                    arguments: toolMatch.arguments
                });

                
                this.debugLog(`Tool result: ${JSON.stringify(toolResult, null, 2)}`);
                
                // Return both the raw tool result and formatted version for flexible use
                return {
                    toolName: toolMatch.toolName,
                    arguments: toolMatch.arguments,
                    rawResult: toolResult,
                    formatted: this.formatToolResponseDynamic(toolMatch.toolName, toolResult, toolMatch.arguments, tool),
                    tool: tool
                };
            }

        } catch (error) {
            console.error('Error in analyzeAndExecuteTools:', error.message);
        }

        return null; // No automatic execution performed
    }

    async analyzeUserIntentWithLLM(userMessage, tools, resources) {
        try {
            const toolsInfo = tools.map(tool => ({
                name: tool.name,
                qualifiedName: tool.qualifiedName || tool.name,
                serverName: tool.serverName || 'unknown',
                description: tool.description || 'No description',
                parameters: this.getToolParameters(tool)
            }));

            const resourcesInfo = resources.map(resource => ({
                uri: resource.uri,
                qualifiedUri: resource.qualifiedUri || resource.uri,
                serverName: resource.serverName || 'unknown',
                name: resource.name || 'Resource',
                mimeType: resource.mimeType || 'unknown'
            }));

            const prompt = `Analyze the user's message and determine if any available tools should be automatically executed.

User message: "${userMessage}"

Available tools (with server information):
${toolsInfo.map(tool => `- ${tool.qualifiedName || tool.name} (${tool.serverName}): ${tool.description} [${tool.parameters}]`).join('\n')}

Available resources (with server information):
${resourcesInfo.map(res => `- ${res.qualifiedUri || res.uri} (${res.serverName}): ${res.name} (${res.mimeType})`).join('\n')}

Recent conversation context:
${this.conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Instructions:
1. Determine if the user's message clearly indicates they want to perform an action that matches one of the available tools
2. If yes, identify the most appropriate tool and extract the required parameters
3. Consider the conversation context for ambiguous references (like "that", "it", "mentioned")
4. When multiple servers have similar tools, prefer the most appropriate one based on context
5. Only suggest automatic execution if you're confident about the user's intent

Common patterns to recognize:
- "analyze all my notes" / "analyze my notes" / "show me all notes" → get_all_notes
- "create a note" / "save this" / "make a note" → create_note
- "read note X" / "show me note X" / "get note X" → get_note
- "update note X" / "modify note X" / "change note X" → update_note
- "delete note X" / "remove note X" → delete_note
- "list all notes" / "what notes do I have" → get_all_notes
- "analyze", "examine", "review", "look at" + "notes" → get_all_notes

Respond with a JSON object in this format:
{
  "shouldExecute": true/false,
  "toolName": "tool_name_if_should_execute",
  "serverName": "server_name_if_should_execute",
  "arguments": {"param1": "value1", "param2": "value2"},
  "confidence": 0.0-1.0,
  "reasoning": "explanation of why this tool should/shouldn't be executed"
}

If shouldExecute is false, only include shouldExecute, confidence, and reasoning.
Use the exact tool name (not qualified name) for toolName field.`;

            this.debugLog("Analyzing user intent with LLM using prompt:", prompt);

            const response = await this.ollama.generate({
                model: this.model,
                prompt: prompt,
                stream: false
            });

            const cleanResponse = response.response.trim();
            this.debugLog("Raw LLM response for user intent analysis:", cleanResponse);

            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : cleanResponse;
            
            const analysis = JSON.parse(jsonString);
            this.debugLog("Parsed user intent analysis result:", analysis);
            
            // Only execute if confidence is high enough
            if (analysis.shouldExecute && analysis.confidence >= DEFAULTS.CONFIDENCE_THRESHOLD) {
                this.debugLog("User intent analysis approved with confidence:", analysis.confidence);
                return analysis;
            }
            
            this.debugLog("User intent analysis rejected - confidence too low or shouldExecute is false");
            return null;
            
        } catch (error) {
            console.error('Error analyzing user intent with LLM:', error.message);
            return null;
        }
    }

    async extractParametersWithLLM(argString, toolName, toolSchema, context = '') {
        try {
            const prompt = `Extract parameters for the tool "${toolName}" from the given information.

Tool schema: ${JSON.stringify(toolSchema, null, 2)}

Argument string: "${argString}"
Full context: "${context}"
Recent conversation: ${this.conversationHistory.slice(-DEFAULTS.PARAMETER_EXTRACTION_HISTORY).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Instructions:
1. Parse the argument string and context to extract tool parameters
2. Use the tool schema to understand what parameters are expected
3. Consider conversation history for ambiguous references
4. Return only valid JSON with the extracted parameters

JSON response:`;

            this.debugLog("Extracting parameters with LLM using prompt:", prompt);

            const response = await this.ollama.generate({
                model: this.model,
                prompt: prompt,
                stream: false
            });

            const cleanResponse = response.response.trim();
            this.debugLog("Raw LLM response for parameter extraction:", cleanResponse);

            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : cleanResponse;
            
            const result = JSON.parse(jsonString);
            this.debugLog("Parsed parameter extraction result:", result);
            
            return result;
            
        } catch (error) {
            console.error('Error extracting parameters with LLM:', error.message);
            this.debugLog("Parameter extraction failed, falling back to simple parsing");
            // Fallback to simple parsing
            return this.fallbackParameterExtraction(argString, toolName);
        }
    }

    formatToolResponseDynamic(toolName, toolResult, args, tool) {
        try {
            // Use LLM to format the response based on tool result and context
            const prompt = `Format a user-friendly response for a tool execution result.

Tool name: ${toolName}
Tool description: ${tool?.description || 'No description'}
Tool arguments used: ${JSON.stringify(args)}
Tool result: ${JSON.stringify(toolResult, null, 2)}

Instructions:
1. Create a clear, user-friendly summary of what was accomplished
2. Include relevant details from the result
3. Use appropriate emojis to make it visually appealing
4. If the result contains data, present it in a readable format
5. If there was an error, explain it clearly

Response:`;

            // For immediate response, use a simpler formatting approach
            // In a real implementation, you might want to make this async
            return this.simpleFormatToolResponse(toolName, toolResult, args);
            
        } catch (error) {
            console.error('Error formatting tool response:', error.message);
            return this.simpleFormatToolResponse(toolName, toolResult, args);
        }
    }

    simpleFormatToolResponse(toolName, toolResult, args) {
        // Simple fallback formatting
        if (toolResult.content && toolResult.content[0]) {
            const content = toolResult.content[0];
            if (content.text) {
                try {
                    const data = JSON.parse(content.text);
                    if (Array.isArray(data)) {
                        return `✅ Tool "${toolName}" executed successfully. Found ${data.length} items:\n\n${JSON.stringify(data, null, 2)}`;
                    }
                    return `✅ Tool "${toolName}" executed successfully:\n\n${JSON.stringify(data, null, 2)}`;
                } catch (e) {
                    return `✅ Tool "${toolName}" executed successfully:\n\n${content.text}`;
                }
            }
        }
        
        if (toolResult.isError) {
            return `❌ Tool "${toolName}" failed: ${toolResult.content?.[0]?.text || 'Unknown error'}`;
        }
        
        return `✅ Tool "${toolName}" executed successfully with arguments: ${JSON.stringify(args)}`;
    }

    fallbackParameterExtraction(userMessage, toolName) {
        // Generic fallback parameter extraction
        const lowerMessage = userMessage.toLowerCase();
        
        // Try to extract simple key-value patterns
        const params = {};
        
        // Extract quoted strings as potential parameter values
        const quotedMatches = userMessage.match(/["']([^"']+)["']/g);
        if (quotedMatches) {
            // If we have quoted strings, try to use them as parameter values
            const values = quotedMatches.map(match => match.slice(1, -1));
            
            // Simple heuristics for common parameter names
            if (values.length >= 1) {
                if (lowerMessage.includes('name') || lowerMessage.includes('call') || lowerMessage.includes('title')) {
                    params.name = values[0];
                }
                if (values.length >= 2 && (lowerMessage.includes('content') || lowerMessage.includes('with'))) {
                    params.content = values[1];
                }
                if (lowerMessage.includes('path') || lowerMessage.includes('folder') || lowerMessage.includes('directory')) {
                    params.path = values[0];
                    params.folderPath = values[0];
                }
            }
        }
        
        return params;
    }

    formatToolResponse(toolName, toolResult, args) {
        // Use the dynamic formatting method
        return this.simpleFormatToolResponse(toolName, toolResult, args);
    }

    formatResourceResponse(resourceContent) {
        if (resourceContent.contents && resourceContent.contents[0]) {
            const content = resourceContent.contents[0];
            if (content.mimeType === 'application/json') {
                try {
                    const data = JSON.parse(content.text);
                    if (Array.isArray(data)) {
                        return `📚 Resource contains ${data.length} items:\n\n${JSON.stringify(data, null, 2)}`;
                    }
                    return `📚 Resource content:\n\n${JSON.stringify(data, null, 2)}`;
                } catch (e) {
                    return `📚 Resource content:\n\n${content.text}`;
                }
            }
            return `📚 Resource content:\n\n${content.text}`;
        }
        return "📚 Resource content not available.";
    }

    async generateResponseWithToolContext(userMessage, toolExecutionResult, mcpClient = null) {
        try {
            // Add user message to conversation history
            this.conversationHistory.push({
                role: MESSAGE_ROLES.USER,
                content: userMessage,
                timestamp: new Date().toISOString()
            });

            // Add tool execution result as context
            const toolContext = `\n\n=== Tool Execution Result ===\nTool: ${toolExecutionResult.toolName}\nArguments: ${JSON.stringify(toolExecutionResult.arguments)}\nResult: ${JSON.stringify(toolExecutionResult.rawResult, null, 2)}\n=== End Tool Result ===\n`;

            // Prepare context about available MCP tools/resources
            let mcpContext = '';
            if (mcpClient) {
                try {
                    const tools = await mcpClient.listTools();
                    const toolsList = tools.tools.map(tool => {
                        const serverInfo = tool.serverName ? ` (${tool.serverName})` : '';
                        return `- ${tool.qualifiedName || tool.name}${serverInfo}(${this.getToolParameters(tool)}): ${tool.description || 'No description'}`;
                    }).join('\n');
                    mcpContext += `\nAvailable MCP Tools:\n${toolsList}\n`;
                } catch (error) {
                    // Tools might not be available
                }

                try {
                    const resources = await mcpClient.listResources();
                    const resourcesList = resources.resources.map(resource => {
                        const serverInfo = resource.serverName ? ` (${resource.serverName})` : '';
                        return `- ${resource.qualifiedUri || resource.uri}${serverInfo}: ${resource.name || 'Resource'}`;
                    }).join('\n');
                    mcpContext += `\nAvailable MCP Resources:\n${resourcesList}\n`;
                } catch (error) {
                    // Resources might not be available
                }
            }

            // Enhanced system prompt for responding with tool context
            const enhancedSystemPrompt = this.systemPrompt + mcpContext + toolContext + `

IMPORTANT: A tool has been automatically executed based on the user's request. The tool execution result is provided above. 

Your task is to:
1. Analyze the tool execution result
2. Provide a clear, helpful response to the user based on the tool output
3. Format the information in a user-friendly way
4. Explain what was accomplished and present the results clearly
5. Use appropriate formatting and emojis to make the response engaging

The user asked: "${userMessage}"
The tool was executed and the result is provided in the context above.

Please provide a comprehensive, user-friendly response based on the tool execution result.`;

            // Create messages for the model
            const messages = [
                {
                    role: MESSAGE_ROLES.SYSTEM,
                    content: enhancedSystemPrompt
                },
                ...this.conversationHistory
            ];

            this.debugLog("Generating response with tool context:", enhancedSystemPrompt);

            // Generate response from Ollama
            const response = await this.ollama.chat({
                model: this.model,
                messages: messages,
                stream: false
            });

            const assistantMessage = response.message.content;
            this.debugLog("Tool context response generated:", assistantMessage);

            // Add assistant response to conversation history
            this.conversationHistory.push({
                role: MESSAGE_ROLES.ASSISTANT,
                content: assistantMessage,
                timestamp: new Date().toISOString()
            });

            // Keep conversation history manageable
            if (this.conversationHistory.length > this.maxContextLength) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxContextLength);
            }

            return assistantMessage;

        } catch (error) {
            console.error('Error generating response with tool context:', error);
            return 'I executed a tool based on your request, but encountered an error while generating a response. Please try again.';
        }
    }
}
