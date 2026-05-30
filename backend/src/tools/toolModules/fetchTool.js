const fetchImpl = globalThis.fetch || (() => {
  try {
    return require("node:undici").fetch;
  } catch (err) {
    return null;
  }
})();

function registerFetchTool(tools) {
  tools.register({
    name: "fetch",
    description: "Fetch a URL with optional method, headers, and body.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch.",
        },
        method: {
          type: "string",
          description: "HTTP method to use.",
          default: "GET",
        },
        headers: {
          type: "object",
          description: "Optional request headers.",
        },
        body: {
          type: "string",
          description: "Optional request body.",
        },
      },
      required: ["url"],
    },
    execute: async ({ url, method = "GET", headers = {}, body }) => {
      if (!fetchImpl) {
        throw new Error("fetch is not available in this Node runtime.");
      }

      const response = await fetchImpl(url, {
        method,
        headers,
        body,
      });

      const text = await response.text();
      let json;

      try {
        json = JSON.parse(text);
      } catch (err) {
        json = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        text,
        json,
      };
    },
  });
}

module.exports = {
  registerFetchTool,
};
