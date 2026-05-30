const { execFile } = require("child_process");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
        return;
      }

      resolve({
        stdout,
        stderr,
      });
    });
  });
}

async function startToxiproxy() {
  // remove old one if it exists
  await run("docker", ["rm", "-f", "chaos-toxiproxy"])
    .catch(() => null);

  await run("docker", [
    "run",
    "-d",
    "--name",
    "chaos-toxiproxy",
    "--network",
    "chaosnet",
    "-p", "8474:8474",
    "-p", "8666-8699:8666-8699",
    "shopify/toxiproxy",
    "-host",
    "0.0.0.0",
  ]);

  // wait for API
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch("http://localhost:8474/proxies");
      if (res.ok) return;
    } catch {}

    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error("Toxiproxy failed to start");
}

async function startToxiproxySimple() {
  await run("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    "chaos-toxiproxy",
    "--network",
    "chaosnet",
    "-p", "8474:8474",
    "-p", "8666-8699:8666-8699",
    "shopify/toxiproxy",
    "-host",
    "0.0.0.0",
  ]);
}

module.exports = {
  startToxiproxy,
  startToxiproxySimple
};