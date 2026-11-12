import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { request as httpRequest } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { NativeBroker, nativeClaudeUri, nativePrompt, type NativeTurn } from '../src/native/broker';
import { NativeMcpServer } from '../src/native/server';
import { nativeRegistration } from '../src/native/registration';
import { configuredClaudeAuth, supportedClaudeAuth } from '../src/native/auth';
import { Coordinator } from '../src/engine/coordinator';
import { git } from '../src/engine/git';
import type { AgentInput } from '../src/engine/types';

const choice = { provider: 'claude' as const, model: 'default', effort: 'default' };
const answer = { reply: 'A normal project conversation.', question: null, changes: [] };
const plan = { reply: 'One cohesive fixture change.', question: null, changes: [{ requestId: null, expectedRevision: null, title: 'Fixture output', milestones: [{ title: 'Implement output', specs: [{ title: 'Create result', description: 'Write result.txt in the worktree containing verified and verify its contents.', criteria: ['result.txt contains verified'] }] }] }] };
async function sandbox(run: (path: string) => Promise<void>) {
  const path = await mkdtemp(join(tmpdir(), 'relay-native-bridge-'));
  try { await run(path); }
  finally { assert.equal(dirname(resolve(path)), resolve(tmpdir())); assert.ok(basename(path).startsWith('relay-')); await rm(path, { recursive: true, force: true }); }
}
function channel() {
  const queue: NativeTurn[] = []; const waiting: ((turn: NativeTurn) => void)[] = [];
  return { open: async (turn: NativeTurn) => { const next = waiting.shift(); if (next) next({ ...turn }); else queue.push({ ...turn }); }, next: () => queue.length ? Promise.resolve(queue.shift()!) : new Promise<NativeTurn>(resolve => waiting.push(resolve)) };
}
function input(path: string, signal = new AbortController().signal): AgentInput {
  return { cwd: path, text: 'Inspect this fixture.', choice, signal, write: false, event: () => {}, approve: async () => false };
}
function resultText(result: any) { return JSON.parse(result.content[0].text); }
async function httpClient(descriptor: { url: string; token: string }) {
  const client = new Client({ name: 'relay-fixture', version: '1' });
  await client.connect(new StreamableHTTPClientTransport(new URL(descriptor.url), { requestInit: { headers: { authorization: `Bearer ${descriptor.token}` } } }));
  return client;
}

test('Claude SDK auth detection reads settings scopes without returning credentials', { timeout: 10000 }, async () => sandbox(async path => {
  const user = join(path, 'user'); const project = join(path, 'project'); await mkdir(user); await mkdir(join(project, '.claude'), { recursive: true });
  const options = { userDirectory: user, env: {} };
  assert.equal(await configuredClaudeAuth(project, options), false);
  await writeFile(join(user, 'settings.json'), JSON.stringify({ env: { ANTHROPIC_BASE_URL: 'https://gateway.example.invalid', ANTHROPIC_AUTH_TOKEN: 'fixture-only' } }));
  assert.equal(await configuredClaudeAuth(project, options), true);
  await writeFile(join(project, '.claude/settings.json'), JSON.stringify({ env: { ANTHROPIC_BASE_URL: 'https://api.anthropic.com' } }));
  assert.equal(await configuredClaudeAuth(project, options), false);
  await writeFile(join(project, '.claude/settings.local.json'), JSON.stringify({ apiKeyHelper: 'fixture-helper' }));
  assert.equal(await configuredClaudeAuth(project, options), true);
  assert.equal(supportedClaudeAuth({ ANTHROPIC_API_KEY: 'fixture-only' }), true);
  assert.equal(supportedClaudeAuth({ CLAUDE_CODE_USE_BEDROCK: '1' }), true);
  assert.equal(supportedClaudeAuth({ CLAUDE_CODE_USE_BEDROCK: '0' }), false);
  assert.equal(supportedClaudeAuth({ CLAUDE_CODE_OAUTH_TOKEN: 'subscription-fixture' }), false);
}));

test('native URI uses the documented prefill/session route and registration is additive', () => {
  const turn: NativeTurn = { id: '6cb088eb-034d-4248-847c-2ac7eb7d21a2', cwd: 'C:\\project with spaces\\worktree', text: 'Private user message', write: true, status: 'waiting', createdAt: new Date().toISOString(), session: 'native-session_1' };
  const uri = new URL(nativeClaudeUri(turn, 'vscode-insiders'));
  assert.equal(uri.host, 'anthropic.claude-code'); assert.equal(uri.pathname, '/open');
  assert.equal(uri.searchParams.get('prompt'), nativePrompt(turn)); assert.equal(uri.searchParams.get('session'), turn.session);
  assert.equal(uri.searchParams.has('cwd'), false); assert.equal(uri.searchParams.has('submit'), false);
  assert.equal(uri.toString().includes('Private user message'), false);
  assert.equal(new URL(nativeClaudeUri({ ...turn, session: 'relay-native:fake' })).searchParams.has('session'), false);
  const registration = nativeRegistration(turn.cwd, 'proxy.mjs', 'descriptor.json');
  assert.match(registration.name, /^relay_workspace_[a-f0-9]{12}$/);
  assert.deepEqual(registration.config, { type: 'stdio', command: 'node', args: ['proxy.mjs', 'descriptor.json'] });
});

test('authenticated MCP carries images/source/queue and publishes validated plans through the coordinator', { timeout: 20000 }, async () => sandbox(async path => {
  const turns = channel(); const activity: string[] = [];
  const broker = new NativeBroker(path, { open: turns.open, activity: () => {}, search: q => [{ id: 'REQ-001', query: q }], request: id => ({ id }) });
  const engine = new Coordinator({ root: path, storage: path, agent: async () => broker, checks: () => [], push: () => false, changed: () => {}, activity: text => activity.push(text), approve: async () => false });
  const server = new NativeMcpServer(broker); let client: Client | undefined;
  try {
    await broker.open(); await engine.open(); await writeFile(join(path, 'source.txt'), 'fixture source');
    const descriptor = await server.start(join(path, 'descriptor.json'));
    assert.equal((await fetch(descriptor.url, { method: 'POST' })).status, 401);
    const headers = { authorization: `Bearer ${descriptor.token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
    assert.equal((await fetch(descriptor.url, { method: 'POST', headers: { ...headers, origin: 'https://unrelated.invalid' }, body: '{}' })).status, 403);
    const foreignHost = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(descriptor.url, { method: 'POST', headers: { ...headers, host: 'unrelated.invalid' } }, response => { response.resume(); resolve(response.statusCode); });
      request.on('error', reject); request.end('{}');
    });
    assert.equal(foreignHost, 403);
    client = await httpClient(descriptor);
    const toolNames = (await client.listTools()).tools.map(t => t.name);
    assert.equal(toolNames.length, 8); assert.ok(!toolNames.some(n => /complete_spec|record_pass|commit/.test(n)));
    assert.deepEqual(resultText(await client.callTool({ name: 'relay_search_requests', arguments: { query: 'fixture' } })), [{ id: 'REQ-001', query: 'fixture' }]);
    assert.deepEqual(resultText(await client.callTool({ name: 'relay_get_request', arguments: { requestId: 'REQ-001' } })), { id: 'REQ-001' });
    const operation = engine.submit('Plan the fixture output.', choice, ['data:image/png;base64,aW1hZ2U=']);
    const turn = await turns.next();
    const read: any = await client.callTool({ name: 'relay_read_turn', arguments: { turnId: turn.id } });
    assert.match(resultText(read).text, /Plan the fixture output/); assert.equal(read.content[1].type, 'image');
    assert.equal(resultText(await client.callTool({ name: 'relay_read_file', arguments: { turnId: turn.id, path: 'source.txt' } })), 'fixture source');
    assert.equal((await client.callTool({ name: 'relay_read_file', arguments: { turnId: turn.id, path: '../outside' } })).isError, true);
    await client.callTool({ name: 'relay_report_progress', arguments: { turnId: turn.id, message: 'Inspected fixture source' } });
    assert.ok(activity.some(t => t.includes('Inspected fixture source')));
    assert.equal((await client.callTool({ name: 'relay_publish_plan', arguments: { turnId: turn.id, result: { reply: 'Malformed' } } })).isError, true);
    assert.equal((await client.callTool({ name: 'relay_finish_implementation', arguments: { turnId: turn.id, summary: 'wrong mode' } })).isError, true);
    await client.callTool({ name: 'relay_publish_plan', arguments: { turnId: turn.id, result: plan, sessionId: 'native-session-1' } }); await operation;
    assert.equal(engine.state.projection.requests.length, 1); assert.equal(engine.state.plans['REQ-001'].revision, 1);
    assert.equal(broker.get(turn.id).text, '');
    assert.equal((await client.callTool({ name: 'relay_report_progress', arguments: { turnId: turn.id, message: 'late mutation' } })).isError, true);
    const stale = engine.submit('Amend with a stale revision.', choice); const rejected = assert.rejects(stale, /target request changed/);
    const next = await turns.next(); assert.equal(next.session, 'native-session-1');
    await client.callTool({ name: 'relay_publish_plan', arguments: { turnId: next.id, result: { ...plan, changes: [{ ...plan.changes[0], requestId: 'REQ-001', expectedRevision: 2 }] } } });
    await rejected; assert.equal(engine.state.plans['REQ-001'].revision, 1);
  } finally { await engine.close(); await client?.close(); await server.close(); await broker.close(); }
}));

test('native cancellation/restart invalidates late results and never reuses an SDK session', { timeout: 20000 }, async () => sandbox(async path => {
  const turns = channel(); let broker = new NativeBroker(path, { open: turns.open, activity: () => {} }); await broker.open();
  try {
    const abort = new AbortController(); const operation = broker.run({ ...input(path, abort.signal), session: 'sdk-session-is-not-native' });
    const rejected = assert.rejects(operation, /Stop Claude in its native tab/); const turn = await turns.next();
    assert.equal(turn.session, undefined); abort.abort(); await rejected;
    await assert.rejects(broker.finishPlan(turn.id, answer), /no longer active/);
    await broker.close(); broker = new NativeBroker(path, { open: turns.open, activity: () => {} }); await broker.open();
    assert.equal(broker.get(turn.id).status, 'cancelled');
    const waiting = broker.run(input(path)); const interrupted = assert.rejects(waiting, /Stop Claude in its native tab/); const second = await turns.next();
    const crashedSnapshot = await readFile(join(path, 'native-inbox.json'), 'utf8');
    await broker.close(); await interrupted;
    // Restore the durable snapshot from before orderly shutdown to simulate a crash.
    await writeFile(join(path, 'native-inbox.json'), crashedSnapshot);
    broker = new NativeBroker(path, { open: turns.open, activity: () => {} }); await broker.open();
    assert.equal(broker.get(second.id).status, 'interrupted');
    await assert.rejects(broker.finishPlan(second.id, answer), /no longer active/);
  } finally { await broker.close(); }
}));

test('bundled stdio MCP proxy reconnects after the loopback descriptor rotates', { timeout: 20000 }, async () => sandbox(async path => {
  const broker = new NativeBroker(path, { open: async () => {}, activity: () => {}, search: q => [{ query: q }] });
  let server = new NativeMcpServer(broker); const descriptor = join(path, 'descriptor.json');
  const client = new Client({ name: 'relay-stdio-fixture', version: '1' });
  try {
    await broker.open(); const first = await server.start(descriptor);
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [resolve('dist/native-proxy.mjs'), descriptor], stderr: 'pipe' }));
    assert.equal((await client.listTools()).tools.length, 8);
    await server.close(); server = new NativeMcpServer(broker); const second = await server.start(descriptor);
    assert.notEqual(first.token, second.token);
    assert.deepEqual(resultText(await client.callTool({ name: 'relay_search_requests', arguments: { query: 'after restart' } })), [{ query: 'after restart' }]);
    await writeFile(descriptor, JSON.stringify({ url: 'https://outside.invalid/mcp', token: second.token }));
    await assert.rejects(client.listTools(), /Relay is unavailable/);
  } finally { await client.close(); await server.close(); await broker.close(); }
}));

for (const provider of ['claude', 'codex'] as const) for (const mode of ['verified', 'failed-check', 'original-checkout-edit'] as const) {
  test(`${provider} native implementation returns to independent verification: ${mode}`, { timeout: 30000 }, async () => sandbox(async path => {
    const root = join(path, 'repo'); await mkdir(root); await git(root, ['init']);
    await git(root, ['config', 'user.name', 'Relay fixture']); await git(root, ['config', 'user.email', 'relay@example.invalid']);
    await writeFile(join(root, 'README.md'), 'original'); await git(root, ['add', '--all']); await git(root, ['commit', '-m', 'Initial fixture']);
    const originalHead = await git(root, ['rev-parse', 'HEAD']); const turns = channel();
    const broker = new NativeBroker(join(path, 'storage'), { open: turns.open, activity: () => {} }, provider);
    const engine = new Coordinator({ root, storage: join(path, 'storage'), agent: async () => broker, changed: () => {}, activity: () => {}, approve: async () => false, push: () => false, checks: () => [{ name: 'Fixture contents', kind: 'unit', executable: process.execPath, args: ['-e', "if(require('fs').readFileSync('result.txt','utf8')!=='verified')process.exit(1)"] }] });
    const server = new NativeMcpServer(broker); let client: Client | undefined;
    try {
      await broker.open(); await engine.open(); client = await httpClient(await server.start(join(path, 'descriptor.json')));
      const intake = engine.submit('Create the fixture output.', { ...choice, provider }); const planning = await turns.next();
      await client.callTool({ name: 'relay_publish_plan', arguments: { turnId: planning.id, result: plan } }); await intake;
      const running = engine.run('REQ-001'); const outcome = mode === 'verified' ? running : assert.rejects(running, mode === 'failed-check' ? /Fixture contents failed/ : /original checkout changed/);
      const implementation = await turns.next(); assert.notEqual(implementation.cwd, root);
      await writeFile(join(implementation.cwd, 'result.txt'), mode === 'failed-check' ? 'incorrect' : 'verified');
      if (mode === 'original-checkout-edit') await writeFile(join(root, 'README.md'), 'native edited the wrong checkout');
      assert.equal((await client.callTool({ name: 'relay_publish_plan', arguments: { turnId: implementation.id, result: answer } })).isError, true);
      await client.callTool({ name: 'relay_finish_implementation', arguments: { turnId: implementation.id, summary: 'Agent claims tests passed; verify independently.' } }); await outcome;
      const spec = engine.state.projection.requests[0].milestones[0].specs[0];
      assert.equal(spec.status, mode === 'verified' ? 'completed' : 'blocked');
      assert.equal(spec.commits.length, mode === 'verified' ? 1 : 0);
      assert.equal(await git(root, ['rev-parse', 'HEAD']), originalHead);
      if (mode !== 'original-checkout-edit') assert.equal(await git(root, ['status', '--porcelain']), '');
      else assert.equal(await readFile(join(root, 'README.md'), 'utf8'), 'native edited the wrong checkout');
    } finally { await engine.close(); await client?.close(); await server.close(); await broker.close(); }
  }));
}
