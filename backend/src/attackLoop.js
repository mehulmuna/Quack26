const { runAgentLoop } = require("./loop");
const ToolRegistry = require("./tools/ToolRegistry");
const { registerMemoryTools } = require("./tools/toolModules/memoryTools");
const { registerAdrianTools } = require("./tools/toolModules/adrianTools");
const {
  ATTACK_LOOP_SYSTEM_PROMPT,
  buildAttackLoopUserPrompt,
} = require("./prompts/attackLoop");
const { ensureChaosRuntime } = require("./chaos/ensureRuntime");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelayMs(minMs = 3000, maxMs = 5000) {
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

/**
 * Wrap tool execution with a 3–5s pause after each call (for dashboard pacing).
 */
function wrapToolsWithPacing(tools, { minMs = 3000, maxMs = 5000 } = {}) {
  const execute = tools.execute.bind(tools);
  tools.execute = async (name, args) => {
    const result = await execute(name, args);
    const delay = randomDelayMs(minMs, maxMs);
    console.log(`[attackLoop] pacing ${delay}ms after ${name}`);
    await sleep(delay);
    return result;
  };
  return tools;
}

/**
 * Build a structured Phase 4 payload from Richard's memory_read result.
 */
function extractPhase4Summary(memory) {
  const knowledge = memory?.knowledge ?? {};

  return {
    target_directory: knowledge.target_directory,
    analyzed_at: knowledge.analyzed_at,
    project_summary: knowledge.project_summary,
    architecture_notes: knowledge.architecture_notes,
    vulnerabilities: knowledge.vulnerabilities,
    knowledge,
    active_state: memory?.active_state,
  };
}

/**
 * Read architecture + vulnerability summary using Richard's memory_read tool.
 */
async function readPhase4SummaryFromMemory() {
  const tools = new ToolRegistry();
  registerMemoryTools(tools);
  const memory = await tools.execute("memory_read", {});
  return {
    memory,
    summary: extractPhase4Summary(memory),
    summaryJson: JSON.stringify(extractPhase4Summary(memory), null, 2),
  };
}

function createAttackTools() {
  const tools = new ToolRegistry();
  registerAdrianTools(tools);

  const memoryOnly = new ToolRegistry();
  registerMemoryTools(memoryOnly);
  const record = memoryOnly.tools.get("memory_record_intervention");
  if (record) {
    tools.register({
      name: "memory_record_intervention",
      description: record.declaration.description,
      parameters: record.declaration.parameters,
      execute: record.execute,
    });
  }

  return tools;
}

/**
 * Load Phase 4 memory, then run a paced chaos attack agent loop.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxTurns] - Agent rounds (default 12)
 * @param {number} [opts.minDelayMs] - Min pause after each tool (default 3000)
 * @param {number} [opts.maxDelayMs] - Max pause after each tool (default 5000)
 * @param {string} [opts.model]
 * @param {string} [opts.apiKey]
 * @returns {Promise<object>}
 */
async function runAttackLoop(opts = {}) {
  let chaosRuntime = null;
  if (opts.skipEnsureRuntime !== true) {
    chaosRuntime = await ensureChaosRuntime({
      ensureApiServer: opts.ensureApiServer !== false,
    });
  }

  const phase4 = await readPhase4SummaryFromMemory();

  if (
    !phase4.summary.vulnerabilities?.length &&
    !phase4.summary.architecture_notes &&
    Object.keys(phase4.summary.knowledge).length === 0
  ) {
    console.warn(
      "[attackLoop] warn: Phase 4 summary looks empty — run runCodebaseAnalyzer first"
    );
  }

  const tools = wrapToolsWithPacing(createAttackTools(), {
    minMs: opts.minDelayMs ?? 3000,
    maxMs: opts.maxDelayMs ?? 5000,
  });

  const userPrompt = buildAttackLoopUserPrompt(phase4.summaryJson);

  const result = await runAgentLoop({
    systemPrompt: opts.systemPrompt ?? ATTACK_LOOP_SYSTEM_PROMPT,
    messages: [{ role: "user", content: opts.userPrompt ?? userPrompt }],
    tools,
    maxTurns: opts.maxTurns ?? 12,
    model: opts.model,
    apiKey: opts.apiKey,
  });

  return {
    chaosRuntime,
    phase4Summary: phase4.summary,
    phase4SummaryJson: phase4.summaryJson,
    userPrompt,
    systemPrompt: opts.systemPrompt ?? ATTACK_LOOP_SYSTEM_PROMPT,
    ...result,
  };
}

module.exports = {
  runAttackLoop,
  readPhase4SummaryFromMemory,
  extractPhase4Summary,
  createAttackTools,
  wrapToolsWithPacing,
  ATTACK_LOOP_SYSTEM_PROMPT,
  buildAttackLoopUserPrompt,
};
