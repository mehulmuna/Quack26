const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
		system,
		systemPrompt,
		...generateOptions
	} = opts;

	return {
		...generateOptions,
		tools: toolAdapter,
	};
}

async function runLoop(client, tools, opts = {}) {
	if (!client || typeof client.generateContent !== "function") {
		throw new Error("runLoop requires a client with generateContent(messages, opts)");
	}

	const maxTurns = opts.maxTurns ?? 10;
	const intervalMs = opts.intervalMs ?? 10000;

	const messages = normalizeMessages(opts.messages || []);
	const systemPrompt = opts.systemPrompt ?? opts.system;

	if (systemPrompt) {
		messages.unshift({
			role: "user",
			parts: [{ text: `SYSTEM:\n${String(systemPrompt)}` }],
		});
	}

	if (opts.prompt) {
		messages.push({
			role: "user",
			parts: [{ text: String(opts.prompt) }],
		});
	}

	if (messages.length === 0) {
		throw new Error("runLoop requires opts.prompt, opts.systemPrompt, or opts.messages");
	}

	const turns = [];

	for (let i = 0; i < maxTurns; i++) {
		const result = await runTurn(client, tools, {
			...opts,
			prompt: undefined,
			messages,
		});

		turns.push(result);

		if (result.error && opts.stopOnError !== false) break;
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
	const maxToolTurns = opts.maxToolTurns ?? 5;
	const generateOptions = createGenerateOptions(opts, toolAdapter);

	const toolResults = [];
	let raw = null;

	for (let turn = 0; turn < maxToolTurns; turn++) {
		raw = await client.generateContent(messages, generateOptions);

		const modelContent = raw?.candidates?.[0]?.content;
		if (!modelContent) {
			return {
				text: "",
				messages,
				raw,
				toolResults,
				turns: turn + 1,
				done: false,
				error: "No model content returned",
			};
		}

		messages.push(modelContent);

		const calls =
			typeof client.getFunctionCalls === "function"
				? client.getFunctionCalls(raw)
				: getFunctionCalls(raw);

		if (!calls.length) {
			const text =
				typeof client.getText === "function" ? client.getText(raw) : getText(raw);

			return {
				text,
				messages,
				raw,
				toolResults,
				turns: turn + 1,
				done: true,
			};
		}

		const responseParts = [];

		for (const call of calls) {
			let result;

			try {
				result = await toolAdapter.execute(call.name, call.args || {});
			} catch (err) {
				result = {
					error: err.message || String(err),
				};
			}

			toolResults.push({
				name: call.name,
				args: call.args || {},
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

		messages.push({
			role: "user",
			parts: responseParts,
		});
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
};