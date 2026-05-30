const ToolRegistry = require("./ToolRegistry");
const { registerFetchTool } = require("./toolModules/fetchTool");
const { registerNodeTool } = require("./toolModules/nodeTool");
const { registerRunAppTool } = require("./toolModules/runAppTool");

function createTools() {
  const tools = new ToolRegistry();

  registerFetchTool(tools);
  registerNodeTool(tools);
  registerRunAppTool(tools);

  return tools;
}

module.exports = createTools;
