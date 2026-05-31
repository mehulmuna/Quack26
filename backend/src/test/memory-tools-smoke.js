const path = require("node:path");
const { registerMemoryTools } = require("../tools/toolModules/memoryTools");

/**
 * Mock Tool Registry to capture tool definitions and allow execution.
 */
class MockRegistry {
  constructor() {
    this.tools = new Map();
  }
  register({ name, execute }) {
    this.tools.set(name, execute);
  }
  async call(name, args) {
    const fn = this.tools.get(name);
    if (!fn) throw new Error(`Tool ${name} not registered`);
    return await fn(args);
  }
}

async function runMemoryTest() {
  console.log("--- Starting Memory Tools Smoke Test ---\n");

  const registry = new MockRegistry();
  registerMemoryTools(registry);

  // 1. Test Listing Reports
  console.log("[Test 1] Listing Reports...");
  const listResult = await registry.call("memory_list_reports", {});
  console.log("Found reports:", listResult.reports || listResult.error);
  console.log("");

  // 2. Test BM25 Search
  // Using keywords from your mongodb_latency_report.md
  const query = "sequential database operations latency";
  console.log(`[Test 2] Searching for: "${query}"...`);
  const searchResult = await registry.call("memory_search_reports", { query, topN: 2 });
  
  if (searchResult.ok && searchResult.results.length > 0) {
    searchResult.results.forEach((res, i) => {
      console.log(`${i + 1}. ${res.filename} (Score: ${res.score})`);
      console.log(`   Snippet: ${res.snippet}`);
    });
  } else {
    console.log("No relevant results found or error:", searchResult.error || "Zero matches");
  }
  console.log("");

  // 3. Test Reading a specific report
  if (listResult.reports && listResult.reports.length > 0) {
    const firstFile = listResult.reports[0];
    console.log(`[Test 3] Reading report: ${firstFile}...`);
    const readResult = await registry.call("memory_read_report", { filename: firstFile });
    console.log(`Content length: ${readResult.content?.length || 0} characters`);
  }

  console.log("\n--- Test Complete ---");
}

runMemoryTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});