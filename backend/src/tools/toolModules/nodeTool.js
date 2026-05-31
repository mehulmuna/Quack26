const { execFile } = require("node:child_process");
const path = require("node:path");

function registerNodeTool(tools) {
  tools.register({
    name: "run_node",
    description: "Run a Node.js script with optional arguments. Use this to interact with the application you are testing with chaos engineering.",
    parameters: {
      type: "object",
      properties: {
        scriptPath: {
          type: "string",
          description: "Path to the JavaScript file to execute.",
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Arguments to pass to the Node process.",
        },
        cwd: {
          type: "string",
          description: "Optional working directory for the process.",
        },
        env: {
          type: "object",
          description: "Optional environment variables to merge with process.env.",
        },
      },
      required: ["scriptPath"],
    },
    execute: async ({ scriptPath, args = [], cwd, env = {} }) => {
      return new Promise((resolve, reject) => {
        const child = execFile(
          process.execPath,
          [scriptPath, ...args],
          {
            cwd: path.join(tools.data.dir, cwd),
            env: { ...process.env, ...env },
            windowsHide: true,
          },
          (error, stdout, stderr) => {
            resolve({
              ok: !error,
              code: error && typeof error.code !== "undefined" ? error.code : 0,
              stdout: stdout?.toString() || "",
              stderr: stderr?.toString() || "",
              error: error ? error.message : undefined,
            });
          }
        );

        child.on("error", (err) => {
          reject(err);
        });
      });
    },
  });
}

module.exports = {
  registerNodeTool,
};
