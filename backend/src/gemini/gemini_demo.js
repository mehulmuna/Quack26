require('dotenv').config();
const GeminiClient = require('./geminiClient');
const tools = require('../tools/tools');

// sample tools
tools.register({
  name: 'get_time',
  description: 'Returns current server time',
  execute: async () => ({ time: new Date().toISOString() }),
});

tools.register({
  name: 'calc',
  description: 'Evaluates a simple arithmetic expression provided in args.expr',
  execute: async (args) => {
    try {
      // very small, safe eval for arithmetic only
      const expr = String(args?.expr || '0').replace(/[^0-9+\-*/(). %]/g, '');
      // eslint-disable-next-line no-eval
      const result = eval(expr);
      return { result };
    } catch (e) {
      return { error: 'invalid expression' };
    }
  },
});

async function main() {
  const client = new GeminiClient({});

  if (!client.apiKey) {
    console.log('GEMINI_API_KEY not set. Demo will not call the external API.');
    console.log('Set GEMINI_API_KEY in your environment to run a real demo.');
    console.log('Example:');
    console.log('  GEMINI_API_KEY=your_key node gemini_demo.js');
    return;
  }

  const messages = [
    { role: 'user', content: 'Please return a JSON object describing a tool call to get_time.' },
  ];

  try {
    const res = await client.converse(messages, tools, 3);
    console.log('Conversation result:');
    console.dir(res, { depth: 4 });
  } catch (err) {
    console.error('Error during demo:', err);
  }
}

if (require.main === module) main();
