const { runDockerCli } = require("../../chaos/dockerClient");

const fetchImpl = globalThis.fetch || (() => {
    try {
        return require("node:undici").fetch;
    } catch (err) {
        return null;
    }
})();

const TOXIPROXY_URL = process.env.TOXIPROXY_URL || "http://localhost:8474";

async function tox(path, options = {}) {
    if (!fetchImpl) throw new Error("fetch is not available in this Node runtime.");

    const response = await fetchImpl(`${TOXIPROXY_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`Toxiproxy error ${response.status}: ${text}`);
    }

    try {
        return text ? JSON.parse(text) : { ok: true };
    } catch {
        return { ok: true, text };
    }
}

function registerToxiproxyTools(tools) {
    // tools.register({
    //     name: "toxiproxy_create_proxy",
    //     description: "Create a Toxiproxy proxy from a local listen port to an upstream host and port.",
    //     parameters: {
    //         type: "object",
    //         properties: {
    //             name: { type: "string" },
    //             listenPort: { type: "number" },
    //             upstreamHost: { type: "string" },
    //             upstreamPort: { type: "number" },
    //         },
    //         required: ["name", "listenPort", "upstreamHost", "upstreamPort"],
    //     },
    //     execute: async ({ name, listenPort, upstreamHost, upstreamPort }) => {
    //         return await tox("/proxies", {
    //             method: "POST",
    //             body: JSON.stringify({
    //                 name,
    //                 listen: `0.0.0.0:${listenPort}`,
    //                 upstream: `${upstreamHost}:${upstreamPort}`,
    //             }),
    //         });
    //     },
    // });

    // tools.register({
    //     name: "toxiproxy_delete_proxy",
    //     description: "Delete a Toxiproxy proxy.",
    //     parameters: {
    //         type: "object",
    //         properties: {
    //             name: { type: "string" },
    //         },
    //         required: ["name"],
    //     },
    //     execute: async ({ name }) => {
    //         return await tox(`/proxies/${name}`, {
    //             method: "DELETE",
    //         });
    //     },
    // });

    tools.register({
        name: "toxiproxy_enable_proxy",
        description: "Enable a Toxiproxy proxy.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string" },
            },
            required: ["name"],
        },
        execute: async ({ name }) => {
            return await tox(`/proxies/${name}`, {
                method: "POST",
                body: JSON.stringify({ enabled: true }),
            });
        },
    });

    tools.register({
        name: "toxiproxy_disable_proxy",
        description: "Disable a Toxiproxy proxy to simulate an API or service outage.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string" },
            },
            required: ["name"],
        },
        execute: async ({ name }) => {
            return await tox(`/proxies/${name}`, {
                method: "POST",
                body: JSON.stringify({ enabled: false }),
            });
        },
    });

    tools.register({
        name: "toxiproxy_add_latency",
        description: "Add latency and optional jitter to a proxy.",
        parameters: {
            type: "object",
            properties: {
                proxy: { type: "string" },
                latencyMs: { type: "number" },
                jitterMs: { type: "number", default: 0 },
                stream: {
                    type: "string",
                    enum: ["upstream", "downstream"],
                    default: "downstream",
                },
            },
            required: ["proxy", "latencyMs"],
        },
        execute: async ({ proxy, latencyMs, jitterMs = 0, stream = "downstream" }) => {
            return await tox(`/proxies/${proxy}/toxics`, {
                method: "POST",
                body: JSON.stringify({
                    name: `latency_${Date.now()}`,
                    type: "latency",
                    stream,
                    toxicity: 1.0,
                    attributes: {
                        latency: latencyMs,
                        jitter: jitterMs,
                    },
                }),
            });
        },
    });

    tools.register({
        name: "toxiproxy_add_timeout",
        description: "Add a timeout toxic to freeze traffic through a proxy.",
        parameters: {
            type: "object",
            properties: {
                proxy: { type: "string" },
                stream: {
                    type: "string",
                    enum: ["upstream", "downstream"],
                    default: "downstream",
                },
            },
            required: ["proxy"],
        },
        execute: async ({ proxy, stream = "downstream" }) => {
            return await tox(`/proxies/${proxy}/toxics`, {
                method: "POST",
                body: JSON.stringify({
                    name: `timeout_${Date.now()}`,
                    type: "timeout",
                    stream,
                    toxicity: 1.0,
                    attributes: {
                        timeout: 0,
                    },
                }),
            });
        },
    });

    tools.register({
        name: "toxiproxy_add_reset_peer",
        description: "Randomly reset connections to simulate packet drops or unstable networking.",
        parameters: {
            type: "object",
            properties: {
                proxy: { type: "string" },
                toxicity: {
                    type: "number",
                    description: "Probability from 0.0 to 1.0 that the toxic applies.",
                    default: 0.25,
                },
                stream: {
                    type: "string",
                    enum: ["upstream", "downstream"],
                    default: "downstream",
                },
            },
            required: ["proxy"],
        },
        execute: async ({ proxy, toxicity = 0.25, stream = "downstream" }) => {
            return await tox(`/proxies/${proxy}/toxics`, {
                method: "POST",
                body: JSON.stringify({
                    name: `reset_${Date.now()}`,
                    type: "reset_peer",
                    stream,
                    toxicity,
                    attributes: {},
                }),
            });
        },
    });

    tools.register({
        name: "toxiproxy_clear_toxics",
        description: "Remove all toxics from a proxy.",
        parameters: {
            type: "object",
            properties: {
                proxy: { type: "string" },
            },
            required: ["proxy"],
        },
        execute: async ({ proxy }) => {
            const proxyData = await tox(`/proxies/${proxy}`);

            const toxicNames = Array.isArray(proxyData.toxics)
                ? proxyData.toxics.map((t) => t.name)
                : Object.keys(proxyData.toxics || {});

            for (const toxicName of toxicNames) {
                await tox(`/proxies/${proxy}/toxics/${toxicName}`, {
                    method: "DELETE",
                });
            }

            return {
                ok: true,
                removed: toxicNames,
            };
        },
    });

    tools.register({
        name: "docker_block_domain",
        description: "Block a domain inside a Docker container by mapping it to 127.0.0.1 in /etc/hosts.",
        parameters: {
            type: "object",
            properties: {
                container: { type: "string" },
                domain: { type: "string" },
            },
            required: ["container", "domain"],
        },
        execute: async ({ container, domain }) => {
            const marker = `# chaos-block-domain:${domain}`;

            const script = `
      set -e
      if ! grep -q "${marker}" /etc/hosts; then
        echo "127.0.0.1 ${domain} ${marker}" >> /etc/hosts
      fi
      cat /etc/hosts
    `;

            const result = await runDockerCli([
                "exec",
                container,
                "sh",
                "-c",
                script,
            ]);

            return {
                ok: true,
                container,
                domain,
                stdout: result.stdout,
                stderr: result.stderr,
            };
        },
    });

    tools.register({
        name: "docker_unblock_domain",
        description: "Remove a domain block from a Docker container's /etc/hosts.",
        parameters: {
            type: "object",
            properties: {
                container: { type: "string" },
                domain: { type: "string" },
            },
            required: ["container", "domain"],
        },
        execute: async ({ container, domain }) => {
            const marker = `# chaos-block-domain:${domain}`;

            const script = `
      set -e
      grep -v "${marker}" /etc/hosts > /tmp/hosts.clean
      cat /tmp/hosts.clean > /etc/hosts
      cat /etc/hosts
    `;

            const result = await runDockerCli([
                "exec",
                container,
                "sh",
                "-c",
                script,
            ]);

            return {
                ok: true,
                container,
                domain,
                stdout: result.stdout,
                stderr: result.stderr,
            };
        },
    });
}

module.exports = {
    registerToxiproxyTools,
    tox,
    TOXIPROXY_URL,
};