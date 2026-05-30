const { tox } = require("./toxiproxyTools");
const { stopAndRemoveContainer } = require("../../chaos/dockerClient");
const {
  ensureChaosRuntime,
  proxyExists,
  API_SERVER,
} = require("../../chaos/ensureRuntime");

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

/**
 * Adrian's chaos engineering tools (failure injection).
 */
function registerAdrianTools(tools) {
  tools.register({
    name: "injectLatency",
    description:
      "Adrian's tool: inject network latency on a Toxiproxy proxy for a service. Use proxy name from architecture memory.",
    parameters: {
      type: "object",
      properties: {
        proxy: {
          type: "string",
          description: "Toxiproxy proxy name.",
        },
        service: {
          type: "string",
          description: "Service name (used as proxy name if proxy omitted).",
        },
        latencyMs: {
          type: "number",
          description: "Latency in milliseconds.",
        },
        milliseconds: {
          type: "number",
          description: "Alias for latencyMs.",
        },
        jitterMs: {
          type: "number",
          description: "Optional jitter in milliseconds.",
          default: 0,
        },
      },
    },
    execute: async ({ proxy, service, latencyMs, milliseconds, jitterMs = 0 }) => {
      const proxyName = proxy || service;
      const ms = latencyMs ?? milliseconds;
      if (!proxyName || ms == null) {
        throw new Error("injectLatency requires proxy/service and latencyMs (or milliseconds)");
      }

      await ensureProxyReady(proxyName);

      const result = await tox(`/proxies/${proxyName}/toxics`, {
        method: "POST",
        body: JSON.stringify({
          name: `latency_${Date.now()}`,
          type: "latency",
          stream: "downstream",
          toxicity: 1.0,
          attributes: { latency: ms, jitter: jitterMs },
        }),
      });

      return { ok: true, proxy: proxyName, latencyMs: ms, jitterMs, result };
    },
  });

  tools.register({
    name: "stopContainer",
    description:
      "Adrian's tool: stop and remove a Docker container (simulate service crash).",
    parameters: {
      type: "object",
      properties: {
        container: {
          type: "string",
          description: "Docker container name.",
        },
        name: {
          type: "string",
          description: "Alias for container name.",
        },
      },
    },
    execute: async ({ container, name }) => {
      const containerName = container || name;
      if (!containerName) {
        throw new Error("stopContainer requires container or name");
      }

      return await stopAndRemoveContainer(containerName);
    },
  });

  tools.register({
    name: "packetDropping",
    description:
      "Adrian's tool: simulate packet loss / unstable network via Toxiproxy reset_peer toxic.",
    parameters: {
      type: "object",
      properties: {
        proxy: {
          type: "string",
          description: "Toxiproxy proxy name.",
        },
        service: {
          type: "string",
          description: "Service name (used as proxy if proxy omitted).",
        },
        toxicity: {
          type: "number",
          description: "Probability 0.0–1.0 that connections reset.",
          default: 0.25,
        },
      },
    },
    execute: async ({ proxy, service, toxicity = 0.25 }) => {
      const proxyName = proxy || service;
      if (!proxyName) {
        throw new Error("packetDropping requires proxy or service");
      }

      await ensureProxyReady(proxyName);

      const result = await tox(`/proxies/${proxyName}/toxics`, {
        method: "POST",
        body: JSON.stringify({
          name: `reset_${Date.now()}`,
          type: "reset_peer",
          stream: "downstream",
          toxicity,
          attributes: {},
        }),
      });

      return { ok: true, proxy: proxyName, toxicity, result };
    },
  });
}

const ADRIAN_TOOL_NAMES = ["injectLatency", "stopContainer", "packetDropping"];

module.exports = {
  registerAdrianTools,
  ADRIAN_TOOL_NAMES,
};
