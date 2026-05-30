const { runDockerCli } = require("../../chaos/dockerClient");

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
    description: "Run an app container attached to the chaos Docker network.",
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
      },
      required: ["name", "image"],
    },
    execute: async ({ name, image, command = [], network = "chaosnet" }) => {
      await runDockerCli(["rm", "-f", name]).catch(() => null);

      const args = [
        "run",
        "-d",
        "--name",
        name,
        "--network",
        network,
        image,
        ...command,
      ];

      const result = await runDockerCli(args);

      return {
        ok: true,
        name,
        image,
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
};