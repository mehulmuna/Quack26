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

const INPUTS = {
    name: process.env.REPO_NAME,
    dir: process.env.REPO_ABSOLUTE_PATH,
    run: parseJsonEnv("REPO_RUN")
};

async function runMainLoop(input, opts = {}){

    await startToxiproxy();

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
        async start() {
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

            state.promise = runMainLoop(INPUTS, { signal: state.controller.signal })
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

app.use(createRouter({ mainLoop }));

app.listen(port, () => {
	console.log(`Express API listening on http://localhost:${port}`);
});
