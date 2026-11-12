import { createServer, type Server as HttpServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { planResponse } from '../engine/plan';
import { NativeBroker } from './broker';
export interface BridgeDescriptor { url: string; token: string }
export class NativeMcpServer {
  private http?: HttpServer;
  private token = randomBytes(32).toString('hex');
  constructor(private broker: NativeBroker) {}
  private tools() {
    const server = new McpServer({ name: 'relay-workspace', version: '0.1.2' });
    const turnId = z.string().uuid(); const session = z.string().max(200).optional();
    const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value ?? null) }] });
    server.registerTool('relay_read_turn', { description: 'Read the exact Relay user turn or implementation contract and any attached images. Must be called before processing the turn.', inputSchema: { turnId } }, async ({ turnId }) => this.broker.read(turnId));
    server.registerTool('relay_search_requests', { description: 'Search all shared Relay requests, including completed work. Read-only. turnId is optional when browsing the queue from native chat.', inputSchema: { turnId: turnId.optional(), query: z.string().max(4000) } }, async ({ turnId, query }) => text(this.broker.search(turnId, query)));
    server.registerTool('relay_get_request', { description: 'Read a request, its plan revision, specs, check results and commits.', inputSchema: { turnId: turnId.optional(), requestId: z.string().regex(/^REQ-\d{3,6}$/) } }, async ({ turnId, requestId }) => text(this.broker.request(turnId, requestId)));
    server.registerTool('relay_list_files', { description: 'List a source directory relative to this Relay turn working directory.', inputSchema: { turnId, path: z.string().max(2000) } }, async ({ turnId, path }) => text(await this.broker.source(turnId, path, false)));
    server.registerTool('relay_read_file', { description: 'Read a bounded source file relative to this Relay turn working directory.', inputSchema: { turnId, path: z.string().max(2000) } }, async ({ turnId, path }) => text(await this.broker.source(turnId, path, true)));
    server.registerTool('relay_publish_plan', { description: 'Return a conversation answer or a complete validated plan to Relay. Use changes=[] for normal chat or when asking a material question. Relay applies revision/provider checks.', inputSchema: { turnId, result: planResponse, sessionId: session } }, async ({ turnId, result, sessionId }) => { await this.broker.finishPlan(turnId, result, sessionId); return text({ received: true }); });
    server.registerTool('relay_report_progress', { description: 'Report native execution activity. This is agent-reported progress, never passing test evidence or task completion.', inputSchema: { turnId, message: z.string().min(1).max(1000) } }, async ({ turnId, message }) => { await this.broker.progress(turnId, message); return text({ received: true }); });
    server.registerTool('relay_finish_implementation', { description: 'Hand an implementation back to Relay for independent verification and Git handling. Do not commit or push. This tool cannot claim passing checks or mark a spec complete.', inputSchema: { turnId, summary: z.string().min(1).max(12000), sessionId: session } }, async ({ turnId, summary, sessionId }) => { await this.broker.finishImplementation(turnId, summary, sessionId); return text({ received: true, next: 'Relay independently runs configured checks.' }); });
    return server;
  }
  async start(descriptorPath: string): Promise<BridgeDescriptor> {
    this.http = createServer(async (request, response) => {
      const supplied = Buffer.from(request.headers.authorization ?? ''); const expected = Buffer.from(`Bearer ${this.token}`);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { response.writeHead(401).end(); return; }
      if (request.headers.origin || !/^127\.0\.0\.1:\d+$/.test(request.headers.host ?? '')) { response.writeHead(403).end(); return; }
      if (request.url !== '/mcp' || request.method !== 'POST') { response.writeHead(405).end(); return; }
      const server = this.tools(); const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      try {
        let size = 0; const chunks: Buffer[] = [];
        for await (const chunk of request) { size += chunk.length; if (size > 1024 * 1024) { response.writeHead(413).end(); return; } chunks.push(chunk); }
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        response.on('close', () => { void server.close(); });
        await server.connect(transport); await transport.handleRequest(request, response, body);
      } catch { if (!response.headersSent) response.writeHead(400).end(JSON.stringify({ error: 'Relay MCP request could not be processed.' })); }
    });
    await new Promise<void>((resolve, reject) => { this.http!.once('error', reject); this.http!.listen(0, '127.0.0.1', () => resolve()); });
    const address = this.http.address(); if (!address || typeof address === 'string') throw new Error('Cannot bind the native Relay bridge.');
    const descriptor = { url: `http://127.0.0.1:${address.port}/mcp`, token: this.token };
    await mkdir(dirname(descriptorPath), { recursive: true });
    await writeFile(descriptorPath + '.tmp', JSON.stringify(descriptor), { mode: 0o600 }); await rename(descriptorPath + '.tmp', descriptorPath);
    return descriptor;
  }
  async close() {
    const server = this.http; this.http = undefined;
    if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  }
}
