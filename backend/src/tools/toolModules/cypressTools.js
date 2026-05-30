const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

const FRONTEND_DIR = path.resolve(__dirname, "../../../frontend");
const CYPRESS_E2E_DIR = path.join(FRONTEND_DIR, "cypress", "e2e");

function ensureDirectory(dir) {
  return fs.mkdir(dir, { recursive: true });
}

function spawnProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
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

function normalizeTestFileName(fileName) {
  if (!fileName) throw new Error("fileName is required");
  const normalized = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return normalized.endsWith(".cy.js") || normalized.endsWith(".cy.ts")
    ? normalized
    : `${normalized}.cy.js`;
}

function registerCypressTools(tools) {
  tools.register({
    name: "write_cypress_test",
    description: "Write a Cypress test spec file for the frontend application.",
    parameters: {
      type: "object",
      properties: {
        fileName: {
          type: "string",
          description: "The name of the Cypress test file to create, e.g. login.cy.js.",
        },
        code: {
          type: "string",
          description: "The Cypress test code to write into the file.",
        },
        overwrite: {
          type: "boolean",
          description: "Whether to overwrite an existing spec file.",
          default: false,
        },
      },
      required: ["fileName", "code"],
    },
    execute: async ({ fileName, code, overwrite = false }) => {
      const normalizedName = normalizeTestFileName(fileName);
      const outPath = path.join(CYPRESS_E2E_DIR, normalizedName);

      await ensureDirectory(CYPRESS_E2E_DIR);

      try {
        const existing = await fs.access(outPath).then(() => true).catch(() => false);
        if (existing && !overwrite) {
          return {
            ok: false,
            error: `File already exists: ${outPath}. Set overwrite=true to replace it.`,
          };
        }

        await fs.writeFile(outPath, code, "utf8");

        return {
          ok: true,
          path: outPath,
          message: "Cypress test file written successfully.",
        };
      } catch (error) {
        return {
          ok: false,
          error: error.message || String(error),
        };
      }
    },
  });

  tools.register({
    name: "run_cypress_test",
    description: "Run Cypress tests for the frontend application.",
    parameters: {
      type: "object",
      properties: {
        spec: {
          type: "string",
          description: "Optional spec pattern or file path to run, relative to the frontend directory.",
        },
        headed: {
          type: "boolean",
          description: "Run the browser in headed mode instead of headless.",
          default: false,
        },
        browser: {
          type: "string",
          description: "Optional browser to use for the run.",
        },
        env: {
          type: "object",
          description: "Optional environment variables passed to the Cypress process.",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds for the Cypress process.",
          default: 120000,
        },
      },
    },
    execute: async ({ spec, headed = false, browser, env = {}, timeout = 120000 }) => {
      const args = ["exec", "--yes", "cypress", "run", "--config", "video=false"];

      if (spec) {
        args.push("--spec", spec);
      }
      if (headed) {
        args.push("--headed");
      }
      if (browser) {
        args.push("--browser", browser);
      }

      try {
        const result = await spawnProcess("npm", args, {
          cwd: FRONTEND_DIR,
          env,
          timeout,
        });

        return {
          ok: result.ok,
          code: result.code,
          stdout: result.stdout,
          stderr: result.stderr,
          timedOut: result.timedOut,
        };
      } catch (error) {
        return {
          ok: false,
          error: error.message || String(error),
        };
      }
    },
  });
}

module.exports = {
  registerCypressTools,
};
