const { spawn } = require("node:child_process");
const path = require("node:path");

function registerRunAppTool(tools) {
  tools.register({
    name: "run_app",
    description: `Run a command-line application with optional arguments. Use this to interact with the application you are testing with chaos engineering.
    Current project run info: ${JSON.stringify(tools.data.run)}`,
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The executable or command to run.",
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Arguments to pass to the command.",
        },
        cwd: {
          type: "string",
          description: "Optional working directory.",
        },
        env: {
          type: "object",
          description: "Optional environment variables to merge with process.env.",
        },
      },
      required: ["command"],
    },
    execute: async ({ command, args = [], cwd, env = {} }) => {
      return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
          cwd: path.join(tools.data.dir, cwd),
          env: { ...process.env, ...env },
          windowsHide: true,
          shell: false,
        });

        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (chunk) => {
          stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
          stderr += chunk.toString();
        });

        child.on("close", (code) => {
          resolve({
            ok: code === 0,
            code,
            stdout,
            stderr,
          });
        });

        child.on("error", (error) => {
          reject(error);
        });
      });
    },
  });
}

module.exports = {
  registerRunAppTool,
};
