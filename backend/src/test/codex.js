const ToolRegistry = require("../tools/ToolRegistry");
const { registerCodexTool } = require("../tools/toolModules/codexTool");

async function main() {
  const tools = new ToolRegistry();

  registerCodexTool(tools);

  console.log("Registered tools:");
  console.log(tools.declarations());

  console.log("\nRunning Codex CLI test...");

  const result = await tools.execute("codex", {
    cwd: process.cwd(),
    prompt:
      "Look at this codebase briefly and say what kind of Node project this appears to be. Do not modify files.",
    timeout: 300000,
  });

  console.log("\nCodex result:");
  console.log(result);
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED");
  console.error(err);
  process.exit(1);
});