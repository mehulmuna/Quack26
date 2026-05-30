const { spawn } = require("node:child_process");

function resolvePythonCommand() {
  const candidates = [process.env.PYTHON, "python3", "python"].filter(Boolean);
  return candidates[0];
}

function spawnProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      windowsHide: true,
      shell: false,
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

function registerRunCodeTool(tools) {
  tools.register({
    name: "run_code",
    description: "Run JavaScript or Python code using an inline script or provided script path.",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: "Language to execute: javascript/js or python/py.",
        },
        code: {
          type: "string",
          description: "Inline source code to execute.",
        },
        scriptPath: {
          type: "string",
          description: "Optional path to a script file to execute instead of inline code.",
        },
        stdin: {
          type: "string",
          description: "Optional stdin text to provide to the process.",
        },
        cwd: {
          type: "string",
          description: "Optional working directory for execution.",
        },
        env: {
          type: "object",
          description: "Optional environment variables to merge with process.env.",
        },
        timeout: {
          type: "number",
          description: "Optional timeout in milliseconds before killing the process.",
          default: 30000,
        },
      },
      required: ["language"],
      anyOf: [
        { required: ["code"] },
        { required: ["scriptPath"] },
      ],
    },
    execute: async ({
      language,
      code,
      scriptPath,
      stdin,
      cwd,
      env = {},
      timeout = 30000,
    }) => {
      const requestedLanguage = String(language || "").toLowerCase();
      let command;
      let args = [];

      const pythonCmd = resolvePythonCommand();

      if (scriptPath) {
        if (requestedLanguage === "javascript" || requestedLanguage === "js") {
          command = process.execPath;
          args = [scriptPath];
        } else if (requestedLanguage === "python" || requestedLanguage === "py") {
          if (!pythonCmd) {
            throw new Error("Python executable not found on PATH or via PYTHON environment variable.");
          }
          command = pythonCmd;
          args = [scriptPath];
        } else {
          throw new Error("Unsupported language. Use javascript/js or python/py.");
        }
      } else {
        if (!code) {
          throw new Error("Either code or scriptPath must be provided.");
        }

        if (requestedLanguage === "javascript" || requestedLanguage === "js") {
          command = process.execPath;
          args = ["-e", code];
        } else if (requestedLanguage === "python" || requestedLanguage === "py") {
          if (!pythonCmd) {
            throw new Error("Python executable not found on PATH or via PYTHON environment variable.");
          }
          command = pythonCmd;
          args = ["-c", code];
        } else {
          throw new Error("Unsupported language. Use javascript/js or python/py.");
        }
      }

      const result = await spawnProcess(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdin,
        timeout,
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
  registerRunCodeTool,
};
