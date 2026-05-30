const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_MAX_BYTES = 256 * 1024;

function createPathGuard(rootDir) {
  const resolvedRoot = path.resolve(rootDir);

  return function resolveSafe(relativePath = ".") {
    const resolved = path.resolve(resolvedRoot, relativePath);
    const relative = path.relative(resolvedRoot, resolved);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Path escapes target directory: ${relativePath}`);
    }

    return resolved;
  };
}

/**
 * Richard's file-reading tools — scoped to a single target directory.
 */
function registerFileTools(tools, { rootDir, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  if (!rootDir) throw new Error("rootDir is required for file tools");
  const resolveSafe = createPathGuard(rootDir);

  tools.register({
    name: "list_directory",
    description:
      "List files and subdirectories at a path relative to the target codebase root. Richard's file-reading tool.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Directory path relative to the target root. Use '.' for the root.",
          default: ".",
        },
      },
    },
    execute: async ({ path: relativePath = "." }) => {
      const dirPath = resolveSafe(relativePath);
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      return {
        path: relativePath,
        entries: entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
        })),
      };
    },
  });

  tools.register({
    name: "read_file",
    description:
      "Read a text file relative to the target codebase root. Richard's file-reading tool.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to the target root.",
        },
        maxBytes: {
          type: "integer",
          description: "Maximum bytes to read (default 262144).",
        },
      },
      required: ["path"],
    },
    execute: async ({ path: relativePath, maxBytes: limit = maxBytes }) => {
      const filePath = resolveSafe(relativePath);
      const stat = await fs.stat(filePath);

      if (!stat.isFile()) {
        throw new Error(`Not a file: ${relativePath}`);
      }

      if (stat.size > limit) {
        const handle = await fs.open(filePath, "r");
        try {
          const buffer = Buffer.alloc(limit);
          await handle.read(buffer, 0, limit, 0);
          return {
            path: relativePath,
            truncated: true,
            size: stat.size,
            content: buffer.toString("utf-8"),
          };
        } finally {
          await handle.close();
        }
      }

      const content = await fs.readFile(filePath, "utf-8");
      return {
        path: relativePath,
        truncated: false,
        size: stat.size,
        content,
      };
    },
  });
}

module.exports = {
  registerFileTools,
  createPathGuard,
};
