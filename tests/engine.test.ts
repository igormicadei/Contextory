import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { WorkspaceFiles } from '../src/engine/files';
import { Store } from '../src/engine/store';
import { Coordinator, emptyLive, isLiveState } from '../src/engine/coordinator';
import { git, runCheck } from '../src/engine/git';
import { isToHost } from '../src/shared/protocol';
import { isDemoState, requestStatus } from '../src/shared/model';
import { supportedClaudeAuth } from '../src/engine/claude';
import type { Agent, AgentInput } from '../src/engine/types';
const choice = { provider: 'codex' as const, model: 'default', effort: 'default' };
const response = { reply: 'The requested fixture change has a standalone plan.', question: null, changes: [{ requestId: null, expectedRevision: null, title: 'Fixture change', milestones: [{ title: 'Implement fixture behavior', specs: [{ title: 'Add fixture output', description: 'Create result.txt containing the requested fixture value and verify its contents.', criteria: ['result.txt contains verified'] }] }] }] };
async function removeFixture(path: string) { assert.equal(dirname(resolve(path)), resolve(tmpdir())); assert.ok(basename(path).startsWith('relay-')); await rm(path, { recursive: true, force: true }); }
async function sandbox(run: (path: string) => Promise<void>) { const path = await mkdtemp(join(tmpdir(), 'relay-engine-')); try { await run(path); } finally { await removeFixture(path); } }
test('live state and IPC validate an empty workspace and reject malformed payloads', () => {
  assert.ok(isLiveState(emptyLive())); assert.ok(isDemoState(emptyLive().projection));
  assert.ok(isToHost({ type: 'liveSubmit', text: 'Hello', choice, attachments: [] }));
  assert.ok(!isToHost({ type: 'liveSubmit', text: 'Hello', choice, attachments: [{ id: 'x', name: 'a', size: 1, mime: 'text/plain', data: '<invalid>' }] }));
  assert.ok(!isToHost({ type: 'liveRun', id: '../main' }));
  assert.ok(!supportedClaudeAuth({})); assert.ok(supportedClaudeAuth({ ANTHROPIC_API_KEY: 'test-only' }));
  assert.ok(!supportedClaudeAuth({ CLAUDE_CODE_USE_VERTEX: '0' }));
});
test('atomic storage serializes snapshots, excludes a second owner and rejects corruption', async () => sandbox(async path => {
  const file = join(path, 'state.json');
  const store = new Store(file, isLiveState); await store.load(emptyLive);
  const second = new Store(file, isLiveState); await assert.rejects(second.load(emptyLive), /already open/);
  const first = emptyLive(); const last = emptyLive(); last.nextSpec = 5;
  await Promise.all([store.save(first), store.save(last)]); await store.close();
  const reopened = new Store(file, isLiveState); assert.equal((await reopened.load(emptyLive)).nextSpec, 5); await reopened.close();
  const raw = JSON.parse(await readFile(file, 'utf8')); raw.payload += 'x'; await writeFile(file, JSON.stringify(raw));
  await assert.rejects(new Store(file, isLiveState).load(emptyLive), /integrity/);
}));
test('source inspection rejects traversal, outside junctions, binary files and Git internals', async () => sandbox(async path => {
  const root = join(path, 'workspace'); const outside = join(path, 'outside'); await mkdir(root); await mkdir(outside); await mkdir(join(root, '.git'));
  await writeFile(join(root, 'source.txt'), 'readable'); await writeFile(join(root, 'binary.bin'), Buffer.from([0, 1, 2])); await writeFile(join(outside, 'private.txt'), 'outside');
  await symlink(outside, join(root, 'external'), process.platform === 'win32' ? 'junction' : 'dir');
  const files = new WorkspaceFiles(root);
  assert.equal(await files.read('source.txt'), 'readable'); assert.ok(!(await files.list()).includes('.git/'));
  await assert.rejects(files.read('../outside/private.txt')); await assert.rejects(files.read('external/private.txt')); await assert.rejects(files.list('.git')); await assert.rejects(files.read('binary.bin'));
}));
test('live conversation persists without queue changes; questions allow custom answers and resume', async () => sandbox(async path => {
  let calls = 0; let previousSession: string | undefined;
  const agent: Agent = { models: async () => [], run: async input => { previousSession = input.session; calls++; return { session: 'native-test-session', text: JSON.stringify({ reply: 'Let us discuss the project.', changes: [], question: calls === 1 ? { question: 'Which approach?', options: ['A', 'B'] } : null }) }; } };
  const engine = new Coordinator({ root: path, storage: path, agent: async () => agent, checks: () => [], push: () => false, changed: () => {}, activity: () => {}, approve: async () => false });
  await engine.open(); await engine.submit('What would you recommend?', choice);
  assert.equal(engine.state.projection.requests.length, 0); assert.ok(isLiveState(engine.state));
  await engine.answer('DEC-001', 'My custom approach');
  assert.equal(previousSession, 'native-test-session'); assert.ok(engine.state.projection.decisions[0].answer); assert.ok(isLiveState(engine.state));
  await engine.close();
}));
test('worktree workflow independently verifies, commits, pushes and integrates milestone branches', async () => sandbox(async path => {
  const root = join(path, 'repo'); const remote = join(path, 'remote.git');
  await git(path, ['init', root]); await git(path, ['init', '--bare', remote]);
  await git(root, ['config', 'user.name', 'Relay fixture']); await git(root, ['config', 'user.email', 'relay@example.invalid']);
  await writeFile(join(root, 'README.md'), 'Fixture repository'); await git(root, ['add', '--all']); await git(root, ['commit', '-m', 'Initial fixture']); await git(root, ['remote', 'add', 'origin', remote]);
  const original = await git(root, ['rev-parse', 'HEAD']); let codeCalls = 0;
  let implementationStarted!: () => void; const started = new Promise<void>(resolve => { implementationStarted = resolve; });
  let continueImplementation!: () => void; const continueWork = new Promise<void>(resolve => { continueImplementation = resolve; });
  const agent: Agent = { models: async () => [], run: async (input: AgentInput) => {
    if (!input.write) { assert.ok(input.tools); return { text: JSON.stringify(response), session: 'intake-session' }; }
    codeCalls++; implementationStarted(); await continueWork;
    assert.notEqual(input.cwd, root); await writeFile(join(input.cwd, 'result.txt'), 'verified'); return { text: 'Implemented.', session: 'code-session' };
  } };
  const engine = new Coordinator({ root, storage: join(path, 'storage'), agent: async () => agent, checks: () => [{ name: 'Verify fixture output', executable: process.execPath, args: ['-e', "if(require('fs').readFileSync('result.txt','utf8')!=='verified')process.exit(1)"], kind: 'unit' }], push: () => true, changed: () => {}, activity: () => {}, approve: async () => false });
  try {
    await engine.open(); await engine.submit('Create a fixture output.', choice); assert.ok(isLiveState(engine.state));
    const running = engine.run('REQ-001'); await started;
    await engine.submit('Plan another unrelated request while work runs.', choice);
    assert.equal(engine.state.projection.requests.length, 2);
    continueImplementation(); await running;
    const request = engine.state.projection.requests[0]; const spec = request.milestones[0].specs[0];
    assert.equal(spec.status, 'completed'); assert.equal(spec.checks[0].status, 'passed'); assert.equal(spec.commits[0].sha.length, 40); assert.equal(spec.commits[0].pushed, true); assert.equal(codeCalls, 1);
    assert.equal(await git(root, ['rev-parse', 'HEAD']), original); assert.equal(await git(root, ['status', '--porcelain']), '');
    assert.equal(await git(root, ['rev-parse', 'relay/REQ-001/integration']), spec.commits[0].sha);
    assert.equal(await git(remote, ['rev-parse', 'refs/heads/relay/REQ-001/m1']), spec.commits[0].sha);
    const amend: Agent = { models: async () => [], run: async () => ({ session: 'amend-session', text: JSON.stringify({ ...response, changes: [{ ...response.changes[0], requestId: 'REQ-001', expectedRevision: 1 }] }) }) };
    agent.run = amend.run;
    await engine.submit('Extend the finished fixture with more work.', choice);
    assert.equal(engine.state.projection.requests.length, 2); assert.equal(engine.state.projection.requests[0].milestones.length, 2);
    assert.equal(engine.state.projection.requests[0].milestones[0].specs[0].commits[0].sha, spec.commits[0].sha);
    assert.equal(engine.state.plans['REQ-001'].revision, 2);
    await assert.rejects(engine.submit('A stale amendment.', choice), /target request changed/);
    assert.equal(engine.state.projection.requests[0].milestones.length, 2);
    assert.ok(isLiveState(engine.state));
  } finally { continueImplementation(); await engine.close(); }
}));

test('a failed milestone gate keeps the request blocked after spec commits and can be retried', async () => sandbox(async path => {
  const root = join(path, 'repo'); await mkdir(root); await git(root, ['init']); await git(root, ['config', 'user.name', 'Relay fixture']); await git(root, ['config', 'user.email', 'relay@example.invalid']);
  await writeFile(join(root, '.gitignore'), '.gate-count\n'); await git(root, ['add', '--all']); await git(root, ['commit', '-m', 'Initial fixture']);
  let calls = 0;
  const agent: Agent = { models: async () => [], run: async input => { if (input.write) { calls++; await writeFile(join(input.cwd, 'result.txt'), 'verified'); } return { text: input.write ? 'Done' : JSON.stringify(response), session: 'test' }; } };
  const engine = new Coordinator({ root, storage: join(path, 'state'), agent: async () => agent, changed: () => {}, activity: () => {}, approve: async () => false, push: () => false, checks: () => [{ name: 'Milestone interaction gate', executable: process.execPath, args: ['-e', "const f=require('fs');let n=f.existsSync('.gate-count')?+f.readFileSync('.gate-count','utf8'):0;f.writeFileSync('.gate-count',String(++n));if(n===2)process.exit(1)"], kind: 'unit' }] });
  try {
    await engine.open(); await engine.submit('Implement fixture', choice);
    await assert.rejects(engine.run('REQ-001'), /Milestone final gate failed/);
    const request = engine.state.projection.requests[0]; assert.equal(requestStatus(engine.state.projection, request), 'blocked');
    assert.equal(request.milestones[0].specs[0].commits.length, 1);
    // A final gate can be retried without executing the spec's implementation again.
    await engine.run('REQ-001'); assert.equal(calls, 1); assert.equal(requestStatus(engine.state.projection, request), 'completed');
  } finally { await engine.close(); }
}));
test('failing independent checks block the spec and produce no implementation commit', async () => sandbox(async path => {
  await git(path, ['init']); await git(path, ['config', 'user.name', 'Relay fixture']); await git(path, ['config', 'user.email', 'relay@example.invalid']);
  await writeFile(join(path, 'README.md'), 'fixture'); await git(path, ['add', '--all']); await git(path, ['commit', '-m', 'Initial']);
  const storage = await mkdtemp(join(tmpdir(), 'relay-failure-'));
  const agent: Agent = { models: async () => [], run: async input => { if (input.write) await writeFile(join(input.cwd, 'result.txt'), 'wrong'); return { text: input.write ? 'All tests passed (untrusted claim)' : JSON.stringify(response), session: 'test' }; } };
  const engine = new Coordinator({ root: path, storage, agent: async () => agent, checks: () => [{ name: 'Fails', executable: process.execPath, args: ['-e', 'process.exit(1)'], kind: 'unit' }], push: () => false, changed: () => {}, activity: () => {}, approve: async () => false });
  try {
    await engine.open(); await engine.submit('Implement fixture.', choice); await assert.rejects(engine.run('REQ-001'), /Fails failed/);
    const spec = engine.state.projection.requests[0].milestones[0].specs[0]; assert.equal(spec.status, 'blocked'); assert.equal(spec.commits.length, 0); assert.equal(spec.checks[0].status, 'pending');
    const result = await runCheck(path, { name: 'Exit', executable: process.execPath, args: ['-e', 'process.exit(2)'], kind: 'unit' }, new AbortController().signal); assert.equal(result.passed, false);
  } finally { await engine.close(); await removeFixture(storage); }
}));
