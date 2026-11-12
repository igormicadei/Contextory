import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemo } from '../src/shared/fixtures';
import { addRequest, advanceDemo, allSpecs, answerDecision, currentWork, findSpec, isDemoState, progress, requestStatus, restoreDemo, reviseSpec, setRequestControl } from '../src/shared/model';
import { applySubmission, previewRoute, searchRequests } from '../src/shared/routing';
import { normalizeChoice } from '../src/shared/context';
import { discussProject, explainTaskSubmission, messageIntent, rememberUserMessage } from '../src/shared/conversation';
import { report } from '../src/shared/report';
test('completion counts leaves and unplanned requests do not inflate the denominator', () => {
  const original = createDemo();
  assert.deepEqual(progress(allSpecs(original)), { completed: 3, total: 11, percent: 27 });
  const next = addRequest(original, 'A new feature', 'claude');
  assert.equal(original.requests.length, 3);
  assert.equal(next.requests[3].provider, 'claude');
  assert.equal(next.requests[3].id, 'REQ-004');
  assert.deepEqual(progress(allSpecs(next)), progress(allSpecs(original)));
});
test('demo cannot advance while paused and only completes after its simulated Git phases', () => {
  const original = createDemo(); original.paused = true;
  assert.deepEqual(advanceDemo(original), original);
  original.paused = false;
  let next = advanceDemo(original);
  assert.equal(findSpec(next, 'SPEC-003')?.spec.status, 'committing');
  assert.ok(findSpec(next, 'SPEC-003')?.spec.checks.every(c => c.status === 'passed'));
  assert.equal(progress(allSpecs(next)).completed, 3);
  next = advanceDemo(next);
  assert.equal(findSpec(next, 'SPEC-003')?.spec.status, 'pushing');
  assert.equal(findSpec(next, 'SPEC-003')?.spec.commits[0].pushed, false);
  next = advanceDemo(next);
  assert.equal(findSpec(next, 'SPEC-003')?.spec.status, 'completed');
  assert.equal(findSpec(next, 'SPEC-003')?.spec.commits[0].pushed, true);
  assert.equal(progress(allSpecs(next)).completed, 4);
});
test('revising a completed spec invalidates checks but preserves prior commit provenance', () => {
  const next = reviseSpec(createDemo(), 'SPEC-001', 'Also cover long localized names.');
  const spec = findSpec(next, 'SPEC-001')!.spec;
  assert.equal(spec.revision, 2);
  assert.equal(spec.status, 'queued');
  assert.ok(spec.checks.every(c => c.status === 'stale'));
  assert.equal(spec.commits[0].revision, 1);
  assert.equal(spec.amendments[0], 'Also cover long localized names.');
  assert.equal(progress(allSpecs(next)).completed, 2);
  assert.match(report(next), /DEMO DATA/);
  assert.match(report(next), /spec v1/);
});
test('malformed persisted state is rejected without crashing', () => {
  assert.equal(isDemoState(createDemo()), true);
  for (const value of [null, {}, { ...createDemo(), requests: [null] }, { ...createDemo(), events: [null] }, { ...createDemo(), expanded: 'oops' }, { ...createDemo(), schema: 9 }]) assert.equal(isDemoState(value), false);
  const unsafeDecision = createDemo(); unsafeDecision.decisions[0].id = '__proto__';
  assert.equal(isDemoState(unsafeDecision), false);
});
test('repeated revisions retain the actual check revision until verification reruns', () => {
  let next = reviseSpec(createDemo(), 'SPEC-001', 'First change');
  next = reviseSpec(next, 'SPEC-001', 'Second change');
  assert.equal(findSpec(next, 'SPEC-001')?.spec.revision, 3);
  assert.ok(findSpec(next, 'SPEC-001')?.spec.checks.every(c => c.revision === 1 && c.status === 'stale'));
  // A different spec is already active, so pause its activity for this fixture.
  findSpec(next, 'SPEC-003')!.spec.status = 'queued';
  for (let i = 0; i < 3; i++) next = advanceDemo(next);
  assert.ok(findSpec(next, 'SPEC-001')?.spec.checks.every(c => c.revision === 3 && c.status === 'passed'));
});

test('decisions and request controls gate eligibility, with revision-bound answers', () => {
  let state = createDemo();
  assert.equal(requestStatus(state, state.requests[1]), 'needs-input');
  state = setRequestControl(state, 'REQ-001', 'stopped');
  assert.equal(requestStatus(state, state.requests[0]), 'stopped');
  assert.equal(currentWork(state)?.request.id, 'REQ-003');
  const invalid = answerDecision(state, 'DEC-001', 'Bad choice', 'missing');
  assert.equal(invalid.decisions[0].answer, undefined);
  const stale = structuredClone(state); findSpec(stale, 'SPEC-007')!.spec.revision++;
  assert.equal(answerDecision(stale, 'DEC-001', 'Incremental', 'incremental').decisions[0].answer, undefined);
  state = answerDecision(state, 'DEC-001', 'Use an in-memory index with a small disk cache.');
  assert.match(state.decisions[0].answer!.text, /disk cache/);
  assert.equal(findSpec(state, 'SPEC-007')!.spec.status, 'queued');
  assert.equal(currentWork(state)?.spec.id, 'SPEC-007');
  assert.deepEqual(answerDecision(state, 'DEC-001', 'Cannot answer twice'), state);
  assert.ok(isDemoState(state));
});

test('routing searches finished work, reopens without losing commits, and never uses selection', () => {
  const state = createDemo();
  state.requests[0].milestones.forEach(m => m.specs.forEach(s => { s.status = 'completed'; }));
  state.selected = 'SPEC-010';
  assert.equal(searchRequests(state, { query: 'account settings', status: 'completed' })[0].requestId, 'REQ-001');
  const route = previewRoute(state, 'SPEC-001: cover localized names.', 'codex');
  assert.equal(route.kind, 'amend'); if (route.kind !== 'amend') return;
  const next = applySubmission(state, { text: 'SPEC-001: cover localized names.', choice: { provider: 'codex', model: 'default', effort: 'default' }, attachments: [], references: [] }, route);
  assert.equal(next.submissions[0].outcome, 'reopened');
  assert.equal(findSpec(next, 'SPEC-001')!.spec.revision, 2);
  assert.equal(findSpec(next, 'SPEC-001')!.spec.commits[0].revision, 1);
  assert.ok(findSpec(next, 'SPEC-001')!.spec.checks.every(c => c.status === 'stale'));
  assert.equal(findSpec(next, 'SPEC-010')!.spec.revision, 1);
  assert.ok(isDemoState(next));
  assert.equal(previewRoute(state, 'REQ-001: one more thing', 'claude').kind, 'ask');
  assert.equal(previewRoute(state, 'REQ-001 and REQ-003 need changes', 'codex').kind, 'ask');
});

test('request-level reopening waits for planning; unrelated messages become new requests', () => {
  const state = createDemo(); state.requests[0].milestones.forEach(m => m.specs.forEach(s => { s.status = 'completed'; }));
  const route = previewRoute(state, 'Improve account settings with avatar cropping', 'codex');
  assert.equal(route.kind, 'amend'); if (route.kind !== 'amend') return;
  const next = applySubmission(state, { text: 'Improve account settings with avatar cropping', choice: { provider: 'codex', model: 'default', effort: 'default' }, attachments: [{ id: 'local', name: 'photo.png', size: 24, mime: 'image/png' }], references: [] }, route);
  assert.equal(next.submissions[0].outcome, 'reopened');
  assert.equal(requestStatus(next, next.requests[0]), 'planning');
  assert.notEqual(currentWork(next)?.request.id, 'REQ-001');
  assert.equal(previewRoute(state, 'Build an invoice export', 'claude').kind, 'new');
  assert.ok(isDemoState(next));
});

test('schema 1 migration preserves prior revisions/history; capabilities constrain effort', () => {
  const current = reviseSpec(createDemo(), 'SPEC-001', 'Existing saved amendment');
  const old: Record<string, unknown> = { ...current, schema: 1 }; delete old.decisions; delete old.submissions;
  const restored = restoreDemo(old)!;
  assert.equal(restored.schema, 3);
  assert.equal(findSpec(restored, 'SPEC-001')!.spec.revision, 2);
  assert.equal(restored.decisions.length, 1);
  assert.equal(restoreDemo({ ...old, requests: [null] }), undefined);
  assert.deepEqual(normalizeChoice({ provider: 'claude', model: 'haiku', effort: 'high' }), { provider: 'claude', model: 'haiku', effort: 'default' });
  assert.equal(normalizeChoice({ provider: 'codex', model: 'unknown', effort: 'max' }).model, 'default');
});

test('project questions and discussion preserve the entire work projection and retain a transcript', () => {
  const state = createDemo();
  for (const text of ['What happened to REQ-001?', 'How should we improve account settings?', 'Could we use a different indexing strategy?', 'Tell me about this project', 'Hi', 'REQ-001: why is it blocked?']) {
    assert.equal(messageIntent(text), 'conversation', text);
    const next = discussProject(state, { text, choice: { provider: 'claude', model: 'default', effort: 'default' }, attachments: [], references: [] });
    assert.deepEqual(next.requests, state.requests);
    assert.deepEqual(next.decisions, state.decisions);
    assert.deepEqual(next.events, state.events);
    assert.deepEqual(next.submissions, state.submissions);
    assert.equal(next.messages.length, state.messages.length + 2);
    assert.equal(next.messages.at(-2)?.text, text);
    assert.ok(isDemoState(next));
  }
  const targeted = discussProject(state, { text: 'Why is REQ-001 blocked?', choice: { provider: 'codex', model: 'default', effort: 'default' }, attachments: [], references: [] });
  assert.deepEqual(targeted.messages.at(-1)?.requestIds, ['REQ-001']);
});

test('actionable changes and execution events produce linked conversation updates', () => {
  for (const text of ['Add an invoice export', 'Can you fix the sidebar?', 'Please improve the project search', 'SPEC-001: Cover localized names', 'I want to add a dashboard', 'REQ-001 and REQ-003 need a review']) assert.equal(messageIntent(text), 'work', text);
  let state = createDemo();
  const input = { text: 'Build an invoice export', choice: { provider: 'codex' as const, model: 'default', effort: 'default' }, attachments: [], references: [] };
  const route = previewRoute(state, input.text, 'codex'); assert.equal(route.kind, 'new');
  state = explainTaskSubmission(applySubmission(rememberUserMessage(state, input), input, route));
  assert.match(state.messages.at(-1)!.text, /Added REQ-004/);
  assert.deepEqual(state.messages.at(-1)!.requestIds, ['REQ-004']);
  state = advanceDemo(state);
  assert.equal(state.messages.at(-1)?.kind, 'update');
  assert.deepEqual(state.messages.at(-1)?.requestIds, ['REQ-001']);
  assert.ok(isDemoState(state));
});

test('schema 2 migration imports all retained submissions as conversation without losing provenance', () => {
  const input = { text: 'Add a report export', choice: { provider: 'claude' as const, model: 'sonnet', effort: 'high' }, attachments: [], references: [] };
  const state = applySubmission(createDemo(), input, { kind: 'new', reason: 'New subject.' });
  const old: Record<string, unknown> = { ...state, schema: 2 }; delete old.messages;
  const restored = restoreDemo(old)!;
  assert.equal(restored.schema, 3);
  assert.deepEqual(restored.submissions, state.submissions);
  assert.deepEqual(restored.requests, state.requests);
  assert.ok(restored.messages.some(m => m.role === 'user' && m.text === input.text));
  assert.ok(restored.messages.some(m => m.role === 'assistant' && m.requestIds.includes('REQ-004')));
  const invalid = { ...restored, messages: [{ role: 'user', text: 'missing fields' }] };
  assert.equal(isDemoState(invalid), false);
});
