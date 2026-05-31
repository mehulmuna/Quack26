const assert = require("node:assert/strict");
const express = require("express");
const { createRouter } = require("../routes");

async function main() {
  const app = express();

  app.use(express.json());
  app.use(
    createRouter({
      dashboardData: { ok: true },
      mainLoop: {
        start: async () => ({ ok: true, started: true }),
        stop: () => ({ ok: true, stopped: true }),
      },
    })
  );

  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    console.log(`Testing routes at ${baseUrl}\n`);

    for (const route of ["/health", "/dashboard", "/reports", "/start", "/stop"]) {
      const res = await fetch(baseUrl + route);
      const body = await res.text();

      console.log(`${route} -> ${res.status}`);
      console.log(body);
      console.log("");

      assert.equal(res.status, 200, route);
    }

    const reports = await (await fetch(baseUrl + "/reports")).json();
    if (reports.reports[0]) {
      const res = await fetch(`${baseUrl}/reports/${reports.reports[0].id}`);
      const body = await res.text();

      console.log(`/reports/${reports.reports[0].id} -> ${res.status}`);
      console.log(body.slice(0, 500));
      console.log("");

      assert.equal(res.status, 200, "/reports/:id");
    } else {
      console.log("No reports found, skipping /reports/:id\n");
    }

    const analyze = await fetch(baseUrl + "/analyze", { method: "POST" });
    const analyzeBody = await analyze.text();

    console.log("/analyze -> " + analyze.status);
    console.log(analyzeBody);
    console.log("");

    assert.equal(analyze.status, 202, "/analyze");

    console.log("routes smoke test passed");
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
