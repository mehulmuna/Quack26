const fs = require("node:fs/promises");
const path = require("node:path");

const { runAgentLoop } = require("./loop");
const ToolRegistry = require("./tools/ToolRegistry");
const { registerFileTools } = require("./tools/toolModules/fileTools");
const { registerMemoryTools } = require("./tools/toolModules/memoryTools");
const {
  CODEBASE_ANALYZER_SYSTEM_PROMPT,
  buildCodebaseAnalyzerUserPrompt,
} = require("./prompts/codebaseAnalyzer");

function createAnalyzerTools(rootDir) {
  const tools = new ToolRegistry();
  registerFileTools(tools, { rootDir });
  registerMemoryTools(tools);
  return tools;
}

/**
 * Run the codebase analyzer agent on a target directory.
 *
 * @param {string} targetDirectory - Root path to analyze (resolved to absolute)
 * @param {object} [opts]
 * @param {number} [opts.maxTurns] - Agent loop limit (default 15)
 * @param {string} [opts.model]
 * @param {string} [opts.apiKey]
 * @returns {Promise<{ targetDirectory: string, text: string, messages: Array, turns: number, raw: object, error?: string }>}
 */
async function runCodebaseAnalyzer(targetDirectory, opts = {}) {
  const rootDir = path.resolve(targetDirectory);

  try {
    const stat = await fs.stat(rootDir);
    if (!stat.isDirectory()) {
      throw new Error(`targetDirectory is not a directory: ${rootDir}`);
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`targetDirectory does not exist: ${rootDir}`);
    }
    throw err;
  }

  const tools = createAnalyzerTools(rootDir);
  const userPrompt = buildCodebaseAnalyzerUserPrompt(rootDir);

  const result = await runAgentLoop({
    systemPrompt: opts.systemPrompt ?? CODEBASE_ANALYZER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: opts.userPrompt ?? userPrompt }],
    tools,
    maxTurns: opts.maxTurns ?? 15,
    model: opts.model,
    apiKey: opts.apiKey,
  });

  return {
    targetDirectory: rootDir,
    userPrompt,
    systemPrompt: opts.systemPrompt ?? CODEBASE_ANALYZER_SYSTEM_PROMPT,
    ...result,
  };
}

module.exports = {
  runCodebaseAnalyzer,
  createAnalyzerTools,
  CODEBASE_ANALYZER_SYSTEM_PROMPT,
  buildCodebaseAnalyzerUserPrompt,
};
