const { tox, TOXIPROXY_URL } = require("../tools/toolModules/toxiproxyTools");
const {
  pingDocker,
  ensureNetwork,
  ensureContainer,
  runDockerCli,
} = require("./dockerClient");

const TOXIPROXY_CONTAINER = "chaos-toxiproxy";
const DEFAULT_NETWORK = "chaosnet";

const API_SERVER = {
  containerName: "api-server",
  proxyName: "api-server",
  image: "node:22-alpine",
  appPort: 8080,
  listenPort: 8666,
  cmd: [
    "sh",
    "-c",
    "node -e \"require('http').createServer((req,res)=>{res.writeHead(200);res.end('ok')}).listen(8080,'0.0.0.0',()=>console.log('api-server listening'))\"",
  ],
};

async function waitForToxiproxyApi(maxAttempts = 30, intervalMs = 500) {
  const fetchImpl = globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("fetch is not available in this Node runtime");
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetchImpl(`${TOXIPROXY_URL}/proxies`);
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `Toxiproxy API not reachable at ${TOXIPROXY_URL}. Run: npm run start:toxiproxy`
  );
}

async function ensureToxiproxyContainer(network = DEFAULT_NETWORK) {
  if (await isToxiproxyRunning()) {
    return { ok: true, existed: true, name: TOXIPROXY_CONTAINER };
  }

  await runDockerCli(["rm", "-f", TOXIPROXY_CONTAINER]).catch(() => null);

  await runDockerCli([
    "run",
    "-d",
    "--name",
    TOXIPROXY_CONTAINER,
    "--network",
    network,
    "-p",
    "8474:8474",
    "-p",
    "8666-8699:8666-8699",
    "shopify/toxiproxy",
    "-host",
    "0.0.0.0",
  ]);

  await waitForToxiproxyApi();
  return { ok: true, created: true, name: TOXIPROXY_CONTAINER };
}

async function isToxiproxyRunning() {
  try {
    const fetchImpl = globalThis.fetch;
    const res = await fetchImpl(`${TOXIPROXY_URL}/proxies`);
    return res.ok;
  } catch {
    return false;
  }
}

async function proxyExists(name) {
  try {
    await tox(`/proxies/${name}`);
    return true;
  } catch (err) {
    if (String(err.message).includes("404")) return false;
    throw err;
  }
}

async function ensureProxyReady(proxyName) {
  if (await proxyExists(proxyName)) {
    return { ok: true, proxy: proxyName };
  }

  if (
    proxyName === API_SERVER.proxyName ||
    proxyName === API_SERVER.containerName
  ) {
    await ensureChaosRuntime({ ensureApiServer: true });
    return { ok: true, proxy: proxyName, bootstrapped: true };
  }

  throw new Error(
    `Toxiproxy proxy "${proxyName}" not found. Start chaos runtime or create the proxy first.`
  );
}

async function ensureToxiproxyProxy({
  name,
  listenPort,
  upstreamHost,
  upstreamPort,
}) {
  if (await proxyExists(name)) {
    return { ok: true, existed: true, name };
  }

  await tox("/proxies", {
    method: "POST",
    body: JSON.stringify({
      name,
      listen: `0.0.0.0:${listenPort}`,
      upstream: `${upstreamHost}:${upstreamPort}`,
    }),
  });

  return { ok: true, created: true, name, listenPort, upstreamHost, upstreamPort };
}

/**
 * Ensure Docker, Toxiproxy, chaos network, api-server container, and api-server proxy.
 */
async function ensureChaosRuntime(opts = {}) {
  const network = opts.network ?? DEFAULT_NETWORK;
  const ensureApiServer = opts.ensureApiServer !== false;

  await pingDocker();

  await ensureNetwork(network);
  await ensureToxiproxyContainer(network);

  let apiServer = null;
  if (ensureApiServer) {
    apiServer = await ensureContainer({
      name: API_SERVER.containerName,
      image: API_SERVER.image,
      network,
      cmd: API_SERVER.cmd,
      exposedPort: API_SERVER.appPort,
    });

    await new Promise((r) => setTimeout(r, 1500));

    const proxy = await ensureToxiproxyProxy({
      name: API_SERVER.proxyName,
      listenPort: API_SERVER.listenPort,
      upstreamHost: API_SERVER.containerName,
      upstreamPort: API_SERVER.appPort,
    });

    apiServer.proxy = proxy;
  }

  return {
    ok: true,
    toxiproxyUrl: TOXIPROXY_URL,
    network,
    apiServer,
  };
}

module.exports = {
  ensureChaosRuntime,
  ensureToxiproxyContainer,
  ensureToxiproxyProxy,
  ensureProxyReady,
  waitForToxiproxyApi,
  proxyExists,
  isToxiproxyRunning,
  API_SERVER,
};
