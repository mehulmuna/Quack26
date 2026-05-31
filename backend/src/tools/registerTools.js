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
const { registerWriteReportTool } = require("./toolModules/writeReportTool");

function createTools(inputs) {
  const tools = new ToolRegistry(inputs);

  registerFetchTool(tools);
  registerNodeTool(tools);
  registerCliTool(tools);
  registerRunAppTool(tools);
  registerRunCodeTool(tools);

  if(process.env.CYPRESS)
    registerCypressTools(tools);

  registerWriteReportTool(tools);

  if(process.env.CODEX)
    registerCodexTool(tools);

  registerToxiproxyTools(tools);
  registerDockerTools(tools);

  return tools;
}

module.exports = createTools;
