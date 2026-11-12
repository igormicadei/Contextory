import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { parse } from 'smol-toml';
import { registerNativeCodex } from '../src/native/codexRegistration';
import { nativeRegistration } from '../src/native/registration';
import { NativeBroker, type NativeTurn } from '../src/native/broker';
import type { AgentInput } from '../src/engine/types';

async function sandbox(run: (path: string) => Promise<void>) {
  const path = await mkdtemp(join(tmpdir(), 'relay-native-codex-'));
  try { await run(path); }
  finally { assert.equal(dirname(resolve(path)), resolve(tmpdir())); assert.ok(basename(path).startsWith('relay-')); await rm(path, { recursive: true, force: true }); }
}
test('Codex project MCP registration preserves existing settings/comments and is idempotent', async () => sandbox(async root => {
  const directory = join(root, '.codex'); await mkdir(directory);
  const original = '# Keep my provider and customization\r\nmodel_provider = "fixture_gateway"\r\n[mcp_servers.other]\r\ncommand = "other-server"\r\n';
  const path = join(directory, 'config.toml'); await writeFile(path, original);
  const proxy = join(root, 'storage with spaces', 'native-codex-proxy.mjs'); const descriptor = join(root, 'storage with spaces', 'native-codex-bridge.json');
  const result = await registerNativeCodex(root, proxy, descriptor);
  assert.equal(result.added, true); const written = await readFile(path, 'utf8'); assert.ok(written.startsWith(original));
  const configuration: any = parse(written);
  assert.equal(configuration.model_provider, 'fixture_gateway'); assert.equal(configuration.mcp_servers.other.command, 'other-server');
  assert.deepEqual({ ...configuration.mcp_servers[result.name] }, { command: 'node', args: [proxy, descriptor] });
  assert.equal((await registerNativeCodex(root, proxy, descriptor)).added, false);
  assert.equal(await readFile(path, 'utf8'), written);
}));
test('Codex registration refuses conflicts, invalid TOML, inline layouts and busy config without replacing them', async () => sandbox(async root => {
  const directory = join(root, '.codex'); await mkdir(directory); const path = join(directory, 'config.toml');
  const { name } = nativeRegistration(root, 'proxy', 'descriptor');
  for (const original of ['model = "unclosed fixture', `mcp_servers = { other = { command = "other" } }\n`, `[mcp_servers.${name}]\ncommand = "user-owned"\n`, `[mcp_servers.${name}]\ncommand = "node"\nargs = ["proxy", "descriptor"]\nenabled = false\n`]) {
    await writeFile(path, original);
    await assert.rejects(registerNativeCodex(root, 'proxy', 'descriptor'));
    assert.equal(await readFile(path, 'utf8'), original);
  }
  await writeFile(join(directory, '.relay-registration.lock'), 'fixture owner');
  await assert.rejects(registerNativeCodex(root, 'proxy', 'descriptor'), /busy/);
}));
test('Codex registration rejects an outside project settings junction', async () => sandbox(async path => {
  const root = join(path, 'workspace'); const outside = join(path, 'outside'); await mkdir(root); await mkdir(outside);
  await writeFile(join(outside, 'config.toml'), 'model = "preserved"\n');
  await symlink(outside, join(root, '.codex'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(registerNativeCodex(root, 'proxy', 'descriptor'), /outside/);
  assert.equal(await readFile(join(outside, 'config.toml'), 'utf8'), 'model = "preserved"\n');
}));
test('native Codex and Claude brokers share a workspace without sharing turn ownership or sessions', async () => sandbox(async path => {
  const opened: Partial<Record<'claude' | 'codex', NativeTurn>> = {};
  const ready: Partial<Record<'claude' | 'codex', () => void>> = {};
  const brokers = { claude: new NativeBroker(path, { open: async t => { opened.claude = t; ready.claude?.(); }, activity: () => {} }), codex: new NativeBroker(path, { open: async t => { opened.codex = t; ready.codex?.(); }, activity: () => {} }, 'codex') };
  try {
    await brokers.claude.open(); await brokers.codex.open();
    for (const provider of ['claude', 'codex'] as const) {
      const started = new Promise<void>(resolve => { ready[provider] = resolve; });
      const controller = new AbortController();
      const args: AgentInput = { cwd: path, text: 'Discuss project.', choice: { provider, model: 'default', effort: 'default' }, session: 'app-server-or-sdk-session', write: false, signal: controller.signal, approve: async () => false, event: () => {} };
      const broker = brokers[provider];
      const pending = broker.run(args); await started; const turn = opened[provider]!;
      assert.equal(turn.session, undefined);
      assert.throws(() => brokers[provider === 'claude' ? 'codex' : 'claude'].read(turn.id), /not found/);
      await broker.finishPlan(turn.id, { reply: 'Project discussion.', changes: [], question: null }, 'native-session');
      assert.match((await pending).session, provider === 'codex' ? /^relay-native-codex:/ : /^relay-native:/);
      await assert.rejects(broker.run({ ...args, choice: { ...args.choice, provider: provider === 'codex' ? 'claude' : 'codex' } }), /another provider/);
      assert.match((await broker.models())[0].label, provider === 'codex' ? /Codex/ : /Claude/);
    }
  } finally { await brokers.claude.close(); await brokers.codex.close(); }
}));
