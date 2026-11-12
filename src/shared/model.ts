import { isAttachmentMeta, isReference, type AttachmentMeta, type ExecutionChoice, type Reference } from './context';
export type Provider = 'codex' | 'claude';
export type SpecStatus = 'queued' | 'implementing' | 'testing' | 'committing' | 'pushing' | 'completed' | 'blocked';
export interface Check { name: string; kind: 'unit' | 'browser' | 'layout'; status: 'passed' | 'pending' | 'stale'; detail: string; revision: number }
export interface Commit { sha: string; subject: string; revision: number; pushed: boolean }
export interface Spec {
  id: string; title: string; description: string; status: SpecStatus; revision: number;
  criteria: string[]; checks: Check[]; commits: Commit[]; amendments: string[];
}
export interface Milestone { id: string; title: string; branch: string; specs: Spec[] }
export interface RequestItem { id: string; title: string; provider: Provider; milestones: Milestone[]; note?: string; control?: 'paused' | 'stopped'; reviewPending?: boolean; blocked?: boolean }
export interface Decision {
  id: string; requestId: string; specId?: string; revision: number; question: string; context: string;
  options: { id: string; label: string; description: string; recommended?: boolean }[];
  answer?: { optionId?: string; text: string; time: string }; choice?: ExecutionChoice;
}
export interface Submission {
  id: string; text: string; requestId: string; specId?: string; choice: ExecutionChoice;
  attachments: AttachmentMeta[]; references: Reference[]; outcome: 'created' | 'amended' | 'reopened'; reason: string;
}
export interface Activity { id: string; text: string; time: string; kind: 'info' | 'success' | 'warning' }
export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; text: string; time: string;
  kind: 'message' | 'task' | 'update' | 'decision'; requestIds: string[];
  choice?: ExecutionChoice; attachments?: AttachmentMeta[]; references?: Reference[];
}
export interface DemoState {
  schema: 3; requests: RequestItem[]; events: Activity[]; selected: string; decisions: Decision[]; submissions: Submission[]; messages: ChatMessage[];
  expanded: string[]; paused: boolean; nextRequest: number;
}
export const providerName = (provider: Provider): string => provider === 'codex' ? 'Codex' : 'Claude Code';
export const isActive = (spec: Spec): boolean => ['implementing', 'testing', 'committing', 'pushing'].includes(spec.status);
export function allSpecs(state: DemoState): Spec[] { return state.requests.flatMap(r => r.milestones.flatMap(m => m.specs)); }
export function progress(specs: Spec[]): { completed: number; total: number; percent: number } {
  const completed = specs.filter(s => s.status === 'completed').length;
  return { completed, total: specs.length, percent: specs.length ? Math.round(completed / specs.length * 100) : 0 };
}
export function findSpec(state: DemoState, id: string) {
  for (const request of state.requests) for (const milestone of request.milestones) {
    const spec = milestone.specs.find(s => s.id === id);
    if (spec) return { request, milestone, spec };
  }
  return undefined;
}
export function currentWork(state: DemoState) {
  const eligible = state.requests.filter(r => !r.control && !r.blocked && !r.reviewPending && !state.decisions.some(d => d.requestId === r.id && !d.answer)).flatMap(r => r.milestones.flatMap(m => m.specs));
  const active = eligible.find(isActive) ?? eligible.find(s => s.status === 'queued');
  return active ? findSpec(state, active.id) : undefined;
}
export function record(state: DemoState, text: string, kind: Activity['kind'] = 'info') {
  state.events.unshift({ id: `event-${Date.now()}-${state.events.length}`, text, kind, time: new Date().toISOString() });
  state.events = state.events.slice(0, 100);
}
export function appendChat(state: DemoState, message: Omit<ChatMessage, 'id' | 'time'>): void {
  state.messages.push({ ...message, text: message.text.length > 12000 ? `${message.text.slice(0, 11999)}…` : message.text, requestIds: message.requestIds.slice(0, 20), id: `chat-${crypto.randomUUID()}`, time: new Date().toISOString() });
  state.messages = state.messages.slice(-200);
}
export function addRequest(state: DemoState, text: string, provider: Provider): DemoState {
  const next = structuredClone(state);
  const id = `REQ-${String(next.nextRequest++).padStart(3, '0')}`;
  next.requests.push({ id, title: text, provider, milestones: [], note: 'Awaiting codebase review and planning. This preview does not run an agent.' });
  record(next, `${id} added to the ${providerName(provider)} queue. Planning pending.`);
  return next;
}
export function reviseSpec(state: DemoState, id: string, text: string): DemoState {
  const next = structuredClone(state);
  const match = findSpec(next, id);
  if (!match) return next;
  match.spec.revision += 1;
  match.spec.amendments.push(text);
  match.spec.status = 'queued';
  for (const check of match.spec.checks) check.status = 'stale';
  record(next, `${id} revised to v${match.spec.revision}. Previous checks require a rerun.`, 'warning');
  return next;
}
export function advanceDemo(state: DemoState): DemoState {
  const next = structuredClone(state);
  if (next.paused) return next;
  const match = currentWork(next);
  if (!match) return next;
  const { spec } = match;
  const phases: SpecStatus[] = ['queued', 'implementing', 'testing', 'committing', 'pushing', 'completed'];
  spec.status = phases[phases.indexOf(spec.status) + 1] ?? 'completed';
  if (spec.status === 'committing') for (const check of spec.checks) { check.status = 'passed'; check.revision = spec.revision; }
  if (spec.status === 'pushing') spec.commits.push({ sha: `d3a0${spec.id.slice(-3)}`, subject: spec.title, revision: spec.revision, pushed: false });
  if (spec.status === 'completed') for (const commit of spec.commits) if (commit.revision === spec.revision) commit.pushed = true;
  next.selected = spec.id;
  record(next, `${spec.id} → ${spec.status}. Simulated event.`, spec.status === 'completed' ? 'success' : 'info');
  const update: Record<string, string> = {
    implementing: 'Implementation started.', testing: 'Implementation is ready for behavior and overflow checks.',
    committing: 'Checks passed in the demo. Preparing the associated commit.', pushing: 'The sample commit is ready; simulating its push.',
    completed: 'Completed in the demo, with checks and a linked sample commit.'
  };
  appendChat(next, { role: 'assistant', text: `${spec.title}: ${update[spec.status]}`, kind: 'update', requestIds: [match.request.id] });
  return next;
}
// Persistence is untrusted input, including data saved by an older extension version.
function validBase(value: unknown, schema: number): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as DemoState;
  const string = (s: unknown) => typeof s === 'string' && s.length <= 12000;
  const list = (a: unknown): a is unknown[] => Array.isArray(a) && a.length <= 200;
  if (v.schema !== schema || !list(v.requests) || !list(v.events) || !string(v.selected) || !list(v.expanded) || !v.expanded.every(string) || typeof v.paused !== 'boolean' || !Number.isSafeInteger(v.nextRequest) || v.nextRequest < 1 || v.nextRequest > 999999) return false;
  try {
    return v.requests.every(r => string(r.id) && /^REQ-\d{3,6}$/.test(r.id) && string(r.title) && ['codex', 'claude'].includes(r.provider) && (r.control === undefined || ['paused', 'stopped'].includes(r.control)) && (r.reviewPending === undefined || typeof r.reviewPending === 'boolean') && (r.blocked === undefined || typeof r.blocked === 'boolean') && (r.note === undefined || string(r.note)) && list(r.milestones) && r.milestones.every(m => string(m.id) && /^MS-\d{3,6}$/.test(m.id) && string(m.title) && string(m.branch) && list(m.specs) && m.specs.every(s =>
      string(s.id) && /^SPEC-\d{3,6}$/.test(s.id) && string(s.title) && string(s.description) && ['queued', 'implementing', 'testing', 'committing', 'pushing', 'completed', 'blocked'].includes(s.status) && Number.isSafeInteger(s.revision) && s.revision > 0 && list(s.criteria) && s.criteria.every(string) && list(s.amendments) && s.amendments.every(string) && list(s.checks) && s.checks.every(c => string(c.name) && string(c.detail) && Number.isSafeInteger(c.revision) && c.revision > 0 && ['unit', 'browser', 'layout'].includes(c.kind) && ['passed', 'pending', 'stale'].includes(c.status)) && list(s.commits) && s.commits.every(c => string(c.sha) && string(c.subject) && Number.isSafeInteger(c.revision) && typeof c.pushed === 'boolean')
    ))) && v.events.every(e => string(e.id) && string(e.text) && string(e.time) && ['info', 'success', 'warning'].includes(e.kind));
  } catch { return false; }
}
function validDetails(value: unknown, schema: number): boolean {
  if (!validBase(value, schema)) return false;
  const s = value as DemoState;
  const text = (v: unknown) => typeof v === 'string' && v.length <= 12000;
  try {
    return Array.isArray(s.decisions) && s.decisions.length <= 200 && s.decisions.every(d =>
      text(d.id) && /^DEC-\d{3,6}$/.test(d.id) && (d.requestId === 'conversation' || s.requests.some(r => r.id === d.requestId)) && (d.specId === undefined || findSpec(s, d.specId)?.request.id === d.requestId) && Number.isSafeInteger(d.revision) && d.revision > 0 && text(d.question) && text(d.context) && Array.isArray(d.options) && d.options.length <= 20 && d.options.every(o => text(o.id) && text(o.label) && text(o.description) && (o.recommended === undefined || typeof o.recommended === 'boolean')) && (!d.answer || (text(d.answer.text) && text(d.answer.time) && (d.answer.optionId === undefined || d.options.some(o => o.id === d.answer!.optionId))))) &&
      Array.isArray(s.submissions) && s.submissions.length <= 100 && s.submissions.every(m => text(m.id) && text(m.text) && text(m.requestId) && (m.specId === undefined || text(m.specId)) && ['created', 'amended', 'reopened'].includes(m.outcome) && text(m.reason) && ['codex', 'claude'].includes(m.choice.provider) && text(m.choice.model) && text(m.choice.effort) && Array.isArray(m.attachments) && m.attachments.length <= 6 && m.attachments.every(isAttachmentMeta) && m.attachments.reduce((sum, a) => sum + a.size, 0) <= 12 * 1024 * 1024 && !m.attachments.some(a => 'thumbnail' in a) && Array.isArray(m.references) && m.references.length <= 30 && m.references.every(isReference));
  } catch { return false; }
}
export function isDemoState(value: unknown): value is DemoState {
  if (!validDetails(value, 3)) return false;
  const state = value as DemoState;
  const text = (v: unknown) => typeof v === 'string' && v.length <= 12000;
  try {
    return Array.isArray(state.messages) && state.messages.length <= 200 && state.messages.every(m =>
      text(m.id) && text(m.text) && text(m.time) && ['user', 'assistant'].includes(m.role) && ['message', 'task', 'update', 'decision'].includes(m.kind) &&
      Array.isArray(m.requestIds) && m.requestIds.length <= 20 && m.requestIds.every(id => typeof id === 'string' && /^REQ-\d{3,6}$/.test(id)) &&
      (m.choice === undefined || (['codex', 'claude'].includes(m.choice.provider) && text(m.choice.model) && text(m.choice.effort))) &&
      (m.attachments === undefined || (Array.isArray(m.attachments) && m.attachments.length <= 6 && m.attachments.every(isAttachmentMeta) && !m.attachments.some(a => 'thumbnail' in a) && m.attachments.reduce((sum, a) => sum + a.size, 0) <= 12 * 1024 * 1024)) &&
      (m.references === undefined || (Array.isArray(m.references) && m.references.length <= 30 && m.references.every(isReference))));
  } catch { return false; }
}
export function indexingDecision(): Decision {
  return { id: 'DEC-001', requestId: 'REQ-002', specId: 'SPEC-007', revision: 1,
    question: 'How should search build its index?', context: 'The baseline is ready. Choose a strategy before incremental indexing starts.',
    options: [
      { id: 'incremental', label: 'Incremental index', description: 'Update changed files; faster repeat searches with more invalidation logic.', recommended: true },
      { id: 'on-demand', label: 'Index on demand', description: 'Simpler implementation; the first search may take longer.' }
    ] };
}
export function restoreDemo(value: unknown): DemoState | undefined {
  if (isDemoState(value)) return value;
  const legacy = validBase(value, 1);
  if (!legacy && !validDetails(value, 2)) return undefined;
  const migrated = structuredClone(value) as DemoState;
  migrated.schema = 3; migrated.messages = [];
  if (legacy) {
    migrated.submissions = []; migrated.decisions = [];
    if (findSpec(migrated, 'SPEC-007')?.spec.status === 'blocked' && migrated.requests.some(r => r.id === 'REQ-002' && r.note?.includes('indexing strategy'))) migrated.decisions.push(indexingDecision());
  }
  appendChat(migrated, { role: 'assistant', text: 'Your saved request history is available below. You can also ask questions or discuss ideas here without creating work.', kind: 'message', requestIds: [] });
  for (const submission of [...migrated.submissions].reverse()) {
    appendChat(migrated, { role: 'user', text: submission.text, kind: 'message', requestIds: [submission.requestId], choice: submission.choice, attachments: submission.attachments, references: submission.references });
    appendChat(migrated, { role: 'assistant', text: `${submission.requestId} was ${submission.outcome} in the previous preview. ${submission.reason}`, kind: 'task', requestIds: [submission.requestId] });
  }
  return isDemoState(migrated) ? migrated : undefined;
}
export type RequestStatus = 'running' | 'paused' | 'stopped' | 'needs-input' | 'blocked' | 'completed' | 'queued' | 'planning';
export const requestStatusLabels: Record<RequestStatus, string> = { running: 'Running', paused: 'Paused', stopped: 'Stopped', 'needs-input': 'Needs decision', blocked: 'Blocked', completed: 'Done', queued: 'Queued', planning: 'Needs planning' };
export function requestStatus(state: DemoState, request: RequestItem): RequestStatus {
  if (request.control) return request.control;
  if (request.blocked) return 'blocked';
  if (state.decisions.some(d => d.requestId === request.id && !d.answer)) return 'needs-input';
  if (request.reviewPending || !request.milestones.length) return 'planning';
  const specs = request.milestones.flatMap(m => m.specs);
  if (specs.some(isActive)) return state.paused ? 'paused' : 'running';
  if (specs.some(s => s.status === 'blocked')) return 'blocked';
  return specs.length && specs.every(s => s.status === 'completed') ? 'completed' : 'queued';
}
export function answerDecision(state: DemoState, id: string, text: string, optionId?: string): DemoState {
  const next = structuredClone(state); const decision = next.decisions.find(d => d.id === id);
  if (!decision || decision.answer || !text.trim() || text.length > 4000 || (optionId && !decision.options.some(o => o.id === optionId))) return next;
  const match = decision.specId ? findSpec(next, decision.specId) : undefined;
  if (match && (match.spec.revision !== decision.revision || match.spec.amendments.length >= 200)) return next;
  decision.answer = { text: text.trim(), optionId, time: new Date().toISOString() };
  if (match && match.spec.status === 'blocked') { match.spec.status = 'queued'; match.spec.amendments.push(`Decision: ${text.trim()}`); }
  const request = next.requests.find(r => r.id === decision.requestId)!;
  if (!next.decisions.some(d => d.requestId === request.id && !d.answer)) request.note = 'Decision recorded. Eligible work can continue in the demo.';
  record(next, `${decision.requestId}: decision answered — ${text.trim()}.`, 'success');
  appendChat(next, { role: 'user', text: `For ${decision.requestId}: ${text.trim()}`, kind: 'decision', requestIds: [decision.requestId] });
  appendChat(next, { role: 'assistant', text: 'Decision recorded. The indexing work can now continue in the demo; its checks still need to run.', kind: 'decision', requestIds: [decision.requestId] });
  return next;
}
export function setRequestControl(state: DemoState, id: string, control?: RequestItem['control']): DemoState {
  const next = structuredClone(state); const request = next.requests.find(r => r.id === id);
  if (request) {
    request.control = control; record(next, `${id} ${control ?? 'resumed'}. Simulated execution control.`);
    appendChat(next, { role: 'assistant', text: `${request.title} ${control ?? 'resumed'} in the demo.`, kind: 'update', requestIds: [id] });
  }
  return next;
}
