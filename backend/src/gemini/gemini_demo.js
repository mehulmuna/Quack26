
const path = require("node:path");
// Ensure dotenv looks for the .env file in the backend directory
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const GeminiClient = require("./geminiClient");
const ToolRegistry = require("../tools/ToolRegistry");
const { registerMemoryTools } = require("../tools/toolModules/memoryTools");


const tools = new ToolRegistry();

tools.register({
  name: "add_latency",
  description: "Adds artificial latency to a service.",
  parameters: {
    type: "object",
    properties: {
      service: {
        type: "string",
        description: "Service/container name",
      },
      milliseconds: {
        type: "integer",
        description: "Latency to add in milliseconds",
      },
    },
    required: ["service", "milliseconds"],
  },
  execute: async ({ service, milliseconds }) => {
    console.log(`Adding ${milliseconds}ms latency to ${service}`);
    return { ok: true, service, milliseconds };
  },
});

tools.register({
  name: "kill_container",
  description: "Kills a Docker container by name.",
  parameters: {
    type: "object",
    properties: {
      container: {
        type: "string",
        description: "Docker container name",
      },
    },
    required: ["container"],
  },
  execute: async ({ container }) => {
    console.log(`Killing container ${container}`);
    return { ok: true, killed: container };
  },
});

// Register the new memory tools for Richard's memory system
registerMemoryTools(tools);

async function main() {
  const ai = new GeminiClient();

  const result = await ai.converse(
    [
      {
        role: "user",
        content:
          "First, analyze the system to find the api-server's configuration and save that into your architectural knowledge. Then, add latency to api-server, record this attack in memory, and read the memory back.",
      },
    ],
    tools,
    {
      system:
        "You are an AI chaos monkey for dev environments. Use tools when needed. Use memory tools to track your actions and knowledge. Never affect production.",
      maxTurns: 5,
    }
  );

  console.log(result.text);
}

main();