const { spawn } = require("node:child_process");
const path = require("node:path");

function quoteCmdArg(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`;
}
function runCodexExec({ prompt, cwd = process.cwd(), timeout = 300000, env = {} }) {
  return new Promise((resolve, reject) => {
    if (!prompt || typeof prompt !== "string") {
      reject(new Error("prompt is required and must be a string."));
      return;
    }

    const child = spawn("codex", ["exec", "-"], {
      cwd: path.resolve(cwd),
      env: { ...process.env, ...env },
      windowsHide: true,
      shell: process.platform === "win32",
    });

    child.stdin.write(prompt);
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = timeout
      ? setTimeout(() => {
          timedOut = true;
          child.kill();
        }, timeout)
      : null;

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      resolve({
        ok: !timedOut && code === 0,
        code,
        signal,
        timedOut,
        stdout,
        stderr,
      });
    });
  });
}

function registerCodexTool(tools) {
  tools.register({
    name: "codex",
    description:
      "Run the local Codex CLI using `codex exec` with a prompt. Useful for asking Codex to inspect, edit, or reason about files in a working directory.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Prompt to pass to `codex exec`.",
        },
        cwd: {
          type: "string",
          description: "Working directory where Codex should run.",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds.",
          default: 300000,
        },
        env: {
          type: "object",
          description: "Optional environment variables to merge with process.env.",
        },
      },
      required: ["prompt"],
    },
    execute: async ({ prompt, cwd, timeout = 300000, env = {} }) => {
      return await runCodexExec({
        prompt,
        cwd,
        timeout,
        env,
      });
    },
  });
}

module.exports = {
  registerCodexTool,
};