require("dotenv").config();

const { runAgentLoop, toGeminiContents } = require("../loop");
const ToolRegistry = require("../tools/ToolRegistry");

const tools = new ToolRegistry();

tools.register({
  name: "add_numbers",
  description: "Adds two integers and returns the sum.",
  parameters: {
    type: "object",
    properties: {
      a: { type: "integer", description: "First number" },
      b: { type: "integer", description: "Second number" },
    },
    required: ["a", "b"],
  },
  execute: async ({ a, b }) => {
    const sum = Number(a) + Number(b);
    console.log(`[tool] add_numbers(${a}, ${b}) => ${sum}`);
    return { sum };
  },
});

async function main() {
  const normalized = toGeminiContents([
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
  ]);
  if (normalized.length !== 2 || normalized[1].role !== "model") {
    throw new Error("toGeminiContents normalization failed");
  }
  console.log("toGeminiContents: ok");

  const result = await runAgentLoop({
    systemPrompt:
      "You are a helpful assistant. When asked to add numbers, you must call add_numbers with the correct arguments, then reply with the numeric result only.",
    messages: [
      {
        role: "user",
        content: "What is 17 + 25? You must use the add_numbers tool.",
      },
    ],
    tools,
    maxTurns: 5,
  });

  console.log("turns:", result.turns);
  console.log("error:", result.error ?? "(none)");
  console.log("text:", result.text);

  const historyHasToolRound =
    result.messages.some((m) =>
      m.parts?.some((p) => p.functionCall || p.functionResponse)
    );
  console.log("tool round in history:", historyHasToolRound);

  if (result.error) process.exit(1);
  if (!historyHasToolRound) {
    console.warn("warn: no tool call recorded in message history");
  }
  if (!/42/.test(result.text)) {
    console.warn("warn: final text does not mention 42");
  }
}

main().catch((err) => {
  console.error("loop smoke test failed:", err.message || err);
  if (err.cause) console.error(err.cause);
  process.exit(1);
});
