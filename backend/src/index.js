const GeminiClient = require("./gemini/geminiClient");
const path = require("node:path");
const { runLoop } = require("./loop");
const redAgentPrompt = require("./prompts/system/redAgent");
const { createRouter } = require("./routes");
const createTools = require("./tools/registerTools");
const { startToxiproxy } = require("./toxiproxy/start");

require('dotenv').config({ path: path.resolve(__dirname, "../.env") });

const express = require('express');

const app = express();
const port = process.env.PORT || 3002;

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
    }

    next();
});
app.use(express.json());

function parseJsonEnv(name) {
    const value = process.env[name];

    if (!value) return undefined;

    try {
        return JSON.parse(value);
    } catch (err) {
        console.warn(`Ignoring invalid ${name}: ${err.message}`);
        return undefined;
    }
}

const DEFAULT_INPUTS = {
    name: process.env.REPO_NAME,
    dir: process.env.REPO_ABSOLUTE_PATH || path.resolve(__dirname, "../.."),
    run: parseJsonEnv("REPO_RUN")
};

function normalizeRunCommands(commands) {
    if (!Array.isArray(commands)) return undefined;

    return commands
        .filter((command) => command?.label && command?.command)
        .reduce((acc, command) => {
            acc[command.label] = command.command;
            return acc;
        }, {});
}

function normalizeLoopInput(input = {}) {
    return {
        name: input.name || input.projectName || DEFAULT_INPUTS.name || "Quack26",
        dir: input.directory || input.dir || DEFAULT_INPUTS.dir,
        run: normalizeRunCommands(input.commands) || input.run || DEFAULT_INPUTS.run || {},
    };
}

async function runMainLoop(input, opts = {}){

	console.log("==Starting main loop==");

    await startToxiproxy();

	console.log(input);
	
	console.log("==Started the toxiproxy==");

    return runLoop(new GeminiClient(), createTools(input), {
        prompt: redAgentPrompt(input),
        maxTurns: 10,
        maxToolTurns: 10,
        signal: opts.signal,
        out: (result) => {
            console.log("\n=== TURN RESULT ===");
            console.log(result.text);
        }
    })
    .then((result) => {
        console.log("\n=== FINAL ===");
        console.log(result.text);
        return result;
    })
}

function createMainLoopController() {
    const state = {
        promise: null,
        controller: null,
        startedAt: null,
        stoppedAt: null,
        lastResult: null,
        lastError: null,
    };

    function status() {
        return {
            running: Boolean(state.promise),
            startedAt: state.startedAt,
            stoppedAt: state.stoppedAt,
            lastResult: state.lastResult
                ? {
                    done: state.lastResult.done,
                    aborted: state.lastResult.aborted,
                    error: state.lastResult.error,
                }
                : null,
            lastError: state.lastError,
        };
    }

    return {
        status,
        async start(input = {}) {
            if (state.promise) {
                return {
                    ok: true,
                    started: false,
                    message: "Main loop is already running.",
                    ...status(),
                };
            }

            state.controller = new AbortController();
            state.startedAt = new Date().toISOString();
            state.stoppedAt = null;
            state.lastError = null;

            const loopInput = normalizeLoopInput(input);

            state.promise = runMainLoop(loopInput, { signal: state.controller.signal })
                .then((result) => {
                    state.lastResult = result;
                    return result;
                })
                .catch((err) => {
                    state.lastError = err.message || String(err);
                    console.error(err);
                    return { error: state.lastError };
                })
                .finally(() => {
                    state.promise = null;
                    state.controller = null;
                    state.stoppedAt = new Date().toISOString();
                });

            return {
                ok: true,
                started: true,
                ...status(),
            };
        },
        stop() {
            if (!state.promise) {
                return {
                    ok: true,
                    stopped: false,
                    message: "Main loop is not running.",
                    ...status(),
                };
            }

            state.controller.abort();

            return {
                ok: true,
                stopped: true,
                message: "Main loop stop requested.",
                ...status(),
            };
        },
    };
}

const mainLoop = createMainLoopController();

app.use(createRouter({
    mainLoop,
    defaultConfig: {
        name: DEFAULT_INPUTS.name || "Quack26",
        directory: DEFAULT_INPUTS.dir,
        run: DEFAULT_INPUTS.run || {},
    },
}));

app.listen(port, () => {
	console.log(`Express API listening on http://localhost:${port}`);
});
