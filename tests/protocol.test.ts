import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isToHost } from '../src/shared/protocol';
import { createDemo } from '../src/shared/fixtures';
test('bridge accepts only declared commands and bounded typed payloads', () => {
  assert.ok(isToHost({ type: 'openSpec', id: 'SPEC-003' }));
  assert.ok(isToHost({ type: 'openDiff', id: 'SPEC-003', sha: 'a71c9e2' }));
  assert.ok(isToHost({ type: 'save', state: createDemo() }));
  assert.ok(isToHost({ type: 'pickAttachments' }));
  assert.ok(isToHost({ type: 'searchReferences', requestId: 1, trigger: '@', query: 'src/', provider: 'codex' }));
  for (const value of [null, { type: 'exec', command: 'anything' }, { type: 'openSpec', id: '../secrets' }, { type: 'openDiff', id: 'SPEC-001', sha: 'HEAD; command' }, { type: 'openReport', markdown: 'x'.repeat(200001) }, { type: 'save', state: {} }]) assert.equal(isToHost(value), false);
});
test('reference bridge rejects unbounded or malformed searches and image bytes in persistence', () => {
  for (const value of [
    { type: 'searchReferences', requestId: -1, trigger: '@', query: '', provider: 'codex' },
    { type: 'searchReferences', requestId: 1, trigger: '!', query: '', provider: 'codex' },
    { type: 'searchReferences', requestId: 1, trigger: '@', query: 'a'.repeat(201), provider: 'codex' },
    { type: 'searchReferences', requestId: 1, trigger: '@', query: '', provider: 'other' }
  ]) assert.equal(isToHost(value), false);
  const state = createDemo();
  state.submissions.push({ id: 'm', text: 'x', requestId: 'REQ-001', choice: { provider: 'codex', model: 'default', effort: 'default' }, attachments: [{ id: 'a', name: 'a.png', size: 1, mime: 'image/png', thumbnail: 'data:image/png;base64,AA==' } as never], references: [], outcome: 'amended', reason: 'test' });
  assert.equal(isToHost({ type: 'save', state }), false);
});
