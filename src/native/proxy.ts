import { readFile } from 'node:fs/promises';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// Stable native MCP registration. Resolve the rotating loopback endpoint on every call.
async function forward(method: string, params: unknown): Promise<any> {
  try {
    const path = process.argv[2]; if (!path) throw new Error();
    const descriptor = JSON.parse(await readFile(path, 'utf8'));
    const url = new URL(descriptor.url);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/mcp' || url.username || url.password || !/^[a-f0-9]{64}$/.test(descriptor.token)) throw new Error();
    const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${descriptor.token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-03-26' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (!response.ok) throw new Error();
    const packet = await response.json() as { result?: unknown; error?: unknown };
    if (packet.error || !packet.result) throw new Error();
    return packet.result;
  } catch { throw new Error('Relay is unavailable. Open Relay in the connected workspace and retry.'); }
}
const server = new Server({ name: 'relay-workspace-native-proxy', version: '0.1.2' }, { capabilities: { tools: {} }, instructions: 'Relay shares workspace tasks. Search before proposing new work or amendments. Mutations require an active turn ID from Relay; read its instructions first. Preserve native instructions and permissions. Progress reports are not verification: Relay independently checks and commits. Do not commit/push or claim passing checks yourself.' });
server.setRequestHandler(ListToolsRequestSchema, request => forward('tools/list', request.params));
server.setRequestHandler(CallToolRequestSchema, request => forward('tools/call', request.params));
await server.connect(new StdioServerTransport());
