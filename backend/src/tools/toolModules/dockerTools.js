const { runDockerCli } = require("../../chaos/dockerClient");

function normalizeCpuLimit(cpus, { allowUnlimited = true } = {}) {
  if (cpus === undefined || cpus === null || cpus === "") {
    return null;
  }

  const value = Number(cpus);
  if (!Number.isFinite(value)) {
    throw new Error("cpus must be a finite number");
  }

  if (value < 0) {
    throw new Error("cpus must be greater than or equal to 0");
  }

  if (!allowUnlimited && value === 0) {
    throw new Error("cpus must be greater than 0");
  }

  return String(value);
}

async function updateContainerCpuLimit(name, cpus) {
  const cpuLimit = normalizeCpuLimit(cpus);
  if (cpuLimit === null) {
    throw new Error("cpus is required");
  }

  const result = await runDockerCli(["update", "--cpus", cpuLimit, name]);

  return {
    ok: true,
    name,
    cpus: cpuLimit === "0" ? "unlimited" : Number(cpuLimit),
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function registerDockerTools(tools) {
  tools.register({
    name: "docker_create_network",
    description: "Create a Docker network if it does not already exist.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", default: "chaosnet" },
      },
    },
    execute: async ({ name = "chaosnet" }) => {
      const { ensureNetwork } = require("../../chaos/dockerClient");
      return await ensureNetwork(name);
    },
  });

  tools.register({
    name: "docker_run_instance",
    description: `Run an app container attached to the chaos Docker network.
    Current project run info: ${JSON.stringify(tools.data?.run)}`,
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        image: { type: "string" },
        command: {
          type: "array",
          items: { type: "string" },
        },
        network: { type: "string", default: "chaosnet" },
        cpus: {
          type: "number",
          description:
            "Optional hard CPU cap in Docker CPU units. Example: 0.1 means 10% of one CPU core. Use 0 or omit for unlimited.",
          default: 0,
        },
      },
      required: ["name", "image"],
    },
    execute: async ({ name, image, command = [], network = "chaosnet", cpus }) => {
      await runDockerCli(["rm", "-f", name]).catch(() => null);

      const cpuLimit = normalizeCpuLimit(cpus);
      const args = [
        "run",
        "-d",
        "--name",
        name,
        "--network",
        network,
      ];

      if (cpuLimit && cpuLimit !== "0") {
        args.push("--cpus", cpuLimit);
      }

      args.push(image, ...command);

      const result = await runDockerCli(args);

      return {
        ok: true,
        name,
        image,
        cpus: cpuLimit && cpuLimit !== "0" ? Number(cpuLimit) : "unlimited",
        containerId: result.stdout.trim(),
      };
    },
  });

  tools.register({
    name: "docker_stop_instance",
    description: "Stop and remove a Docker container.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
    execute: async ({ name }) => {
      const { stopAndRemoveContainer } = require("../../chaos/dockerClient");
      return await stopAndRemoveContainer(name);
    },
  });

  tools.register({
    name: "docker_logs",
    description: "Get logs from a Docker container.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        tail: { type: "number", default: 200 },
      },
      required: ["name"],
    },
    execute: async ({ name, tail = 200 }) => {
      const result = await runDockerCli(["logs", "--tail", String(tail), name]);

      return {
        stdout: result.stdout,
        stderr: result.stderr,
      };
    },
  });

  tools.register({
    name: "docker_set_cpu_limit",
    description:
      "Change a running Docker container's CPU hard cap on the fly. Use cpus 0 to remove the limit; 0.1 means 10% of one CPU core.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        cpus: {
          type: "number",
          description:
            "Docker CPU cap. Example: 1 = one full core, 0.5 = half a core, 0.1 = 10% of one core, 0 = unlimited.",
        },
      },
      required: ["name", "cpus"],
    },
    execute: async ({ name, cpus }) => updateContainerCpuLimit(name, cpus),
  });

  tools.register({
    name: "docker_restore_cpu_limit",
    description: "Remove a Docker container CPU limit by setting its CPU cap back to unlimited.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
    execute: async ({ name }) => updateContainerCpuLimit(name, 0),
  });

  tools.register({
    name: "docker_exec",
    description: "Run a command inside a Docker container.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        command: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["name", "command"],
    },
    execute: async ({ name, command }) => {
      const result = await runDockerCli(["exec", name, ...command]);

      return {
        stdout: result.stdout,
        stderr: result.stderr,
      };
    },
  });
}

module.exports = {
  registerDockerTools,
  normalizeCpuLimit,
  updateContainerCpuLimit,
};
