const { GoogleGenAI } = require("@google/genai");

/**
 * Normalize chat messages into Gemini content objects.
 * Accepts { role, content } or pre-built { role, parts } entries.
 */
function toGeminiContents(messages) {
  return messages.map((m) => {
    if (m.parts) return m;
    return {
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.content ?? "") }],
    };
  });
}

/**
 * Resolve a tool executor from a ToolRegistry or a plain name -> fn map.
 */
function createToolExecutor(tools) {
  if (!tools) return null;

  if (typeof tools.execute === "function" && typeof tools.declarations === "function") {
    return (name, args) => tools.execute(name, args);
  }

  if (typeof tools === "object") {
    return async (name, args) => {
      const fn = tools[name];
      if (!fn) throw new Error(`Tool not found: ${name}`);
      return await fn(args);
    };
  }

  throw new Error("tools must be a ToolRegistry or a name -> execute map");
}

function getToolDeclarations(tools) {
  if (!tools) return [];
  if (typeof tools.declarations === "function") return tools.declarations();
  return Object.keys(tools).map((name) => ({
    name,
    description: `Execute the ${name} function.`,
    parameters: { type: "object", properties: {} },
  }));
}

/**
 * Asynchronous agent loop using the Gemini SDK.
 *
 * @param {object} opts
 * @param {string} opts.systemPrompt - System instruction for the model
 * @param {Array} [opts.messages] - Initial conversation ({ role, content } or Gemini contents)
 * @param {import('./tools/ToolRegistry')|Record<string, Function>} [opts.tools] - Tool registry or execute map
 * @param {string} [opts.model] - Model id (default: GEMINI_MODEL or gemini-2.5-flash)
 * @param {number} [opts.maxTurns] - Max model rounds (default: 10)
 * @param {string} [opts.apiKey] - Gemini API key (default: GEMINI_API_KEY)
 * @returns {Promise<{ text: string, messages: Array, turns: number, raw: object }>}
 */
async function runAgentLoop(opts = {}) {
  const {
    systemPrompt,
    messages: initialMessages = [],
    tools,
    model = process.env.GEMINI_MODEL || "gemini-2.5-flash",
    maxTurns = 10,
    apiKey = process.env.GEMINI_API_KEY,
  } = opts;

  if (!systemPrompt) throw new Error("systemPrompt is required");
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  const executeTool = createToolExecutor(tools);
  const declarations = getToolDeclarations(tools);
  const contents = toGeminiContents(initialMessages);

  const config = {
    systemInstruction: systemPrompt,
  };

  if (declarations.length > 0) {
    config.tools = [{ functionDeclarations: declarations }];
    config.toolConfig = {
      functionCallingConfig: { mode: "AUTO" },
    };
  }

  let lastResponse = null;

  for (let turn = 0; turn < maxTurns; turn++) {
    lastResponse = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const functionCalls = lastResponse.functionCalls ?? [];

    if (functionCalls.length === 0) {
      return {
        text: lastResponse.text ?? "",
        messages: contents,
        turns: turn + 1,
        raw: lastResponse,
      };
    }

    if (!executeTool) {
      throw new Error(
        `Model requested ${functionCalls.length} tool call(s) but no tools were provided`
      );
    }

    const modelContent = lastResponse.candidates?.[0]?.content;
    if (modelContent) {
      contents.push(modelContent);
    } else {
      contents.push({
        role: "model",
        parts: functionCalls.map((call) => ({ functionCall: call })),
      });
    }

    const responseParts = [];

    for (const call of functionCalls) {
      let result;
      try {
        result = await executeTool(call.name, call.args ?? {});
      } catch (err) {
        result = { error: err.message || String(err) };
      }

      responseParts.push({
        functionResponse: {
          name: call.name,
          id: call.id,
          response: { result },
        },
      });
    }

    contents.push({
      role: "user",
      parts: responseParts,
    });
  }

  return {
    text: lastResponse?.text ?? "",
    messages: contents,
    turns: maxTurns,
    error: "max turns reached",
    raw: lastResponse,
  };
}

module.exports = { runAgentLoop, toGeminiContents };
