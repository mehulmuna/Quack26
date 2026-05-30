class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(tool) {
    if (!tool || !tool.name || typeof tool.execute !== 'function') {
      throw new Error('Tool must be an object with a `name` and `execute` function.');
    }
    this.tools.set(tool.name, tool);
  }

  get(name) {
    return this.tools.get(name);
  }

  async execute(name, args) {
    const t = this.get(name);
    if (!t) throw new Error(`Tool not found: ${name}`);
    return await t.execute(args);
  }

  list() {
    return Array.from(this.tools.values()).map((t) => ({ name: t.name, description: t.description }));
  }
}

module.exports = new ToolRegistry();
