const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_DIR = path.resolve(__dirname, "../data");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
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

function createRouter({ dashboardData, mainLoop }) {
    const router = express.Router();

    router.get("/health", (_req, res) => {
        res.json({ ok: true });
    });

    router.get("/dashboard", (_req, res) => {
        res.json(dashboardData);
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

    const startHandler = async (_req, res) => {
        res.json(await mainLoop.start());
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
