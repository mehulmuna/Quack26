/**
 * Smoke test for runCodebaseAnalyzer.
 *
 * Usage (from backend/):
 *   node src/test/codebase-analyzer-smoke.js
 *   node src/test/codebase-analyzer-smoke.js ./src
 *   node src/test/codebase-analyzer-smoke.js C:\Users\mehul\QuackHack26\Quack26\backend
 *   node src/test/codebase-analyzer-smoke.js --tools-only
 *
 * Requires GEMINI_API_KEY in .env for the full agent run (--tools-only skips API).
 */
const path = require("node:path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const { runCodebaseAnalyzer } = require("../codebaseAnalyzer");
const ToolRegistry = require("../tools/ToolRegistry");
const { registerFileTools } = require("../tools/toolModules/fileTools");
const { registerMemoryTools } = require("../tools/toolModules/memoryTools");

const DEFAULT_TARGET = path.resolve(__dirname, "../..");

async function assertTargetDirectory(targetDir) {
  const fs = require("node:fs/promises");
  try {
    const stat = await fs.stat(targetDir);
    if (!stat.isDirectory()) {
      throw new Error(`Not a directory: ${targetDir}`);
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(
        `Directory does not exist: ${targetDir}\n` +
          "Pass a real path to an existing folder (not the docs placeholder).\n" +
          "Examples:\n" +
          `  node src/test/codebase-analyzer-smoke.js\n` +
          `  node src/test/codebase-analyzer-smoke.js ${DEFAULT_TARGET}\n` +
          `  node src/test/codebase-analyzer-smoke.js ./src`
      );
    }
    throw err;
  }
}

async function testFileToolsOnly(targetDir) {
  console.log("\n--- 1) File tools (no API) ---");
  const tools = new ToolRegistry();
  registerFileTools(tools, { rootDir: targetDir });
  registerMemoryTools(tools);

  const listing = await tools.execute("list_directory", { path: "." });
  console.log("list_directory(.):", listing.entries?.slice(0, 8).map((e) => e.name).join(", "), "...");

  const pkg = await tools.execute("read_file", { path: "package.json" });
  if (!pkg.content?.includes('"name"')) {
    throw new Error("read_file(package.json) did not return expected content");
  }
  console.log("read_file(package.json): ok,", pkg.size, "bytes");

  try {
    await tools.execute("read_file", { path: "../../../etc/passwd" });
    throw new Error("path traversal should have been blocked");
  } catch (err) {
    console.log("path traversal blocked:", err.message);
  }

  console.log("File tools: passed");
}

async function testAgentRun(targetDir) {
  console.log("\n--- 2) Full agent run (Gemini API) ---");
  console.log("Target:", targetDir);

  if (!process.env.GEMINI_API_KEY) {
    console.log("SKIP: set GEMINI_API_KEY in backend/.env to run the agent");
    return;
  }

  const result = await runCodebaseAnalyzer(targetDir, { maxTurns: 12 });

  console.log("Turns:", result.turns);
  console.log("Error:", result.error ?? "(none)");
  console.log("\nFinal report:\n", result.text);

  const usedTools = result.messages?.some((m) =>
    m.parts?.some((p) => p.functionCall || p.functionResponse)
  );
  console.log("\nTool calls in history:", usedTools);

  const fs = require("node:fs/promises");
  const memoryPath = path.resolve(__dirname, "../../data/memory.json");
  const memory = JSON.parse(await fs.readFile(memoryPath, "utf-8"));
  const knowledgeKeys = Object.keys(memory.knowledge || {});
  console.log("memory.json knowledge keys:", knowledgeKeys.slice(-5).join(", ") || "(empty)");

  const hasAnalysis = knowledgeKeys.some(
    (k) =>
      k.includes("vulnerabilit") ||
      k.includes("codebase") ||
      k.includes("target_directory") ||
      typeof memory.knowledge[k] === "object"
  );
  if (!hasAnalysis && knowledgeKeys.length === 0) {
    console.warn("warn: memory.knowledge may not have been updated — check agent followed workflow");
  }

  if (result.error) process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const toolsOnly = args.includes("--tools-only");
  const targetArg = args.find((a) => !a.startsWith("--"));
  const targetDir = path.resolve(targetArg || DEFAULT_TARGET);

  console.log("Codebase analyzer smoke test");
  console.log("Target directory:", targetDir);

  await assertTargetDirectory(targetDir);
  await testFileToolsOnly(targetDir);

  if (!toolsOnly) {
    await testAgentRun(targetDir);
  } else {
    console.log("\n--- 2) Skipped (--tools-only) ---");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
