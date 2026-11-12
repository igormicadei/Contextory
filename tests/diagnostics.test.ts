import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRuntimes } from '../src/diagnostics';
test('version discovery preserves independent provider failures and does not leak errors', async () => {
  const results = await checkRuntimes({ codex: 'custom-codex', claude: 'custom-claude' }, async exe => {
    if (exe === 'custom-claude') throw new Error('SECRET stderr or environment');
    return 'codex-cli example\nignored second line';
  });
  assert.equal(results[0].available, true);
  assert.equal(results[0].version, 'codex-cli example');
  assert.match(results[0].message, /not verified/);
  assert.equal(results[1].available, false);
  assert.doesNotMatch(JSON.stringify(results), /SECRET/);
});
test('empty version output does not count as successful detection', async () => {
  const results = await checkRuntimes({ codex: 'codex', claude: 'claude' }, async () => '');
  assert.ok(results.every(r => !r.available));
});
