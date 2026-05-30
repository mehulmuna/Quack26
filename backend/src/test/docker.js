const { startToxiproxy } = require("../toxiproxy/start");

const tools = require("../tools/registerTools")();

async function main() {

  await startToxiproxy();


  await tools.execute("docker_create_network", {
    name: "chaosnet",
  });

  await tools.execute("docker_run_instance", {
    name: "demo-app",
    image: "node:22-alpine",
    command: [
      "sh",
      "-c",
      "echo \"require('http').createServer((req,res)=>res.end('hello')).listen(3000)\" > server.js && node server.js",
    ],
  });

  await tools.execute("toxiproxy_create_proxy", {
    name: "demo_proxy",
    listenPort: 8666,
    upstreamHost: "demo-app",
    upstreamPort: 3000,
  });

  await tools.execute("toxiproxy_add_latency", {
    proxy: "demo_proxy",
    latencyMs: 800,
    jitterMs: 100,
  });

  console.log("Test at http://localhost:8666");
}

main().catch(console.error);