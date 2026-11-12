import { addRequest, record, requestStatus, reviseSpec, type DemoState, type Provider, type Submission } from './model';
import type { AttachmentMeta, ExecutionChoice, Reference } from './context';

export interface RequestSearch { query: string; provider?: Provider; status?: ReturnType<typeof requestStatus> }
export interface Match { requestId: string; title: string; provider: Provider; score: number; specId?: string; status: ReturnType<typeof requestStatus> }
const words = (s: string) => [...new Set(s.toLowerCase().match(/[a-z0-9-]{3,}/g) ?? [])].filter(w => !['the', 'and', 'with', 'for', 'this', 'that', 'also', 'please', 'add', 'make', 'update', 'request', 'should', 'have', 'from', 'into'].includes(w));
// Deliberately simple, deterministic preview. The production agent calls search/get tools.
export function searchRequests(state: DemoState, query: RequestSearch): Match[] {
  const terms = words(query.query);
  return state.requests.filter(r => (!query.provider || r.provider === query.provider) && (!query.status || requestStatus(state, r) === query.status)).map(r => {
    const specs = r.milestones.flatMap(m => m.specs);
    const spec = specs.find(s => new RegExp(`\\b${s.id}\\b`, 'i').test(query.query));
    const explicit = new RegExp(`\\b${r.id}\\b`, 'i').test(query.query);
    const titleWords = words(r.title);
    const overlaps = terms.filter(w => titleWords.includes(w)).length;
    const detailWords = words(specs.map(s => `${s.title} ${s.description}`).join(' '));
    const score = spec || explicit ? 100 : overlaps * 3 + terms.filter(w => detailWords.includes(w)).length;
    return { requestId: r.id, title: r.title, provider: r.provider, score, specId: spec?.id, status: requestStatus(state, r) };
  }).filter(m => m.score > 0).sort((a, b) => b.score - a.score).slice(0, 20);
}
export type Route = { kind: 'new'; reason: string } | { kind: 'amend'; match: Match; reason: string } | { kind: 'ask'; matches: Match[]; reason: string };
export function previewRoute(state: DemoState, text: string, provider: Provider): Route {
  const results = searchRequests(state, { query: text });
  const explicit = results.filter(r => r.score === 100);
  if (explicit.length === 1 && explicit[0].provider === provider) return { kind: 'amend', match: explicit[0], reason: 'Matched an explicit request/spec ID across the full queue, including finished work.' };
  if (explicit.length) return { kind: 'ask', matches: explicit, reason: explicit.length > 1 ? 'This message names several targets. Which request should this preview amend?' : 'This request belongs to another agent. Keep its agent or create separate work?' };
  const candidates = results.filter(r => r.provider === provider && r.score >= 6);
  if (candidates.length && (candidates.length === 1 || candidates[0].score >= candidates[1].score + 3)) return { kind: 'amend', match: candidates[0], reason: 'Matched request subject keywords. This is a routing simulation, not semantic agent analysis.' };
  if (candidates.length) return { kind: 'ask', matches: candidates.slice(0, 4), reason: 'Several request subjects match. Choose the intended target for this preview.' };
  return { kind: 'new', reason: 'No strong subject match in the preview search. Codebase review and grouping remain pending.' };
}
export interface Incoming { text: string; choice: ExecutionChoice; attachments: AttachmentMeta[]; references: Reference[] }
export function applySubmission(state: DemoState, input: Incoming, route: Exclude<Route, { kind: 'ask' }>): DemoState {
  let next = state;
  let requestId: string; let specId: string | undefined; let outcome: Submission['outcome'];
  if (route.kind === 'new') {
    next = addRequest(next, input.text, input.choice.provider);
    requestId = next.requests[next.requests.length - 1].id; outcome = 'created';
  } else {
    const original = state.requests.find(r => r.id === route.match.requestId);
    if (!original || original.provider !== input.choice.provider) return structuredClone(state);
    const wasDone = requestStatus(state, original) === 'completed';
    requestId = original.id; specId = route.match.specId;
    if (specId) next = reviseSpec(next, specId, input.text);
    else { next = structuredClone(next); const target = next.requests.find(r => r.id === requestId)!; target.reviewPending = true; target.note = 'Amendment awaiting codebase review and an updated plan. Previous evidence is retained as history.'; }
    outcome = wasDone ? 'reopened' : 'amended';
    record(next, `${requestId} ${outcome}${specId ? ` through ${specId}` : ''}. ${wasDone ? 'Completed history retained; fresh planning/verification required.' : 'Message attached by preview routing.'}`, 'warning');
  }
  const entry: Submission = { ...structuredClone(input), attachments: input.attachments.map(({ id, name, size, mime }) => ({ id, name, size, mime })), id: `MSG-${Date.now()}-${next.submissions.length}`, requestId, specId, outcome, reason: route.reason };
  next.submissions.unshift(entry); next.submissions = next.submissions.slice(0, 100);
  if (!next.expanded.includes(requestId)) next.expanded.push(requestId);
  return next;
}
