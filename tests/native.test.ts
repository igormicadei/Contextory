import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname, basename, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { CodexAgent } from '../src/engine/codex';
import { Coordinator } from '../src/engine/coordinator';
import { git } from '../src/engine/git';
const choice = { provider: 'codex' as const, model: 'default', effort: 'default' };
async function removeFixture(path: string) { assert.equal(dirname(resolve(path)), resolve(tmpdir())); assert.ok(basename(path).startsWith('relay-native-')); await rm(path, { recursive: true, force: true }); }
test('installed Codex performs native tool calls, skill reading, structured output and session resume', { timeout: 180000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'relay-native-'));
  const skill = join(cwd, '.agents', 'skills', 'relay-native-fixture'); await mkdir(skill, { recursive: true });
  await writeFile(join(skill, 'SKILL.md'), '---\nname: relay-native-fixture\ndescription: Harmless Relay connection fixture.\n---\nWhen explicitly asked for the Relay fixture token, answer RELAY_SKILL_8372. Do not modify any files.\n');
  const calls: string[] = []; let session = '';
  const agent = new CodexAgent(process.env.RELAY_CODEX_EXECUTABLE ?? 'codex');
  try {
    assert.ok((await agent.models(cwd)).length > 1);
    const result = await agent.run({ cwd, choice, text: 'Harmless read-only Relay compatibility test. Do not modify files or invoke goal-guardian. Invoke $relay-native-fixture by reading its SKILL.md. Call relay_search_requests with query "finished fixture", then relay_get_request for REQ-900. Return the fixture skill token and the request title in the answer field.', write: false, signal: AbortSignal.timeout(120000), approve: async () => false, event: () => {}, schema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false }, tools: {
      search: q => { calls.push(`search:${q}`); return [{ id: 'REQ-900', title: 'Finished fixture', revision: 3, completed: true }]; },
      get: id => { calls.push(`get:${id}`); return { id, title: 'Finished fixture', revision: 3 }; }
    } });
    session = result.session;
    const answer = JSON.parse(result.text).answer;
    assert.match(answer, /RELAY_SKILL_8372/); assert.match(answer, /Finished fixture/i);
    assert.ok(calls.some(c => c.startsWith('search:'))); assert.ok(calls.includes('get:REQ-900'));
    const resumed = await agent.run({ cwd, choice, session, text: 'Without using tools, what was the exact fixture skill token from the previous turn? Reply only with the token.', write: false, signal: AbortSignal.timeout(60000), event: () => {}, approve: async () => false });
    assert.equal(resumed.session, session); assert.match(resumed.text, /RELAY_SKILL_8372/);
  } finally { await removeFixture(cwd); }
});

test('real Codex plans and implements a fixture through the coordinator and independent check runner', { timeout: 240000 }, async () => {
  const path = await mkdtemp(join(tmpdir(), 'relay-native-flow-')); const cwd = join(path, 'repo');
  await mkdir(cwd); await git(cwd, ['init']); await git(cwd, ['config', 'user.name', 'Relay native fixture']); await git(cwd, ['config', 'user.email', 'relay@example.invalid']);
  await writeFile(join(cwd, 'greet.cjs'), "module.exports = name => 'Hello';\n"); await writeFile(join(cwd, 'README.md'), 'A standalone JavaScript fixture. No dependencies.');
  await git(cwd, ['add', '--all']); await git(cwd, ['commit', '-m', 'Initial fixture']);
  const baseline = await git(cwd, ['rev-parse', 'HEAD']);
  const engine = new Coordinator({ root: cwd, storage: join(path, 'state'), agent: async () => new CodexAgent(process.env.RELAY_CODEX_EXECUTABLE ?? 'codex'), changed: () => {}, activity: () => {}, approve: async () => false, push: () => false, checks: () => [{ name: 'Greeting behavior', executable: process.execPath, args: ['-e', "const a=require('node:assert/strict'); const greet=require('./greet.cjs');a.equal(greet('Ada'),'Hello, Ada!');"], kind: 'unit' }] });
  try {
    await engine.open();
    await engine.submit('Fix greet.cjs so greet(name) returns exactly "Hello, " + name + "!". Add a test with node:test. Keep this one small request, one milestone and one spec. No dependencies or unrelated changes.', choice);
    assert.equal(engine.state.projection.requests.length, 1, engine.state.projection.messages.at(-1)?.text);
    try { await engine.run('REQ-001'); } catch (error) { throw new Error(`${(error as Error).message}\n${engine.state.projection.messages.filter(m => m.kind === 'update').map(m => m.text).join('\n')}`); }
    const specs = engine.state.projection.requests[0].milestones.flatMap(m => m.specs);
    assert.ok(specs.every(s => s.status === 'completed' && s.commits.length > 0 && s.checks.every(c => c.status === 'passed')));
    assert.equal(await git(cwd, ['rev-parse', 'HEAD']), baseline); assert.equal(await git(cwd, ['status', '--porcelain']), '');
  } finally { await engine.close(); await removeFixture(path); }
});
