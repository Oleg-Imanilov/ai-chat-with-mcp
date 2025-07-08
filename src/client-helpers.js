import { highlight, success, error } from "./utils.js";

export function logServerCapabilities(client) {
    console.log("\n=== Server Capabilities ===");
    const serverCapabilities = client.getServerCapabilities();
    console.log("Server capabilities:", JSON.stringify(serverCapabilities, null, 2));
}

export async function listAndTestTools(client) {
    try {
        console.log("\n=== Available Tools ===");
        const { tools } = await client.listTools();

        tools.forEach(({ name, title, description, inputSchema }, index) => {
            let args = []

            if (inputSchema && inputSchema.properties && Object.keys(inputSchema.properties).length > 0) {

                const { properties, required } = inputSchema || {}
                const props = Object.keys(properties);
                const reqProps = (required || []).reduce((acc, prop) => {
                    acc[prop] = true;
                    return acc;
                }, {});
                props.forEach(prop => {
                    args.push(reqProps[prop] ? prop: `[${prop}]`);
                })
            } 

            // Highlight the tool name in green and make the first tool stand out
            const toolName = index === 0 ? success(name) : highlight(name);
            console.log(`*  ${toolName}(${args.join(", ")}) \t// ${title}`);
        })

        //   console.log("Tools:", JSON.stringify(tools, null, 2));

        // If there are tools, try calling one
        if (tools.tools && tools.tools.length > 0) {
            const firstTool = tools.tools[0];
            console.log(`\nTrying to call tool: ${firstTool.name}`);

            // Create arguments object based on the tool's input schema
            const args = {};
            if (firstTool.inputSchema && firstTool.inputSchema.properties) {
                // Fill in some example values for required properties
                for (const [propName, propDef] of Object.entries(firstTool.inputSchema.properties)) {
                    if (firstTool.inputSchema.required && firstTool.inputSchema.required.includes(propName)) {
                        // Add some example values based on property type
                        if (propDef.type === "string") {
                            args[propName] = "example";
                        } else if (propDef.type === "number") {
                            args[propName] = 1;
                        } else if (propDef.type === "boolean") {
                            args[propName] = true;
                        }
                    }
                }
            }

            const toolResult = await client.callTool({
                name: firstTool.name,
                arguments: args
            });
            console.log("Tool result:", JSON.stringify(toolResult, null, 2));
        }
    } catch (error) {
        console.log("Error with tools:", error.message);
    }
}

export async function listAndTestResources(client) {
    try {
        console.log("\n=== Available Resources ===");
        const resources = await client.listResources();
        console.log("Resources:", JSON.stringify(resources, null, 2));

        // If there are resources, try reading one
        if (resources.resources && resources.resources.length > 0) {
            const firstResource = resources.resources[0];
            console.log(`\nTrying to read resource: ${firstResource.uri}`);
            const resourceContent = await client.readResource({
                uri: firstResource.uri
            });
            console.log("Resource content:", JSON.stringify(resourceContent, null, 2));
        }
    } catch (error) {
        if( error.code === -32601) { // Method not found
            // This means the server does not support resources
            console.log("No resources supported by this server.");
        } else {
            console.log("Error with resources:", error.message);
        }
    }
}

export async function listAndTestPrompts(client) {
    try {
        console.log("\n=== Available Prompts ===");
        const prompts = await client.listPrompts();
        console.log("Prompts:", JSON.stringify(prompts, null, 2));

        // If there are prompts, try getting one
        if (prompts.prompts && prompts.prompts.length > 0) {
            const firstPrompt = prompts.prompts[0];
            console.log(`\nTrying to get prompt: ${firstPrompt.name}`);

            // Create arguments for the prompt if needed
            const promptArgs = {};
            if (firstPrompt.arguments) {
                for (const arg of firstPrompt.arguments) {
                    if (arg.required) {
                        promptArgs[arg.name] = "example value";
                    }
                }
            }

            const promptResult = await client.getPrompt({
                name: firstPrompt.name,
                arguments: promptArgs
            });
            console.log("Prompt result:", JSON.stringify(promptResult, null, 2));
        }
    } catch (error) {
        if( error.code === -32601) { // Method not found
            // This means the server does not support resources
            console.log("No prompts supported by this server.");
        } else {
            console.log("Error with prompts:", error.message);
        }            
    }
}
