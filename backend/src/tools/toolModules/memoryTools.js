const fs = require("node:fs/promises");
const path = require("node:path");

const MEMORY_FILE = path.resolve(__dirname, "../../../data/memory.json");
const TRACE_FILE = path.resolve(__dirname, "../../../data/trace.txt");
const REPORTS_DIR = path.resolve(__dirname, "../../../data/reports");

/**
 * Helper to ensure the memory file exists and read it.
 */
async function readMemory() {
  try {
    const dir = path.dirname(MEMORY_FILE);
    await fs.mkdir(dir, { recursive: true });
    const content = await fs.readFile(MEMORY_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    // Default empty state
    return {
      knowledge: {},
      active_state: {
        containers: [],
        toxics: [] // Array of { proxy, toxicName, type }
      },
      tool_logs: [],
      history: []
    };
  }
}

/**
 * Helper to save the memory state.
 */
async function writeMemory(data) {
  await fs.writeFile(MEMORY_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Helper to append a line to the trace file.
 */
async function appendToTrace(text) {
  console.log("BROOOOOOOOOOOOOO");
  console.log(text);
  try {
    const dir = path.dirname(TRACE_FILE);
    await fs.mkdir(dir, { recursive: true });
    const timestamp = new Date().toISOString();
    await fs.appendFile(TRACE_FILE, `[${timestamp}] ${text}\n`, "utf-8");
  } catch (err) {
    console.error("Failed to write to trace.txt:", err);
  }
}

function registerMemoryTools(tools) {
  tools.register({
    name: "memory_read",
    description: "Read the current state of memory, including knowledge of the system and active interventions.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Optional key to read (e.g., 'knowledge' or 'active_state')." }
      }
    },
    execute: async ({ key }) => {
      const memory = await readMemory();
      return key ? memory[key] : memory;
    }
  });

  tools.register({
    name: "memory_update_knowledge",
    description: "Store information discovered about the client's codebase or architecture.",
    parameters: {
      type: "object",
      properties: {
        info: { type: "object", description: "Key-value pairs of information to store." }
      },
      required: ["info"]
    },
    execute: async ({ info }) => {
      const memory = await readMemory();
      memory.knowledge = { ...memory.knowledge, ...info };
      await writeMemory(memory);
      return { ok: true, knowledge: memory.knowledge };
    }
  });

  tools.register({
    name: "memory_record_intervention",
    description: "Record an attack or change made to the system so it can be tracked or undone.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["container_stop", "toxic_added"] },
        details: { type: "object", description: "Details like proxy name or container name." }
      },
      required: ["type", "details"]
    },
    execute: async ({ type, details }) => {
      const memory = await readMemory();
      const event = { timestamp: new Date().toISOString(), type, ...details };
      
      if (type === "container_stop") {
        memory.active_state.containers.push(details.name || details.container || details.service);
      } else if (type === "toxic_added") {
        memory.active_state.toxics.push(details);
      }
      
      memory.history.push(event);
      await writeMemory(memory);
      return { ok: true, state: memory.active_state };
    }
  });

  tools.register({
    name: "memory_log_tool_call",
    description: "Log the execution of a tool for audit and tracing purposes. Basically a trace for what the ai did.",
    parameters: {
      type: "object",
      properties: {
        tool_name: { type: "string", description: "The name of the tool called." },
        args: { type: "object", description: "The arguments passed to the tool." },
        response: { type: "object", description: "The result or response returned by the tool." }
      },
      required: ["tool_name"]
    },
    execute: async ({ tool_name, args, response }) => {
      const memory = await readMemory();
      if (!memory.tool_logs) memory.tool_logs = [];
      memory.tool_logs.push({ timestamp: new Date().toISOString(), tool_name, args, response });
      await writeMemory(memory);
      return { ok: true };
    }
  });

  tools.register({
    name: "memory_clear_session",
    description: "Clear the active interventions state (e.g., after a cleanup).",
    parameters: { type: "object", properties: {} },
    execute: async () => {
      const memory = await readMemory();
      const cleared = { ...memory.active_state };
      memory.active_state = { containers: [], toxics: [] };
      memory.tool_logs = [];
      await fs.unlink(TRACE_FILE).catch(() => {}); // Reset trace file
      await writeMemory(memory);
      return { ok: true, cleared };
    }
  });

  tools.register({
    name: "memory_list_reports",
    description: "List all chaos engineering and analysis reports saved in the reports directory.",
    parameters: { type: "object", properties: {} },
    execute: async () => {
      try {
        await fs.mkdir(REPORTS_DIR, { recursive: true });
        const files = await fs.readdir(REPORTS_DIR);
        const reports = files.filter(f => f.endsWith(".md") || f.endsWith(".txt"));
        return { ok: true, reports };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
  });

  tools.register({
    name: "memory_read_report",
    description: "Read the full content of a specific report file by name.",
    parameters: {
      type: "object",
      properties: {
        filename: { type: "string", description: "The name of the report file (e.g., 'mongodb_latency_report.md')." }
      },
      required: ["filename"]
    },
    execute: async ({ filename }) => {
      try {
        // Security: Prevent path traversal
        const safeName = path.basename(filename);
        const targetPath = path.join(REPORTS_DIR, safeName);
        const content = await fs.readFile(targetPath, "utf-8");
        return { ok: true, filename: safeName, content };
      } catch (err) {
        return { ok: false, error: `Could not read report: ${err.message}` };
      }
    }
  });

  tools.register({
    name: "memory_get_analysis",
    description: "Retrieve the core codebase analysis report (analysis.md).",
    parameters: { type: "object", properties: {} },
    execute: async () => {
      try {
        const filenames = ["analysis.md", "analysis.txt"];
        for (const name of filenames) {
          try {
            const content = await fs.readFile(path.join(REPORTS_DIR, name), "utf-8");
            return { ok: true, filename: name, content };
          } catch {
            continue;
          }
        }
        return { 
          ok: false, 
          error: "No analysis report found. You may need to run the codebase analyzer first." 
        };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
  });

  tools.register({
    name: "memory_search_reports",
    description: "Search through all saved reports using BM25 relevance ranking to find the most relevant information for a query.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query (e.g., 'mongodb sequential database operations')." },
        topN: { type: "integer", description: "Number of results to return.", default: 3 }
      },
      required: ["query"]
    },
    execute: async ({ query, topN = 3 }) => {
      try {
        await fs.mkdir(REPORTS_DIR, { recursive: true });
        const files = await fs.readdir(REPORTS_DIR);
        const reportFiles = files.filter(f => f.endsWith(".md") || f.endsWith(".txt"));

        if (reportFiles.length === 0) {
          return { ok: true, results: [], message: "No reports found to search." };
        }

        const documents = await Promise.all(reportFiles.map(async (filename) => {
          const content = await fs.readFile(path.join(REPORTS_DIR, filename), "utf-8");
          return { filename, content };
        }));

        const results = bm25Search(query, documents)
          .filter(r => r.score > 0)
          .slice(0, topN)
          .map(r => ({
            filename: r.filename,
            score: r.score.toFixed(4),
            snippet: r.content.slice(0, 200).trim().replace(/\s+/g, ' ') + "..."
          }));

        return { ok: true, query, results };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
  });
}

/**
 * Simple BM25 ranking algorithm.
 * @param {string} query 
 * @param {Array<{filename: string, content: string}>} documents 
 * @param {number} k1 term frequency saturation parameter
 * @param {number} b length normalization parameter
 */
function bm25Search(query, documents, k1 = 1.2, b = 0.75) {
  const tokenize = (text) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const queryTerms = tokenize(query);
  const docTokens = documents.map(d => tokenize(d.content));

  const N = documents.length;
  const avgdl = docTokens.reduce((sum, tokens) => sum + tokens.length, 0) / (N || 1);

  const idfs = {};
  for (const term of new Set(queryTerms)) {
    const nq = docTokens.filter(tokens => tokens.includes(term)).length;
    idfs[term] = Math.log(((N - nq + 0.5) / (nq + 0.5)) + 1);
  }

  return documents.map((doc, i) => {
    const tokens = docTokens[i];
    const dl = tokens.length;
    let score = 0;
    for (const term of queryTerms) {
      if (!idfs[term]) continue;
      const fqd = tokens.filter(t => t === term).length;
      const numerator = fqd * (k1 + 1);
      const denominator = fqd + k1 * (1 - b + (b * (dl / avgdl)));
      score += idfs[term] * (numerator / denominator);
    }
    return { ...doc, score };
  }).sort((a, b) => b.score - a.score);
}

module.exports = {
  registerMemoryTools,
  readMemory,
  writeMemory,
  appendToTrace
};