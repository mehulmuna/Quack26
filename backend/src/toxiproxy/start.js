const { runDockerCli } = require("../chaos/dockerClient");
const { waitForToxiproxyApi } = require("../chaos/ensureRuntime");

async function startToxiproxy() {
  await runDockerCli(["rm", "-f", "chaos-toxiproxy"]).catch(() => null);

  await runDockerCli([
    "run",
    "-d",
    "--name",
    "chaos-toxiproxy",
    "--network",
    "chaosnet",
    "-p",
    "8474:8474",
    "-p",
    "8666-8699:8666-8699",
    "shopify/toxiproxy",
    "-host",
    "0.0.0.0",
  ]);

  await waitForToxiproxyApi();
}

async function startToxiproxySimple() {
  await runDockerCli([
    "run",
    "-d",
    "--rm",
    "--name",
    "chaos-toxiproxy",
    "--network",
    "chaosnet",
    "-p",
    "8474:8474",
    "-p",
    "8666-8699:8666-8699",
    "shopify/toxiproxy",
    "-host",
    "0.0.0.0",
  ]);

  await waitForToxiproxyApi();
}

module.exports = {
  startToxiproxy,
  startToxiproxySimple,
};
