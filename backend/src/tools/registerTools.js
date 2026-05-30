const ToolRegistry = require("./ToolRegistry");
const { registerDockerTools } = require("./toolModules/dockerTools");
const { registerFetchTool } = require("./toolModules/fetchTool");
const { registerNodeTool } = require("./toolModules/nodeTool");
const { registerCliTool } = require("./toolModules/cliTool");
const { registerRunAppTool } = require("./toolModules/runAppTool");
const { registerRunCodeTool } = require("./toolModules/runCode");
const { registerCypressTools } = require("./toolModules/cypressTools");
const { registerToxiproxyTools } = require("./toolModules/toxiproxyTools");
const { registerCodexTool } = require("./toolModules/codexTool");

function createTools() {
  const tools = new ToolRegistry();

  registerFetchTool(tools);
  registerNodeTool(tools);
  registerCliTool(tools);
  registerRunAppTool(tools);
  registerRunCodeTool(tools);
  registerCypressTools(tools);

  if(process.env.CODEX)
    registerCodexTool(tools);

  registerToxiproxyTools(tools);
  registerDockerTools(tools);

  return tools;
}

module.exports = createTools;
