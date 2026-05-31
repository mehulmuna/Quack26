class ToolRegistry {
  constructor(inputs) {
    this.data = inputs;
    this.tools = new Map();
  }

  register({ name, description, parameters, execute }) {
    if (!name || !execute) throw new Error("Tool needs name + execute");

    this.tools.set(name, {
      declaration: {
        name,
        description,
        parameters: parameters || {
          type: "object",
          properties: {},
        },
      },
      execute,
    });

    return this;
  }

  declarations() {
    return [...this.tools.values()].map((t) => t.declaration);
  }

  async execute(name, args = {}) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return await tool.execute(args);
  }
}

module.exports = ToolRegistry;