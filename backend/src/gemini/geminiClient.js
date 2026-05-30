
class GeminiClient {
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || process.env.GEMINI_API_KEY;
    this.baseUrl =
      opts.baseUrl ||
      process.env.GEMINI_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta";

    this.model = opts.model || process.env.GEMINI_MODEL || "gemini-3.5-flash";
    this.fetch = opts.fetch || globalThis.fetch;

    if (!this.apiKey) throw new Error("Missing GEMINI_API_KEY");
    if (!this.fetch) throw new Error("Node 18+ fetch required");
  }

  endpoint(action = "generateContent") {
    const model = this.model.startsWith("models/")
      ? this.model
      : `models/${this.model}`;

    return `${this.baseUrl}/${model}:${action}?key=${encodeURIComponent(
      this.apiKey
    )}`;
  }

  toGeminiContents(messages) {
    return messages.map((m) => {
      if (m.parts) return m;

      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      };
    });
  }

  async generateContent(messages, opts = {}) {
    const body = {
      contents:
        typeof messages === "string"
          ? [{ role: "user", parts: [{ text: messages }] }]
          : this.toGeminiContents(messages),
      generationConfig: {
        temperature: opts.temperature ?? 1.0,
        maxOutputTokens: opts.maxOutputTokens ?? 4096,
      },
    };

    if (opts.system) {
      body.systemInstruction = {
        parts: [{ text: opts.system }],
      };
    }

    if (opts.tools?.declarations?.().length) {
      body.tools = [
        {
          functionDeclarations: opts.tools.declarations(),
        },
      ];

      body.toolConfig = {
        functionCallingConfig: {
          mode: opts.toolMode || "AUTO",
        },
      };
    }

    const res = await this.fetch(this.endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data?.error?.message || "Gemini API error");
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  }

  getText(resp) {
    return (
      resp?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || ""
    );
  }

  getFunctionCalls(resp) {
    const parts = resp?.candidates?.[0]?.content?.parts || [];

    return parts
      .filter((p) => p.functionCall)
      .map((p) => p.functionCall);
  }

  async chat(messages, opts = {}) {
    const resp = await this.generateContent(messages, opts);
    return {
      text: this.getText(resp),
      functionCalls: this.getFunctionCalls(resp),
      raw: resp,
    };
  }

  async converse(initialMessages = [], tools, opts = {}) {
    const messages = [...initialMessages];
    const maxTurns = opts.maxTurns ?? 5;

    for (let i = 0; i < maxTurns; i++) {
      const resp = await this.generateContent(messages, {
        ...opts,
        tools,
      });

      const modelContent = resp.candidates?.[0]?.content;
      if (!modelContent) throw new Error("No Gemini candidate content");

      messages.push(modelContent);

      const calls = this.getFunctionCalls(resp);

      if (calls.length === 0) {
        return {
          text: this.getText(resp),
          messages,
          raw: resp,
        };
      }

      const responseParts = [];

      for (const call of calls) {
        let result;

        try {
          result = await tools.execute(call.name, call.args || {});
        } catch (err) {
          result = {
            error: err.message || String(err),
          };
        }

        responseParts.push({
          functionResponse: {
            name: call.name,
            id: call.id,
            response: {
              result,
            },
          },
        });
      }

      messages.push({
        role: "user",
        parts: responseParts,
      });
    }

    return {
      error: "max turns reached",
      messages,
    };
  }
}

module.exports = GeminiClient;