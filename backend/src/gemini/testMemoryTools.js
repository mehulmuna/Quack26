const { registerMemoryTools } = require("../tools/toolModules/memoryTools");

async function runTest() {
  const registry = {};
  const mockTools = {
    register: (tool) => {
      registry[tool.name] = tool;
    }
  };

  console.log("Registering tools...");
  registerMemoryTools(mockTools);

  console.log("--- Testing memory_update_knowledge ---");
  await registry.memory_update_knowledge.execute({
    info: { "api-port": 8000, "db-host": "localhost" }
  });

  console.log("--- Testing memory_record_intervention ---");
  await registry.memory_record_intervention.execute({
    type: "toxic_added",
    details: { proxy: "api-proxy", toxicName: "latency_123", type: "latency" }
  });

  console.log("--- Testing memory_read ---");
  const readResult = await registry.memory_read.execute({});
  console.log("Current Memory State:", JSON.stringify(readResult, null, 2));

  console.log("--- Testing memory_clear_session ---");
  await registry.memory_clear_session.execute({});

  const finalRead = await registry.memory_read.execute({ key: "active_state" });
  console.log("Final Active State (should be empty):", JSON.stringify(finalRead, null, 2));

  console.log("\nTest complete! Verify that 'backend/data/memory.json' was updated correctly.");
}

runTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});