const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const util = require("util");

function logChatEvent(type, value) {
  console.log(`\n========== ${type} ==========`);

  if (typeof value === "string") {
    console.log(value);
  } else {
    console.log(
      util.inspect(value, {
        depth: null,
        colors: true,
        maxArrayLength: null,
        maxStringLength: null,
      })
    );
  }

  console.log("================================\n");
}

function getText(resp) {
	return (
		resp?.candidates?.[0]?.content?.parts
			?.map((p) => p.text || "")
			.join("") || ""
	);
}

function getFunctionCalls(resp) {
	const parts = resp?.candidates?.[0]?.content?.parts || [];
	return parts.filter((p) => p.functionCall).map((p) => p.functionCall);
}

function createToolAdapter(tools) {
	if (!tools) {
		return {
			declarations: () => [],
			execute: async (name) => {
				throw new Error(`Tool not found: ${name}`);
			},
		};
	}

	if (typeof tools.execute === "function") return tools;

	if (typeof tools === "object") {
		return {
			declarations: () =>
				Object.keys(tools).map((name) => ({
					name,
					description: `Execute the ${name} function.`,
					parameters: {
						type: "object",
						properties: {},
					},
				})),
			execute: async (name, args) => {
				const fn = tools[name];
				if (!fn) throw new Error(`Tool not found: ${name}`);
				return await fn(args || {});
			},
		};
	}

	throw new Error("tools must be a ToolRegistry or a name -> execute map");
}

function normalizeMessages(messages = []) {
	return messages.map((m) => {
		if (m.parts) return m;

		return {
			role: m.role === "assistant" || m.role === "model" ? "model" : "user",
			parts: [{ text: String(m.content ?? "") }],
		};
	});
}

function createGenerateOptions(opts, toolAdapter) {
	const {
		client,
		messages,
		prompt,
		maxTurns,
		maxToolTurns,
		intervalMs,
		stopOnError,
		stopWhenDone,
		out,
		system,
		systemPrompt,
		...generateOptions
	} = opts;

	return {
		...generateOptions,
		system: systemPrompt ?? system,
		tools: toolAdapter,
	};
}

async function runLoop(client, tools, opts = {}) {
	if (!client || typeof client.generateContent !== "function") {
		throw new Error("runLoop requires a client with generateContent(messages, opts)");
	}

	const maxTurns = opts.maxTurns ?? 20;
	const intervalMs = opts.intervalMs ?? 0;
	const messages = normalizeMessages(opts.messages || []);

	if (opts.prompt) {
		const promptMessage = {
			role: "user",
			parts: [{ text: String(opts.prompt) }],
		};

		messages.push(promptMessage);
		logChatEvent("CHAT ADDED (user prompt)", promptMessage);
	}

	if (messages.length === 0) {
		throw new Error("runLoop requires opts.prompt or opts.messages");
	}

	for (const message of messages) {
		logChatEvent(`CHAT HAS (${message.role})`, message);
	}

	const turns = [];

	for (let i = 0; i < maxTurns; i++) {
		logChatEvent("LOOP TURN START", {
			turn: i + 1,
			maxTurns,
		});

		const result = await runTurn(client, tools, {
			...opts,
			prompt: undefined,
			messages,
		});

		turns.push(result);

		if (typeof opts.out === "function") {
			opts.out(result);
		}
		console.log(result);
		// if (result.error && opts.stopOnError !== false) break;
		if (opts.stopWhenDone !== false && result.done) break;

		if (i < maxTurns - 1 && intervalMs > 0) {
			await wait(intervalMs);
		}
	}

	return {
		messages,
		turns,
		text: turns.at(-1)?.text || "",
		error: turns.at(-1)?.error,
		done: turns.at(-1)?.done ?? false,
	};
}

async function runTurn(client, tools, opts = {}) {
	const messages = opts.messages;

	if (!Array.isArray(messages)) {
		throw new Error("messages must be an array");
	}

	const toolAdapter = createToolAdapter(tools);
	const maxToolTurns = opts.maxToolTurns ?? 10;
	const generateOptions = createGenerateOptions(opts, toolAdapter);

	const toolResults = [];
	let raw = null;

	for (let toolTurn = 0; toolTurn < maxToolTurns; toolTurn++) {
		raw = await client.generateContent(messages, generateOptions);

		const modelContent = raw?.candidates?.[0]?.content;

		if (!modelContent) {
			return {
				text: "",
				messages,
				raw,
				toolResults,
				turns: toolTurn + 1,
				done: false,
				error: "No model content returned",
			};
		}

		messages.push(modelContent);
		// logChatEvent("MODEL WROTE", modelContent);

		const text =
			typeof client.getText === "function" ? client.getText(raw) : getText(raw);

		if (text) {
			logChatEvent("MODEL TEXT", text);
		}

		const calls =
			typeof client.getFunctionCalls === "function"
				? client.getFunctionCalls(raw)
				: getFunctionCalls(raw);

		if (!calls.length) {
			return {
				text,
				messages,
				raw,
				toolResults,
				turns: toolTurn + 1,
				done: true,
			};
		}

		const responseParts = [];

		for (const call of calls) {
			const args = call.args || {};

			logChatEvent("TOOL CALL", {
				name: call.name,
				args,
			});

			let result;

			try {
				result = await toolAdapter.execute(call.name, args);
			} catch (err) {
				result = {
					error: err?.message || String(err),
				};
			}

			toolResults.push({
				name: call.name,
				args,
				result,
			});

			logChatEvent("TOOL RESULT", {
				name: call.name,
				result,
			});

			responseParts.push({
				functionResponse: {
					name: call.name,
					response: {
						result,
					},
				},
			});
		}

		const toolResponseMessage = {
			role: "user",
			parts: responseParts,
		};

		messages.push(toolResponseMessage);
		// logChatEvent("CHAT ADDED (tool responses)", toolResponseMessage);
	}

	return {
		text: "",
		messages,
		raw,
		toolResults,
		turns: maxToolTurns,
		done: false,
		error: "max tool turns reached",
	};
}

module.exports = {
	runLoop,
	runTurn,
	getText,
	getFunctionCalls,
	normalizeMessages,
	createToolAdapter,
};