const path = require("node:path");
const createTools = require("../tools/registerTools");

function main() {
  const projectDir = path.resolve(__dirname, "../../..");
  const tools = createTools({
    dir: projectDir,
    run: {},
  });

  const declarations = tools.declarations();

  console.log(`Registered ${declarations.length} tools:\n`);

  for (const tool of declarations) {
    console.log(`- ${tool.name}`);
    if (tool.description) {
      console.log(`  ${tool.description}`);
    }
  }

  console.log("\nFull tool declarations:");
  console.dir(declarations, { depth: null });
}

main();
