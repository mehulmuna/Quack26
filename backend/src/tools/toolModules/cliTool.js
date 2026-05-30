const { spawn } = require("node:child_process");

function spawnProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      windowsHide: true,
      shell: options.shell || false,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = options.timeout
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, options.timeout)
      : null;

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
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

    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    if (typeof options.stdin === "string") {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }
  });
}

function registerCliTool(tools) {
  tools.register({
    name: "run_cli",
    description: "Run an arbitrary CLI command with arguments, working directory, environment variables, and optional stdin. Use this to interact with the application you are testing with chaos engineering.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to execute. On Windows, use an executable or shell built-in when shell=true.",
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Arguments to pass to the command.",
          default: [],
        },
        cwd: {
          type: "string",
          description: "Optional working directory for the command.",
        },
        env: {
          type: "object",
          description: "Optional environment variables to merge with process.env.",
        },
        stdin: {
          type: "string",
          description: "Optional stdin text to provide to the process.",
        },
        timeout: {
          type: "number",
          description: "Optional timeout in milliseconds before killing the process.",
          default: 30000,
        },
        shell: {
          type: "boolean",
          description: "Whether to run the command through a shell. Use this for shell built-ins or complex command lines.",
          default: false,
        },
      },
      required: ["command"],
    },
    execute: async ({ command, args = [], cwd, env = {}, stdin, timeout = 30000, shell = false }) => {
      const result = await spawnProcess(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdin,
        timeout,
        shell,
      });

      return {
        ok: result.ok,
        code: result.code,
        signal: result.signal,
        timedOut: result.timedOut,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    },
  });
}

module.exports = {
  registerCliTool,
};
