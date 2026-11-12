import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectCodex, summarizeCodex } from '../scripts/probe-lib.mjs';
const fixture = fileURLToPath(new URL('./fixtures/app-server.mjs', import.meta.url));
test('inspection uses the read-only protocol and emits whitelisted metadata', async () => {
  const report = await inspectCodex(process.execPath, process.cwd(), true, (_exe, _args, options) => spawn(process.execPath, [fixture], options));
  assert.equal(report.effectiveConfiguration, 'read-successfully');
  assert.equal(report.skills[0].name, 'fixture-skill');
  assert.equal(report.skills[0].location, '<workspace>/fixture/SKILL.md');
  assert.equal(report.mcp.servers[0].toolCount, 1);
  assert.equal(report.modelExecution, 'not-exercised');
  assert.doesNotMatch(JSON.stringify(report), /SECRET/);
});
test('protocol failures do not expose provider error bodies', async () => {
  await assert.rejects(inspectCodex(process.execPath, process.cwd(), false, (_exe, _args, options) => spawn(process.execPath, [fixture], { ...options, env: { ...process.env, RELAY_FAIL_METHOD: 'skills/list' } })), error => /request failed/.test(error.message) && !error.message.includes('SECRET'));
});
test('MCP status is explicitly uninspected when not requested', () => {
  assert.deepEqual(summarizeCodex({}, { data: [] }, undefined, process.cwd()).mcp, { inspected: false });
});
