class GeminiClient {
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || process.env.GEMINI_API_KEY;
    this.baseUrl = opts.baseUrl || process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta2';
    this.model = opts.model || process.env.GEMINI_MODEL || 'models/text-bison-001';
    this.fetch = globalThis.fetch;
    if (!this.fetch) throw new Error('global fetch is not available in this Node runtime. Use Node 18+ or provide a fetch polyfill.');
  }

  async request(action, body = {}) {
    // action is typically 'generateText' or 'generateMessage' etc. We construct URL as: {baseUrl}/{model}:{action}
    const endpoint = action.startsWith('http') ? action : `${this.baseUrl}/${this.model}:${action}`;
    const headers = { 'Content-Type': 'application/json' };

    let url = endpoint;
    if (this.apiKey) {
      // If it looks like an OAuth token (starts with ya29) use Bearer, else send as key param
      if (this.apiKey.startsWith('ya29') || this.apiKey.startsWith('Bearer ')) {
        headers['Authorization'] = this.apiKey.startsWith('Bearer ') ? this.apiKey : `Bearer ${this.apiKey}`;
      } else {
        // append key as query param
        url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${encodeURIComponent(this.apiKey)}`;
      }
    }

    const res = await this.fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      const txt = await res.text();
      throw new Error(`Gemini API returned non-json response: ${txt}`);
    }

    if (!res.ok) {
      const err = new Error('Gemini API error');
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  }

  // Simple text generation helper – body shape is forwarded to the API so you can adapt as needed
  async generateText(prompt, options = {}) {
    const body = { input: prompt, ...options };
    return this.request('generateText', body);
  }

  // Chat-style wrapper: messages is array of {role, content}
  async generateMessage(messages = [], options = {}) {
    const body = { messages, ...options };
    return this.request('generateMessage', body);
  }

  // A lightweight tool-invocation loop: sends messages, inspects response for a tool call, runs tool and continues
  // tools may be either an array of {name, execute} or an object with .execute(name,args) method (ToolRegistry)
  async converse(initialMessages = [], tools = [], maxTurns = 3) {
    const messages = [...initialMessages];

    for (let turn = 0; turn < maxTurns; turn++) {
      const resp = await this.generateMessage(messages);

      // heuristic: try common response containers
      let assistantText = null;
      if (resp?.candidates && resp.candidates[0]) assistantText = resp.candidates[0].content;
      if (!assistantText && resp?.output && resp.output[0]) assistantText = resp.output[0].content;
      if (!assistantText && typeof resp === 'string') assistantText = resp;
      if (!assistantText) assistantText = JSON.stringify(resp);

      // push assistant message
      messages.push({ role: 'assistant', content: assistantText });

      // try to detect a tool call encoded as JSON in the assistant text
      let toolCall = null;
      try {
        const parsed = JSON.parse(assistantText);
        if (parsed?.tool_call || (parsed?.name && parsed?.arguments)) toolCall = parsed;
      } catch (e) {
        // not json — ignore
      }

      if (!toolCall) {
        return { assistant: assistantText, raw: resp, messages };
      }

      const name = toolCall.tool_call?.name || toolCall.name;
      const args = toolCall.tool_call?.arguments || toolCall.arguments || {};

      // execute the tool
      let toolResult;
      try {
        if (typeof tools.execute === 'function') {
          toolResult = await tools.execute(name, args);
        } else if (Array.isArray(tools)) {
          const t = tools.find((x) => x.name === name);
          if (!t) throw new Error(`Tool not found: ${name}`);
          toolResult = await t.execute(args);
        } else {
          throw new Error('Invalid tools container; provide an array or registry with .execute()');
        }
      } catch (err) {
        toolResult = { error: String(err.message || err) };
      }

      // append tool result as assistant/system message and continue the loop
      messages.push({ role: 'system', name: `tool:${name}`, content: JSON.stringify({ toolResult }) });
    }

    return { error: 'max turns reached', messages };
  }
}

module.exports = GeminiClient;
