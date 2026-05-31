const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const { runCodexExec } = require("./tools/toolModules/codexTool");

const DATA_DIR = path.resolve(__dirname, "../data");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
const TRACE_FILE = path.join(DATA_DIR, "trace.txt");
const REPORT_EXTENSIONS = new Set([".md", ".txt"]);

function isReportFile(fileName) {
    return REPORT_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function resolveInside(baseDir, fileName) {
    const safeBaseDir = path.resolve(baseDir);
    const targetPath = path.resolve(safeBaseDir, fileName);
    const relativePath = path.relative(safeBaseDir, targetPath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        const err = new Error("Path must stay inside the data directory.");
        err.status = 400;
        throw err;
    }

    return targetPath;
}

async function listReports() {
    await fs.mkdir(REPORTS_DIR, { recursive: true });

    const entries = await fs.readdir(REPORTS_DIR, { withFileTypes: true });
    const reportEntries = entries.filter(
        (entry) => entry.isFile() && isReportFile(entry.name)
    );

    const reports = await Promise.all(
        reportEntries.map(async (entry) => {
            const reportPath = path.join(REPORTS_DIR, entry.name);
            const stats = await fs.stat(reportPath);

            return {
                id: entry.name,
                fileName: entry.name,
                title: path.basename(entry.name, path.extname(entry.name)),
                extension: path.extname(entry.name),
                size: stats.size,
                updatedAt: stats.mtime.toISOString(),
            };
        })
    );

    return reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function readReport(reportId) {
    if (!isReportFile(reportId)) {
        const err = new Error("Report must be a Markdown or text file.");
        err.status = 400;
        throw err;
    }

    const reportPath = resolveInside(REPORTS_DIR, reportId);
    const stats = await fs.stat(reportPath);
    const content = await fs.readFile(reportPath, "utf-8");

    return {
        id: reportId,
        fileName: reportId,
        title: path.basename(reportId, path.extname(reportId)),
        extension: path.extname(reportId),
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
        content,
    };
}

async function readAnalysis() {
    const candidates = ["analysis.md", "analysis.txt"];

    for (const fileName of candidates) {
        const analysisPath = resolveInside(DATA_DIR, fileName);

        try {
            const stats = await fs.stat(analysisPath);
            const content = await fs.readFile(analysisPath, "utf-8");

            return {
                fileName,
                extension: path.extname(fileName),
                size: stats.size,
                updatedAt: stats.mtime.toISOString(),
                content,
            };
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }

    const err = new Error("No analysis.md or analysis.txt found in data.");
    err.status = 404;
    throw err;
}

function reportType(fileName) {
    const name = fileName.toLowerCase();
    return name.includes("summary") ? "summary" : "analysis";
}

function asDashboardReport(report, content) {
    return {
        ...report,
        report_type: reportType(report.fileName || report.id || report.title),
        status: "complete",
        created_date: report.updatedAt,
        content,
    };
}

async function listTraceEvents() {
    try {
        const content = await fs.readFile(TRACE_FILE, "utf-8");

        return content
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line, index) => {
                const match = line.match(/^\[(.+?)\]\s*(.*)$/);
                const message = match?.[2] || line;
                return {
                    id: `trace-${index}`,
                    event_type: /tool call/i.test(message) ? "tool_call" : "ping",
                    message,
                    created_date: match?.[1],
                };
            })
            .reverse();
    } catch (err) {
        if (err.code === "ENOENT") return [];
        throw err;
    }
}

async function getDashboardData(mainLoop) {
    const reports = (await listReports()).map((report) => asDashboardReport(report));

    try {
        const analysis = await readAnalysis();
        reports.unshift(asDashboardReport({
            id: analysis.fileName,
            fileName: analysis.fileName,
            title: path.basename(analysis.fileName, analysis.extension),
            extension: analysis.extension,
            size: analysis.size,
            updatedAt: analysis.updatedAt,
        }, analysis.content));
    } catch (err) {
        if (err.status !== 404) throw err;
    }

    return {
        status: mainLoop.status(),
        reports,
        traceEvents: await listTraceEvents(),
    };
}

function createRouter({ dashboardData, mainLoop }) {
    const router = express.Router();

    console.log("starting router");

    router.get("/health", (_req, res) => {
        res.json({ ok: true });
    });

    router.post("/fix", async (_req, res) => {
        console.log("rec report");
        try {
            const report = _req.body.report;

            let prompt = (await readReport(report)).content;
            
            console.log("Running blue agent fix");
            const result = await runCodexExec({prompt});
            console.log("Finished fix");

            res.json({
                ok: true,
                result,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                ok: false,
                error: err.message,
            });
        }
    });

    router.get("/isRunning", (_req, res) => {
        res.json({ running: Boolean(mainLoop.status().running) });
    });

    router.get("/dashboard", async (_req, res, next) => {
        try {
            res.json(dashboardData || await getDashboardData(mainLoop));
        } catch (err) {
            next(err);
        }
    });

    router.get("/reports", async (_req, res, next) => {
        try {
            res.json({ reports: await listReports() });
        } catch (err) {
            next(err);
        }
    });

    router.get("/reports/:reportId", async (req, res, next) => {
        try {
            res.json(await readReport(req.params.reportId));
        } catch (err) {
            if (err.code === "ENOENT") {
                err.status = 404;
                err.message = "Report not found.";
            }

            next(err);
        }
    });

    router.get("/analysis", async (_req, res, next) => {
        try {
            res.json(await readAnalysis());
        } catch (err) {
            next(err);
        }
    });

    const startHandler = async (req, res) => {
        res.json(await mainLoop.start(req.body || {}));
    };

    const stopHandler = (_req, res) => {
        res.json(mainLoop.stop());
    };

    router.get("/start", startHandler);
    router.post("/start", startHandler);

    router.get("/stop", stopHandler);
    router.post("/stop", stopHandler);

    const analyzeHandler = (_req, res) => {
        res.status(202).json({ ok: true });
    };

    router.get("/analyze", analyzeHandler);
    router.post("/analyze", analyzeHandler);

    router.use((err, _req, res, _next) => {
        const status = err.status || 500;

        res.status(status).json({
            ok: false,
            error: err.message || "Internal server error",
        });
    });

    return router;
}

module.exports = {
    createRouter,
    listReports,
    readReport,
    readAnalysis,
};
