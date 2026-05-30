const fs = require("node:fs/promises");
const path = require("node:path");

const MEMORY_FILE = path.resolve(__dirname, "../../../data/memory.json");

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
      await writeMemory(memory);
      return { ok: true, cleared };
    }
  });
}

module.exports = {
  registerMemoryTools,
  readMemory,
  writeMemory,
  MEMORY_FILE,
};