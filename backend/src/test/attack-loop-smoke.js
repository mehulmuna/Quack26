/**
 * Smoke test for runAttackLoop.
 *
 * Usage (from backend/):
 *   node src/test/attack-loop-smoke.js
 *   node src/test/attack-loop-smoke.js --tools-only
 */
const assert = require("node:assert");
const path = require("node:path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const {
  runAttackLoop,
  readPhase4SummaryFromMemory,
  createAttackTools,
  wrapToolsWithPacing,
  ATTACK_CHAOS_TOOL_NAMES,
} = require("../attackLoop");
const { ensureChaosRuntime } = require("../chaos/ensureRuntime");
const { normalizeCpuLimit } = require("../tools/toolModules/dockerTools");

async function testMemoryRead() {
  console.log("\n--- 1) Richard memory_read (Phase 4) ---");
  const phase4 = await readPhase4SummaryFromMemory();
  const keys = Object.keys(phase4.summary.knowledge || {});
  console.log("knowledge keys:", keys.join(", ") || "(empty)");
  console.log(
    "has vulnerabilities:",
    Boolean(phase4.summary.vulnerabilities?.length)
  );
  console.log(
    "has architecture_notes:",
    Boolean(phase4.summary.architecture_notes)
  );
  console.log("summary JSON length:", phase4.summaryJson.length, "chars");
  console.log("memory_read: passed");
  return phase4;
}

async function testAttackTools() {
  console.log("\n--- 2) Attack chaos tools registry ---");
  const tools = createAttackTools();
  const names = tools.declarations().map((d) => d.name);
  for (const expected of [...ATTACK_CHAOS_TOOL_NAMES, "memory_record_intervention"]) {
    if (!names.includes(expected)) {
      throw new Error(`Missing tool declaration: ${expected}`);
    }
  }
  assert.strictEqual(normalizeCpuLimit(0.1), "0.1");
  assert.strictEqual(normalizeCpuLimit(0), "0");
  assert.throws(() => normalizeCpuLimit(-0.1), /greater than or equal to 0/);
  console.log("registered:", names.join(", "));
  console.log("Attack chaos tools: passed");
}

async function testPacing() {
  console.log("\n--- 3) Tool pacing (short delay) ---");
  const tools = new (require("../tools/ToolRegistry"))();
  tools.register({
    name: "ping",
    description: "noop",
    parameters: { type: "object", properties: {} },
    execute: async () => ({ ok: true }),
  });
  wrapToolsWithPacing(tools, { minMs: 200, maxMs: 300 });
  const start = Date.now();
  await tools.execute("ping", {});
  const elapsed = Date.now() - start;
  if (elapsed < 200) {
    throw new Error(`Expected >=200ms delay, got ${elapsed}ms`);
  }
  console.log(`delay after ping: ~${elapsed}ms`);
  console.log("Pacing: passed");
}

async function testChaosRuntimeAndTools() {
  console.log("\n--- 4) Chaos runtime + attack tools (live) ---");
  try {
    const runtime = await ensureChaosRuntime();
    console.log("ensureChaosRuntime:", JSON.stringify(runtime, null, 2));

    const tools = createAttackTools();
    const latency = await tools.execute("toxiproxy_add_latency", {
      proxy: "api-server",
      latencyMs: 100,
    });
    console.log("toxiproxy_add_latency:", latency.ok !== false ? "ok" : latency);

    await tools.execute("toxiproxy_add_reset_peer", {
      proxy: "api-server",
      toxicity: 0.1,
    });
    console.log("toxiproxy_add_reset_peer: ok");

    const stopped = await tools.execute("docker_stop_instance", { name: "api-server" });
    console.log("docker_stop_instance:", stopped);

    console.log("Live attack tools: passed");
  } catch (err) {
    console.error(
      "Live tools failed (is Docker Desktop running?):",
      err.message || err
    );
    throw err;
  }
}

async function testAgentRun() {
  console.log("\n--- 5) Full attack loop (Gemini API) ---");

  if (!process.env.GEMINI_API_KEY) {
    console.log("SKIP: set GEMINI_API_KEY in backend/.env");
    return;
  }

  const result = await runAttackLoop({
    maxTurns: 10,
    minDelayMs: 500,
    maxDelayMs: 800,
  });

  console.log("Turns:", result.turns);
  console.log("Error:", result.error ?? "(none)");
  console.log("\nFinal report:\n", result.text || "(empty)");

  const toolNames = [];
  for (const msg of result.messages || []) {
    for (const part of msg.parts || []) {
      if (part.functionCall?.name) toolNames.push(part.functionCall.name);
      if (part.functionResponse?.name) toolNames.push(`↳ ${part.functionResponse.name}`);
    }
  }
  if (toolNames.length) {
    console.log("\nTool activity:", [...new Set(toolNames)].join(", "));
  }

  const chaosUsed = toolNames.some((n) =>
    ATTACK_CHAOS_TOOL_NAMES.some((a) => n.includes(a))
  );
  console.log("Chaos tool used:", chaosUsed);

  if (result.error) process.exit(1);
}

async function main() {
  const toolsOnly = process.argv.includes("--tools-only");
  console.log("Attack loop smoke test");

  await testMemoryRead();
  await testAttackTools();
  await testPacing();

  if (!toolsOnly) {
    await testChaosRuntimeAndTools();
    await testAgentRun();
  } else {
    console.log("\n--- 4–5) Skipped (--tools-only) ---");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  if (err.status) console.error("status:", err.status);
  process.exit(1);
});
