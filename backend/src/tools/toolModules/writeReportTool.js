const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_REPORT_DIR = path.resolve(__dirname, "../../../data/reports");

function slugify(value) {
  return String(value || "report")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "report";
}

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function resolveReportPath(reportDir, fileName) {
  const safeBaseDir = path.resolve(reportDir);
  const requestedPath = path.resolve(safeBaseDir, fileName);
  const relativePath = path.relative(safeBaseDir, requestedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("fileName must stay inside the reports directory.");
  }

  return requestedPath;
}

function registerWriteReportTool(tools) {
  tools.register({
    name: "write_report",
    description:
      "Save an AI-written report to the local filesystem under the reports directory.",
    parameters: {
      type: "object",
      properties: {
        report: {
          type: "string",
          description: "The complete report content to write.",
        },
        title: {
          type: "string",
          description:
            "Optional report title used to create a filename when fileName is omitted.",
        },
        fileName: {
          type: "string",
          description:
            "Optional relative filename under the reports directory. Defaults to a timestamped Markdown file.",
        },
        append: {
          type: "boolean",
          description: "Append to the file instead of replacing it.",
          default: false,
        },
      },
      required: ["report"],
    },
    execute: async ({ report, title, fileName, append = false }) => {
      if (typeof report !== "string" || report.trim() === "") {
        throw new Error("report is required and must be a non-empty string.");
      }

      const reportDir = tools.data?.reportDir || DEFAULT_REPORT_DIR;
      const finalFileName =
        fileName || `${timestampForFilename()}-${slugify(title)}.md`;
      const reportPath = resolveReportPath(reportDir, finalFileName);

      await fs.mkdir(path.dirname(reportPath), { recursive: true });

      if (append) {
        await fs.appendFile(reportPath, `${report}\n`, "utf-8");
      } else {
        await fs.writeFile(reportPath, report, "utf-8");
      }

      return {
        ok: true,
        path: reportPath,
        bytes: Buffer.byteLength(report, "utf-8"),
        appended: Boolean(append),
      };
    },
  });
}

module.exports = {
  registerWriteReportTool,
};
