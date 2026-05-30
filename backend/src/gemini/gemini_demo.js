

require("dotenv").config();

const GeminiClient = require("./geminiClient");
const ToolRegistry = require("../tools/tools");


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

async function main() {
  const ai = new GeminiClient();

  const result = await ai.converse(
    [
      {
        role: "user",
        content:
          "Test my dev app. Add latency to api-server and kill one non-critical container.",
      },
    ],
    tools,
    {
      system:
        "You are an AI chaos monkey for dev environments. Use tools when needed. Never affect production.",
      maxTurns: 5,
    }
  );

  console.log(result.text);
}

main();