const assert = require("assert");
const { execFile } = require("child_process");
const { startToxiproxy } = require("../toxiproxy/start");
const { pingDocker } = require("../chaos/dockerClient");

const INPUTS = {
    name: "liftlog",
    dir: "C:/Users/adria/source/repos/osu/swe/goofygoobers",
    run: {
        "backend": "npm start",
        "frontend": "npm start"
    }
};
const tools = require("../tools/registerTools")(INPUTS);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();

  return {
    ok: res.ok,
    status: res.status,
    text,
  };
}

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}

    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function timedFetch(url) {
  const start = Date.now();
  const result = await fetchText(url);
  const elapsedMs = Date.now() - start;

  return {
    ...result,
    elapsedMs,
  };
}

async function cleanup() {
  await tools.execute("docker_stop_instance", {
    name: "demo-app",
  }).catch(() => null);

  await run("docker", ["rm", "-f", "chaos-toxiproxy"])
    .catch(() => null);
}

async function main() {
  console.log("Checking Docker...");
await pingDocker();
  console.log("Cleaning old containers...");
  await cleanup();

  console.log("Creating Docker network...");
  const networkResult = await tools.execute("docker_create_network", {
    name: "chaosnet",
  });

  assert(networkResult.ok, "docker_create_network failed");

  console.log("Starting Toxiproxy...");
  await startToxiproxy();

  console.log("Checking Toxiproxy API...");
  await waitForHttp("http://localhost:8474/proxies");

  const proxiesBefore = await fetchText("http://localhost:8474/proxies");
  assert(proxiesBefore.ok, "Toxiproxy API did not respond");
  console.log("Toxiproxy API OK:", proxiesBefore.text);

  console.log("Starting demo app container...");
  const appResult = await tools.execute("docker_run_instance", {
    name: "demo-app",
    image: "node:22-alpine",
    command: [
        "node",
        "-e",
        `
        require("http").createServer((req, res) => {
        if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
            return;
        }

        res.end("hello from demo-app");
        }).listen(3000, "0.0.0.0", () => {
        console.log("demo-app listening on 3000");
        });
        `,
    ],
});

await new Promise(r => setTimeout(r, 1000));

const logs3 = await tools.execute("docker_logs", {
  name: "demo-app",
  tail: 100,
});

console.log("APP LOGS:", logs3);

  assert(appResult.ok, "docker_run_instance failed");

  console.log("Checking docker_exec...");
  const execResult = await tools.execute("docker_exec", {
    name: "demo-app",
    command: ["node", "-v"],
  });

  assert(
    execResult.stdout.includes("v"),
    `docker_exec failed: ${JSON.stringify(execResult)}`
  );

  console.log("Creating Toxiproxy proxy...");
  const proxyResult = await tools.execute("toxiproxy_create_proxy", {
    name: "demo_proxy",
    listenPort: 8666,
    upstreamHost: "demo-app",
    upstreamPort: 3000,
  });

  assert(proxyResult.name === "demo_proxy", "toxiproxy_create_proxy failed");

  console.log("Waiting for proxied app...");
  await waitForHttp("http://localhost:8666/health");

  console.log("Testing normal proxy response...");
  const normal = await timedFetch("http://localhost:8666/");
  assert(normal.ok, "Normal proxied request failed");
  assert(
    normal.text.includes("hello from demo-app"),
    `Unexpected normal response: ${normal.text}`
  );

  console.log(`Normal response time: ${normal.elapsedMs}ms`);

  console.log("Adding latency toxic...");
  await tools.execute("toxiproxy_add_latency", {
    proxy: "demo_proxy",
    latencyMs: 800,
    jitterMs: 0,
  });

  await sleep(500);

  const delayed = await timedFetch("http://localhost:8666/");
  assert(delayed.ok, "Delayed proxied request failed");

  console.log(`Delayed response time: ${delayed.elapsedMs}ms`);

  assert(
    delayed.elapsedMs >= 650,
    `Latency toxic did not seem to apply. Expected >=650ms, got ${delayed.elapsedMs}ms`
  );

  console.log("Clearing toxics...");
  const clearResult = await tools.execute("toxiproxy_clear_toxics", {
    proxy: "demo_proxy",
  });

  assert(clearResult.ok, "toxiproxy_clear_toxics failed");

  await sleep(500);

  const afterClear = await timedFetch("http://localhost:8666/");
  assert(afterClear.ok, "Request after clearing toxics failed");

  console.log(`After clear response time: ${afterClear.elapsedMs}ms`);

  assert(
    afterClear.elapsedMs < delayed.elapsedMs,
    "Clearing toxics did not reduce response time"
  );

  console.log("Disabling proxy...");
  await tools.execute("toxiproxy_disable_proxy", {
    name: "demo_proxy",
  });

  await sleep(500);

  let disabledFailed = false;

  try {
    await fetch("http://localhost:8666/", {
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    disabledFailed = true;
  }

  assert(disabledFailed, "Proxy disable did not break requests");

  console.log("Re-enabling proxy...");
  await tools.execute("toxiproxy_enable_proxy", {
    name: "demo_proxy",
  });

  await waitForHttp("http://localhost:8666/health");

  const afterEnable = await fetchText("http://localhost:8666/");
  assert(afterEnable.ok, "Proxy did not recover after enable");

  console.log("Checking docker_logs...");
  const logs = await tools.execute("docker_logs", {
    name: "demo-app",
    tail: 50,
  });

  const combinedLogs = `${logs.stdout || ""}\n${logs.stderr || ""}`;

  assert(
    combinedLogs.includes("demo-app listening on 3000"),
    `docker_logs failed. Logs: ${combinedLogs}`
  );

  console.log("Deleting proxy...");
  await tools.execute("toxiproxy_delete_proxy", {
    name: "demo_proxy",
  });

  const proxiesAfterDelete = await fetchText("http://localhost:8474/proxies");
  assert(
    !proxiesAfterDelete.text.includes("demo_proxy"),
    "Proxy still exists after delete"
  );

  console.log("Stopping app container...");
  await tools.execute("docker_stop_instance", {
    name: "demo-app",
  });

  console.log("");
  console.log("✅ ALL CHAOS TOOL TESTS PASSED");
  console.log("");
  console.log("Verified:");
  console.log("- Docker network creation");
  console.log("- Toxiproxy startup");
  console.log("- Toxiproxy API health");
  console.log("- Docker app container startup");
  console.log("- docker_exec");
  console.log("- docker_logs");
  console.log("- proxy creation");
  console.log("- proxy request routing");
  console.log("- latency injection");
  console.log("- toxic clearing");
  console.log("- proxy disable/enable");
  console.log("- proxy deletion");
  console.log("- container cleanup");
}

main()
  .catch(async (err) => {
    console.error("");
    console.error("❌ TEST FAILED");
    console.error(err);

    if (err.stdout) console.error("stdout:", err.stdout);
    if (err.stderr) console.error("stderr:", err.stderr);

    await cleanup();
    process.exit(1);
  });