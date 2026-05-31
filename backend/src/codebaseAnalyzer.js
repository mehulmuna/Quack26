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

const BOOTSTRAP_DIRS = [".", "src", "frontend"];
const BOOTSTRAP_FILES = [
  "package.json",
  "docker-compose.yml",
  "Dockerfile",
  ".env.example",
];
const ANALYZER_MAX_BYTES = 48 * 1024;
const BOOTSTRAP_FILE_MAX_CHARS = 6000;

function createAnalyzerTools(rootDir, { maxBytes = ANALYZER_MAX_BYTES } = {}) {
  const tools = new ToolRegistry();
  registerFileTools(tools, { rootDir, maxBytes });

  const memoryOnly = new ToolRegistry();
  registerMemoryTools(memoryOnly);
  const updateKnowledge = memoryOnly.tools.get("memory_update_knowledge");
  if (updateKnowledge) {
    tools.register({
      name: updateKnowledge.declaration.name,
      description: updateKnowledge.declaration.description,
      parameters: updateKnowledge.declaration.parameters,
      execute: updateKnowledge.execute,
    });
  }

  return tools;
}

/**
 * Pre-read directory layout and key config files so the agent skips discovery turns.
 */
async function bootstrapRepoContext(rootDir) {
  const sections = [];

  for (const rel of BOOTSTRAP_DIRS) {
    try {
      const dirPath = path.join(rootDir, rel);
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const names = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
      sections.push(`${rel}: ${names.join(", ")}`);
    } catch {
      // optional path
    }
  }

  for (const rel of BOOTSTRAP_FILES) {
    try {
      const filePath = path.join(rootDir, rel);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      let content = await fs.readFile(filePath, "utf-8");
      if (content.length > BOOTSTRAP_FILE_MAX_CHARS) {
        content = `${content.slice(0, BOOTSTRAP_FILE_MAX_CHARS)}\n...(truncated)`;
      }
      sections.push(`\n--- ${rel} ---\n${content}`);
    } catch {
      // optional file
    }
  }

  return sections.join("\n");
}

/**
 * Run the codebase analyzer agent on a target directory.
 *
 * @param {string} targetDirectory - Root path to analyze (resolved to absolute)
 * @param {object} [opts]
 * @param {number} [opts.maxTurns] - Max model/tool rounds (default 12)
 * @param {boolean} [opts.bootstrap] - Pre-load repo layout (default true)
 * @param {string} [opts.model]
 * @param {string} [opts.apiKey]
 * @returns {Promise<{ targetDirectory: string, text: string, messages: Array, turns: number, raw: object, error?: string }>}
 */
async function runCodebaseAnalyzer(targetDirectory, opts = {}) {
  const rootDir = path.resolve(targetDirectory);
  const bootstrap = opts.bootstrap !== false;

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

  const tools = createAnalyzerTools(rootDir, { maxBytes: opts.maxBytes });
  const repoContext = bootstrap ? await bootstrapRepoContext(rootDir) : "";
  const userPrompt = buildCodebaseAnalyzerUserPrompt(rootDir, repoContext);

  const maxTurns = opts.maxTurns ?? 12;

  const result = await runAgentLoop({
    systemPrompt: opts.systemPrompt ?? CODEBASE_ANALYZER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: opts.userPrompt ?? userPrompt }],
    tools,
    maxTurns,
    maxToolTurns: opts.maxToolTurns ?? maxTurns,
    maxContinuations: opts.maxContinuations ?? 1,
    temperature: opts.temperature ?? 0.3,
    maxOutputTokens: opts.maxOutputTokens ?? 2048,
    model: opts.model,
    apiKey: opts.apiKey,
  });

  return {
    targetDirectory: rootDir,
    userPrompt,
    systemPrompt: opts.systemPrompt ?? CODEBASE_ANALYZER_SYSTEM_PROMPT,
    bootstrapped: bootstrap,
    ...result,
  };
}

module.exports = {
  runCodebaseAnalyzer,
  createAnalyzerTools,
  bootstrapRepoContext,
  CODEBASE_ANALYZER_SYSTEM_PROMPT,
  buildCodebaseAnalyzerUserPrompt,
};
