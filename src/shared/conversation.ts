import { appendChat, currentWork, findSpec, providerName, requestStatus, requestStatusLabels, type DemoState } from './model';
import { searchRequests, type Incoming } from './routing';

export type MessageIntent = 'work' | 'conversation';
// Preview-only intent recognition. Questions/discussion do not invoke task-mutating reducers.
export function messageIntent(text: string): MessageIntent {
  const normalized = text.trim().replace(/^(?:(?:REQ|SPEC)-\d+\s*[:,]?\s*)+/i, '').replace(/^please\s+/i, '');
  if (/^(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:add|build|create|implement|fix|change|update|improve|refactor|remove|support|reopen)\b/i.test(normalized)) return 'work';
  if (/^(?:add|build|create|implement|fix|change|update|improve|refactor|remove|support|reopen|cover)\b/i.test(normalized)) return 'work';
  if (/^(?:i\s+(?:want|need|would like)\s+(?:you\s+)?to\s+|let['’]?s\s+)(?:add|build|create|implement|fix|change|update|improve|refactor|remove|support|reopen)\b/i.test(normalized)) return 'work';
  if (!text.includes('?') && /\b(?:REQ|SPEC)-\d+\b.*\bneeds?\s+(?:a\s+)?(?:fix|change|update|review)\b/i.test(text)) return 'work';
  return 'conversation';
}
export function rememberUserMessage(state: DemoState, input: Incoming): DemoState {
  const next = structuredClone(state);
  appendChat(next, { role: 'user', text: input.text, kind: 'message', requestIds: [], choice: input.choice, attachments: input.attachments.map(({ id, name, size, mime }) => ({ id, name, size, mime })), references: input.references });
  return next;
}
export function discussProject(state: DemoState, input: Incoming): DemoState {
  const next = rememberUserMessage(state, input);
  const text = input.text.toLowerCase();
  const specId = input.text.match(/\bSPEC-\d{3,6}\b/i)?.[0].toUpperCase();
  const spec = specId ? findSpec(state, specId) : undefined;
  const candidates = searchRequests(state, { query: input.text.replace(/\b(project|workspace)\b/gi, '') }).filter(r => r.score >= 3).slice(0, 3);
  const blocked = state.requests.filter(r => ['needs-input', 'blocked', 'paused', 'stopped'].includes(requestStatus(state, r)));
  let response: string; let requestIds: string[] = [];
  if (spec) {
    requestIds = [spec.request.id];
    response = `${spec.spec.id} is ${spec.spec.status} at revision ${spec.spec.revision}. ${spec.spec.description}\n\n${spec.spec.checks.filter(c => c.status === 'passed').length}/${spec.spec.checks.length} sample checks passed; ${spec.spec.commits.length} sample commit(s) linked. These are preview records, not evidence from your repository.`;
  } else if (/\b(blocked|blocking|waiting|decision|stopped|paused)\b/.test(text) && !candidates.length) {
    requestIds = blocked.map(r => r.id);
    response = blocked.length ? blocked.map(r => `${r.title}: ${requestStatusLabels[requestStatus(state, r)].toLowerCase()}. ${r.note ?? ''}`).join('\n\n') : 'No requests currently show a blocker or pending decision in the demo queue.';
  } else if (candidates.length) {
    requestIds = candidates.map(r => r.requestId);
    response = candidates.map(c => {
      const request = state.requests.find(r => r.id === c.requestId)!;
      const specs = request.milestones.flatMap(m => m.specs);
      return `${c.requestId} · ${c.title}: ${requestStatusLabels[c.status].toLowerCase()}, with ${specs.filter(s => s.status === 'completed').length}/${specs.length} specs complete. ${request.note ?? ''}`;
    }).join('\n\n');
  } else if (/\b(status|progress|happening|happened|doing|update)\b|where.*\b(we|work|project)\b/.test(text)) {
    const current = currentWork(state); const pending = state.decisions.filter(d => !d.answer).length;
    requestIds = current ? [current.request.id] : [];
    response = `${state.paused ? 'The demo is paused.' : current ? `${current.spec.title} is ${current.spec.status} in ${current.milestone.title}.` : 'No work is currently eligible to run.'} There are ${state.requests.length} requests and ${pending} pending decision(s). Open a linked request to inspect its specs, checks, and commits.`;
  } else if (/\b(workflow|architecture|extension|relay|codex|claude|plan|project)\b/.test(text)) {
    response = 'Relay is a shared project conversation and request queue for Codex and Claude Code. You can discuss ideas here; actionable changes become requests with milestones, specs, checks, and linked commits. Each request keeps its own agent.\n\nThis preview uses local replies and demo work. The connected runtime, codebase investigation, and automatic execution are in the implementation plan.';
  } else if (/^(hi|hello|hey|thanks|thank you)\b/.test(text)) {
    response = 'You can ask about the project, explore an idea, or check on the queue here. When you want work added, describe the change—for example, “Add an invoice export.”';
  } else {
    response = 'We can explore that here. This preview can summarize the queue and explain Relay’s planned workflow; a connected agent will be needed to reason about your actual codebase.\n\nI’ve kept this in the conversation. No request was created or changed.';
  }
  if (input.attachments.length) response += '\n\nYour attachment names are included in this message. This preview has not analyzed their contents.';
  appendChat(next, { role: 'assistant', text: response, kind: 'message', requestIds });
  return next;
}
export function explainTaskSubmission(state: DemoState): DemoState {
  const next = structuredClone(state); const receipt = next.submissions[0];
  if (!receipt) return next;
  const request = next.requests.find(r => r.id === receipt.requestId)!;
  const text = receipt.outcome === 'created' ? `Added ${receipt.requestId} to the ${providerName(request.provider)} queue. It is waiting for codebase review and planning.` :
    `${receipt.outcome === 'reopened' ? 'Reopened' : 'Updated'} ${receipt.specId ?? receipt.requestId}. ${receipt.specId ? 'Its revision increased and previous checks are stale. Earlier commits remain linked to their original revision.' : 'The amendment is waiting for an updated plan; previous work remains in its history.'}`;
  appendChat(next, { role: 'assistant', text, kind: 'task', requestIds: [receipt.requestId] });
  return next;
}
