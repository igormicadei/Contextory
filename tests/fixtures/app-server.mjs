import { createInterface } from 'node:readline';
const lines = createInterface({ input: process.stdin });
lines.on('line', line => {
  const request = JSON.parse(line);
  if (!request.method || request.id === undefined) return;
  if (process.env.RELAY_FAIL_METHOD === request.method) { process.stdout.write(JSON.stringify({ id: request.id, error: { code: -1, message: 'SECRET provider message' } }) + '\n'); return; }
  const results = {
    initialize: { userAgent: 'fixture' },
    'config/read': { config: { apiKey: 'SECRET-config', model: 'fixture' }, layers: [{ source: 'user' }] },
    'skills/list': { data: [{ skills: [{ name: 'fixture-skill', scope: 'USER', enabled: true, path: `${process.cwd()}/fixture/SKILL.md` }], errors: [] }] },
    'mcpServerStatus/list': { data: [{ name: 'fixture-mcp', authStatus: 'notLoggedIn', tools: { echo: { description: 'SECRET-tool-description' } } }] }
  };
  if (!(request.method in results)) { process.stdout.write(JSON.stringify({ id: request.id, error: { code: -1, message: 'Unexpected request' } }) + '\n'); return; }
  if (request.method === 'initialize') process.stdout.write(JSON.stringify({ id: 'fixture-approval', method: 'item/commandExecution/requestApproval', params: { command: 'never run this' } }) + '\n');
  const data = JSON.stringify({ id: request.id, result: results[request.method] });
  // Split writes exercise stream framing rather than assuming one response per chunk.
  process.stdout.write(data.slice(0, 10));
  process.stdout.write(data.slice(10) + '\n');
});
