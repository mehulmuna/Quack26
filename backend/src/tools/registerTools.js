const ToolRegistry = require("./ToolRegistry");
const { registerDockerTools } = require("./toolModules/dockerTools");
const { registerFetchTool } = require("./toolModules/fetchTool");
const { registerNodeTool } = require("./toolModules/nodeTool");
const { registerRunAppTool } = require("./toolModules/runAppTool");
const { registerToxiproxyTools } = require("./toolModules/toxiproxyTools");

function createTools() {
  const tools = new ToolRegistry();

  registerFetchTool(tools);
  registerNodeTool(tools);
  registerRunAppTool(tools);

  registerToxiproxyTools(tools);
  registerDockerTools(tools);

  return tools;
}

module.exports = createTools;
