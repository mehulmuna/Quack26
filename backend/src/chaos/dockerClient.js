const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const Docker = require("dockerode");

let dockerInstance = null;

function getDocker() {
  if (!dockerInstance) {
    const host = process.env.DOCKER_HOST;

    if (!host) {
      dockerInstance = new Docker();
    } else if (host.startsWith("npipe://")) {
      dockerInstance = new Docker({
        socketPath: host.replace("npipe://", ""),
      });
    } else if (host.startsWith("unix://")) {
      dockerInstance = new Docker({
        socketPath: host.replace("unix://", ""),
      });
    } else {
      dockerInstance = new Docker({
        host,
      });
    }
  }

  return dockerInstance;
}

/**
 * Resolve docker CLI on Windows when it is not on PATH.
 */
function resolveDockerBin() {
  if (process.env.DOCKER_BIN) {
    return process.env.DOCKER_BIN;
  }

  if (process.platform === "win32") {
    const candidates = [
      path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "Docker",
        "Docker",
        "resources",
        "bin",
        "docker.exe"
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "Docker",
        "Docker",
        "resources",
        "bin",
        "docker.exe"
      ),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return "docker";
}

function runDockerCli(args, options = {}) {
  const bin = resolveDockerBin();

  return new Promise((resolve, reject) => {
    execFile(bin, args, { windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        error.dockerBin = bin;
        reject(error);
        return;
      }
      resolve({ stdout: stdout?.toString() ?? "", stderr: stderr?.toString() ?? "" });
    });
  });
}

async function pingDocker() {
  try {
    await getDocker().ping();
    return true;
  } catch (err) {
    const hint =
      process.platform === "win32"
        ? "Start Docker Desktop and wait until it says Docker Engine is running."
        : "Ensure the Docker daemon is running.";

    throw new Error(
      `Docker is not available: ${err.message}\n${hint}\nDocker CLI path: ${resolveDockerBin()}`
    );
  }
}

async function ensureNetwork(name = "chaosnet") {
  const docker = getDocker();

  try {
    const networks = await docker.listNetworks({ filters: { name: [name] } });
    if (networks.length > 0) {
      return { ok: true, existed: true, name };
    }
  } catch {
    /* fall through */
  }

  await docker.createNetwork({ Name: name, CheckDuplicate: true });
  return { ok: true, created: true, name };
}

async function containerIsRunning(name) {
  const docker = getDocker();
  const list = await docker.listContainers({
    all: true,
    filters: { name: [name] },
  });
  const row = list.find((c) => c.Names?.some((n) => n === `/${name}` || n.endsWith(`/${name}`)));
  return row?.State === "running";
}

async function stopAndRemoveContainer(name) {
  const docker = getDocker();

  try {
    const container = docker.getContainer(name);
    await container.remove({ force: true });
    return { ok: true, stopped: name };
  } catch (err) {
    if (err.statusCode === 404) {
      return { ok: true, stopped: name, missing: true };
    }
    throw err;
  }
}

async function ensureContainer({
  name,
  image,
  network = "chaosnet",
  cmd,
  exposedPort,
}) {
  const docker = getDocker();

  if (await containerIsRunning(name)) {
    return { ok: true, existed: true, name };
  }

  try {
    const stale = docker.getContainer(name);
    await stale.remove({ force: true });
  } catch (err) {
    if (err.statusCode !== 404) throw err;
  }

  await runDockerCli(["pull", image]).catch(() => null);

  const container = await docker.createContainer({
    name,
    Image: image,
    Cmd: cmd,
    ExposedPorts: exposedPort ? { [`${exposedPort}/tcp`]: {} } : undefined,
    HostConfig: {
      NetworkMode: network,
    },
  });

  await container.start();
  return { ok: true, created: true, name };
}

module.exports = {
  getDocker,
  resolveDockerBin,
  runDockerCli,
  pingDocker,
  ensureNetwork,
  containerIsRunning,
  stopAndRemoveContainer,
  ensureContainer,
};
