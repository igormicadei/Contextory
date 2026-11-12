import { createDemo } from '../shared/fixtures';
import { advanceDemo, allSpecs, answerDecision, appendChat, currentWork, findSpec, isActive, progress, record, requestStatus, requestStatusLabels, restoreDemo, setRequestControl, type DemoState, type Provider, type Spec } from '../shared/model';
import { attachmentLimits, imageMimes, isAttachment, isReference, normalizeChoice, sampleModels, sampleReferences, type Attachment, type ExecutionChoice, type ModelChoice, type Reference } from '../shared/context';
import { applySubmission, previewRoute, type Incoming, type Route } from '../shared/routing';
import { discussProject, explainTaskSubmission, messageIntent, rememberUserMessage } from '../shared/conversation';
import { composer, escape, questionCard, referenceOptions, type AnswerDraft } from './components';
import { conversationView } from './conversationView';
import { report } from '../shared/report';
import type { RuntimeResult, ToHost, ToWebview } from '../shared/protocol';
import { icon } from './icons';

declare const acquireVsCodeApi: undefined | (() => { postMessage(message: ToHost): void; getState(): unknown; setState(state: DemoState): void });
const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
const app = document.querySelector<HTMLDivElement>('#app')!;
let liveMode = false;
let nativeClaude = true;
let nativeCodex = false;
let workspaceName = 'DevExtension';
let activity = '';
let catalogs: Record<Provider, ModelChoice[]> = structuredClone(sampleModels);
let state: DemoState = vscode ? { schema: 3, requests: [], events: [], selected: '', decisions: [], submissions: [], messages: [], expanded: [], paused: false, nextRequest: 1 } : createDemo();
try { const saved: unknown = vscode ? null : JSON.parse(localStorage.getItem('relay.demo.v1') ?? 'null'); state = restoreDemo(saved) ?? state; } catch { /* Start with fixtures after invalid or unavailable storage. */ }
type Section = 'chat' | 'requests' | 'activity' | 'detail' | 'providers';
let section: Section = 'chat';
let executionDetailsOpen = false;
let modelSettingsOpen = false;
let moreOpen = false;
let openDecision: string | undefined;
let scrollToLatest = true;
let lastRenderedSection: Section = section;
const scrollPositions: Partial<Record<Section, number>> = {};
let lastReadMessage = state.messages.at(-1)?.id;
let detailTab: 'overview' | 'checks' | 'commits' = 'overview';
let filter = '';
let draft = '';
let choice: ExecutionChoice = { provider: 'codex', model: 'default', effort: 'default' };
let attachments: Attachment[] = [];
let references: Reference[] = [];
const answerDrafts: Record<string, AnswerDraft> = {};
let pendingRoute: { input: Incoming; route: Extract<Route, { kind: 'ask' }> } | undefined;
let referenceToken: { start: number; end: number; trigger: '@' | '$' | '/'; query: string } | undefined;
let referenceItems: Reference[] = [];
let referenceIndex = 0;
let referenceRequest = 0;
let referenceTimer: ReturnType<typeof setTimeout> | undefined;
let notice = '';
let runtimeResults: RuntimeResult[] = [];
let checking = false;
let dialog = '';
const phase: Record<Spec['status'], string> = { queued: 'Queued', implementing: 'Implementing', testing: 'Testing', committing: 'Committing', pushing: 'Pushing', completed: 'Completed', blocked: 'Blocked' };
const statusIcon = (s: Spec) => s.status === 'completed' ? 'check' : s.status === 'blocked' ? 'blocked' : isActive(s) ? 'active' : 'circle';
function persist() { if (liveMode) return; vscode?.setState(state); if (vscode) vscode.postMessage({ type: 'save', state }); else { try { localStorage.setItem('relay.demo.v1', JSON.stringify(state)); } catch { notice = 'Browser storage is unavailable. Changes last for this page only.'; } } }
function host(message: ToHost) {
  if (vscode) { vscode.postMessage(message); return; }
  if (message.type === 'checkRuntimes') { checking = false; notice = 'Open the extension in VS Code to check installed runtimes. Browser preview cannot inspect your computer.'; render(); }
  if (message.type === 'openPlan') window.open('/plan', '_blank', 'noopener');
  if (message.type === 'openSpec') {
    const match = findSpec(state, message.id);
    if (match) { dialog = `# ${match.spec.id}: ${match.spec.title}\n\nDEMO SPECIFICATION · Revision ${match.spec.revision}\n\n${match.spec.description}\n\nAcceptance criteria\n${match.spec.criteria.map(c => `• ${c}`).join('\n')}\n\nChange requests\n${match.spec.amendments.join('\n') || 'None.'}`; render(); }
  }
  if (message.type === 'openDiff') { dialog = `SAMPLE DIFF · ${message.id} · ${message.sha}\n\nThis is illustrative content, not a Git diff from your workspace.\n\n .settings-panel {\n-  width: 640px;\n+  width: 100%;\n+  max-width: 640px;\n+  min-width: 0;\n }`; render(); }
  if (message.type === 'openReport') {
    const url = URL.createObjectURL(new Blob([message.markdown], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'relay-demo-report.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice = 'Demo report exported. All implementation evidence is labeled as simulated.'; render();
  }
}
function miniProvider(p: Provider) { return `<span class="provider ${p}">${icon(p)}${p === 'codex' ? 'Codex' : 'Claude'}</span>`; }
function tree(): string {
  const requests = state.requests.filter(r => !filter || `${r.title} ${r.id} ${r.provider} ${r.milestones.flatMap(m => [m.title, ...m.specs.map(s => `${s.id} ${s.title}`)]).join(' ')}`.toLowerCase().includes(filter.toLowerCase()));
  if (!requests.length) return `<div class="empty">${icon('search')}<strong>No matching requests</strong><p>Try a title, ID, or provider name.</p><button class="text-button" data-action="clearFilter">Clear filter</button></div>`;
  return `<ul class="request-list" aria-label="Request hierarchy">${requests.map(r => {
    const specs = r.milestones.flatMap(m => m.specs); const p = progress(specs); const status = requestStatus(state, r); const expanded = state.expanded.includes(r.id) || !!filter;
    return `<li class="request ${status}"><button class="request-row" data-expand="${r.id}" aria-expanded="${expanded}"><span class="disclosure ${expanded ? 'open' : ''}">${icon('chevron')}</span><span class="request-body"><span class="request-meta"><span class="mono">${r.id}</span>${miniProvider(r.provider)}<span class="count">${p.total ? `${p.completed}/${p.total}` : 'Unplanned'}</span></span><span class="request-title">${escape(r.title)}</span><span class="request-status ${status}"><span class="status-dot" aria-hidden="true"></span>${requestStatusLabels[status]}</span></span></button>${expanded ? `<div class="request-children"><div class="request-controls">${liveMode ? `<button class="text-button" data-run-request="${r.id}">${icon('play')}Run request</button><button class="text-button" data-worktree="${r.id}">${icon('folder')}Open worktree</button><button class="text-button" data-action="stopLive">${icon('blocked')}Stop</button>` : r.control ? `<button class="text-button" data-request-control="${r.id}" data-control="resume">${icon('play')}Resume</button>` : `<button class="text-button" data-request-control="${r.id}" data-control="paused">${icon('pause')}Pause</button><button class="text-button" data-request-control="${r.id}" data-control="stopped">${icon('blocked')}Stop</button>`}</div>${state.decisions.filter(d => d.requestId === r.id).map(d => questionCard(d, answerDrafts[d.id])).join('')}${r.note ? `<p class="request-note ${status === 'blocked' || status === 'needs-input' ? 'warning' : ''}">${status === 'blocked' ? icon('blocked') : icon('file')}${escape(r.note)}</p>` : ''}<ul class="milestone-list">${r.milestones.map(m => {
      const mp = progress(m.specs); const open = state.expanded.includes(m.id) || !!filter;
      return `<li class="milestone"><button class="milestone-row" data-expand="${m.id}" aria-expanded="${open}"><span class="disclosure ${open ? 'open' : ''}">${icon('chevron')}</span><span class="milestone-label">${escape(m.title)}</span><span class="count mono">${mp.completed}/${mp.total}</span></button>${open ? `<ul class="spec-list">${m.specs.map(s => `<li><button class="spec-row ${s.status} ${s.id === state.selected ? 'selected' : ''}" data-select="${s.id}" aria-label="${escape(`${s.id}: ${s.title}, ${phase[s.status]}`)}"><span class="spec-status">${icon(statusIcon(s))}</span><span class="spec-title">${escape(s.title)}</span>${isActive(s) ? '<span class="live-dot" aria-hidden="true"></span>' : ''}</button></li>`).join('')}</ul>` : ''}</li>`;
    }).join('')}</ul></div>` : ''}</li>`;
  }).join('')}</ul>`;
}
function detail(): string {
  const found = findSpec(state, state.selected); if (!found) return '<p class="empty">Select a specification to inspect it.</p>';
  const { request, milestone, spec } = found;
  return `<section class="detail"><button class="text-button back" data-action="back">${icon('chevron', 'rotate')}Back to requests</button><div class="detail-meta"><span class="mono">${spec.id} · v${spec.revision}</span>${miniProvider(request.provider)}</div><h2>${escape(spec.title)}</h2><span class="phase ${spec.status}">${icon(statusIcon(spec))}${phase[spec.status]}</span><p class="breadcrumb">${request.id}<span>/</span>${escape(milestone.title)}</p><div class="detail-tabs" role="tablist" aria-label="Specification details">${(['overview', 'checks', 'commits'] as const).map(tab => `<button role="tab" aria-selected="${detailTab === tab}" data-detail="${tab}">${tab === 'overview' ? 'Overview' : tab === 'checks' ? `Checks · ${spec.checks.length}` : `Commits · ${spec.commits.length}`}</button>`).join('')}</div><div role="tabpanel" aria-label="${detailTab}">${detailTab === 'overview' ? `
    <p class="description">${escape(spec.description)}</p><h3>Acceptance criteria</h3><ul class="criteria">${spec.criteria.map(c => `<li>${icon('circle')}<span>${escape(c)}</span></li>`).join('')}</ul>${spec.amendments.length ? `<h3>Change requests</h3><ul class="criteria">${spec.amendments.map(a => `<li>${icon('file')}<span>${escape(a)}</span></li>`).join('')}</ul>` : ''}<div class="branch-box">${icon('branch')}<span>${escape(milestone.branch)}</span></div><button class="secondary full" data-action="openSpec">${icon('file')}Open specification</button>` : detailTab === 'checks' ? `<p class="section-note">${liveMode ? 'Results collected by the Relay check runner.' : 'Simulated evidence. The preview does not run these checks.'}</p><div class="check-list">${spec.checks.map(c => `<article class="check-card"><div class="check-heading">${icon(c.status === 'passed' ? 'check' : c.status === 'stale' ? 'blocked' : 'circle')}<strong>${escape(c.name)}</strong><span class="check-badge ${c.status}">${c.status}</span></div><p>${escape(c.detail)}</p><span class="micro mono">${c.kind.toUpperCase()} · SPEC v${c.revision}</span></article>`).join('')}</div>` : `<p class="section-note">${liveMode ? 'Commits recorded from the request worktree.' : 'Sample commits. No Git changes were made.'}</p>${spec.commits.length ? `<div class="commit-list">${spec.commits.map(c => `<button class="commit-card" data-diff="${c.sha}">${icon('commit')}<span><span class="commit-sha mono">${c.sha}</span><strong>${escape(c.subject)}</strong><span class="micro">Spec v${c.revision} · ${c.pushed ? 'Pushed' : 'Local'}${liveMode ? '' : ' · sample'}</span></span>${icon('chevron')}</button>`).join('')}</div>` : '<div class="empty compact">No commits associated yet.<p>Commits appear here after the spec produces a change.</p></div>'}`}</div></section>`;
}
function providers(): string {
  return `<section class="detail providers"><button class="text-button back" data-action="back">${icon('chevron', 'rotate')}Back to requests</button><div class="eyebrow">COMPATIBILITY</div><h2>Your agent runtimes</h2><p class="description">Check installed executable versions. This check makes no model calls and does not load skills, hooks, or MCP servers.</p>${(['codex', 'claude'] as const).map(p => {
    const result = runtimeResults.find(r => r.provider === p);
    return `<article class="runtime-card"><div class="runtime-title">${miniProvider(p)}<span class="check-badge ${result?.available ? 'passed' : ''}">${result ? result.available ? 'Detected' : 'Unavailable' : 'Not checked'}</span></div><p class="mono">${escape(result?.version ?? (p === 'codex' ? 'codex --version' : 'claude --version'))}</p><p>${escape(result?.message ?? 'Run the version check from the VS Code extension.')}</p><div class="runtime-unverified">Native discovery · Not verified<br>Authentication & execution · Not verified</div></article>`;
  }).join('')}<button class="primary full" data-action="check" ${checking ? 'disabled' : ''}>${icon('settings')}${checking ? 'Checking runtimes…' : 'Check installed runtimes'}</button><p class="section-note">The separate Codex inspection script can test App Server configuration and skill discovery. See the implementation plan for the live compatibility experiment.</p><button class="secondary full" data-action="plan">${icon('file')}Open implementation plan</button></section>`;
}
function routingQuestion(): string {
  if (!pendingRoute) return '';
  return questionCard({ id: 'routing', question: 'Where does this message belong?', context: `${pendingRoute.route.reason} Message: ${pendingRoute.input.text}`, options: [
    ...pendingRoute.route.matches.map(m => ({ id: m.requestId, label: `${m.requestId} · ${m.title}`, description: `${m.provider === 'codex' ? 'Codex' : 'Claude Code'} · ${requestStatusLabels[m.status]}${m.specId ? ` · ${m.specId}` : ''}. ${m.provider !== pendingRoute!.input.choice.provider ? 'Continue with this request’s agent.' : 'Amend existing work.'}` })),
    { id: 'new', label: 'Create a separate request', description: 'Keep the current agent selection and start with codebase review.' }
  ] }, answerDrafts.routing, true);
}
function render() {
  const previous = app.querySelector<HTMLElement>('.main-content');
  const following = lastRenderedSection === 'chat' && (!previous || previous.scrollHeight - previous.scrollTop - previous.clientHeight < 64);
  if (previous) scrollPositions[lastRenderedSection] = previous.scrollTop;
  closeReferences();
  const overall = progress(allSpecs(state)); const current = currentWork(state); const milestone = current ? progress(current.milestone.specs) : undefined;
  const unplanned = state.requests.filter(r => !r.milestones.length || r.reviewPending).length;
  const pendingDecisions = state.decisions.filter(d => !d.answer);
  const decision = state.decisions.find(d => d.id === openDecision);
  const latestMessage = state.messages.at(-1)?.id;
  const unread = section !== 'chat' && latestMessage !== lastReadMessage;
  if (section === 'chat' && (scrollToLatest || following)) lastReadMessage = latestMessage;
  app.innerHTML = `<div class="shell"><header class="workspace-header"><div class="workspace-name"><strong>${escape(workspaceName)}</strong><span class="preview-chip" title="${liveMode ? 'Native workspace sessions' : 'Interactive demo data'}">${liveMode ? 'Live' : 'Preview'}</span></div><button class="icon-button" data-action="more" aria-label="More actions" aria-expanded="${moreOpen}">${icon('more')}</button>${moreOpen ? `<div class="utility-menu" aria-label="Workspace actions">${vscode ? `<button data-action="mode">${icon('settings')}${liveMode ? 'Switch to demo preview' : 'Use live workspace'}</button>${liveMode ? `<button data-action="stopLive">${icon('blocked')}Stop active work</button>` : ''}` : ''}<button data-action="providers">${icon('settings')}Provider compatibility</button><button data-action="plan">${icon('file')}Open implementation plan</button><button data-action="report">${icon('download')}${liveMode ? 'Export implementation report' : 'Export demo report'}</button><button data-section="activity">${icon('history')}Activity history</button>${!liveMode ? `<button data-action="reset">${icon('reset')}Reset demo</button>` : ''}</div>` : ''}</header>
  <nav class="main-tabs" aria-label="Workspace views"><button class="${section === 'chat' ? 'active' : ''}" data-section="chat" aria-label="Chat" ${section === 'chat' ? 'aria-current="page"' : ''}>Chat${unread ? '<span class="unread-dot" aria-label="New messages"></span>' : ''}</button><button class="${section !== 'chat' ? 'active' : ''}" data-section="requests" ${section !== 'chat' ? 'aria-current="page"' : ''}>Requests<span>${state.requests.length}</span></button></nav>
  <section class="run-summary" aria-label="Execution progress"><div class="run-summary-line"><button class="run-toggle" data-action="progressDetails" aria-label="Progress details" aria-expanded="${executionDetailsOpen}"><span class="status-dot ${state.paused ? 'paused' : ''}"></span><span>${activity ? escape(activity) : state.paused ? 'Demo paused' : current ? `${phase[current.spec.status]} · ${current.request.title}` : 'No eligible work'}</span>${icon('chevron', executionDetailsOpen ? 'open' : '')}</button>${pendingDecisions.length ? `<button class="decision-count" data-action="decisions" aria-label="${pendingDecisions.length} decision waiting for you">${pendingDecisions.length} decision</button>` : ''}</div><div class="compact-progress-grid"><div><div class="compact-progress-label"><span>Overall</span><span>${overall.percent}%</span></div><progress value="${overall.completed}" max="${overall.total || 1}" aria-label="Overall progress">${overall.percent}%</progress></div><div><div class="compact-progress-label"><span>Milestone</span><span>${milestone?.percent ?? 0}%</span></div><progress value="${milestone?.completed ?? 0}" max="${milestone?.total || 1}" aria-label="Current milestone progress">${milestone?.percent ?? 0}%</progress></div></div>${executionDetailsOpen ? `<div class="execution-details"><p class="progress-caption">${overall.completed} of ${overall.total} specs complete${unplanned ? ` · ${unplanned} unplanned` : ''}</p><p class="current-milestone-title">${escape(current?.milestone.title ?? 'No executing milestone')} ${current ? `<span class="mono">· ${current.spec.id}</span>` : ''}</p><div class="execution-actions" ${liveMode ? 'hidden' : ''}><button class="secondary" data-action="pause" aria-label="${state.paused ? 'Resume demo' : 'Pause demo'}">${icon(state.paused ? 'play' : 'pause')}${state.paused ? 'Resume' : 'Pause'}</button><button class="secondary" data-action="advance" aria-label="Advance demo one step" ${state.paused || !current ? 'disabled' : ''}>${icon('step')}Demo step</button></div></div>` : ''}</section>
  <main class="main-content ${section === 'chat' ? 'chat-content' : ''}">${section === 'chat' ? `${conversationView(state, liveMode)}${routingQuestion()}${decision && !decision.answer ? `<div class="chat-question">${questionCard(decision, answerDrafts[decision.id])}</div>` : pendingDecisions.length ? `<div class="conversation-decision"><span>${icon('blocked')}${liveMode ? 'Your input is needed' : 'Search needs your input'}</span><button class="text-button" data-action="decisions">Review decision${icon('chevron')}</button></div>` : ''}<button class="latest-messages" data-action="latest" id="latest-messages" hidden>${icon('arrow', 'rotate-down')}Latest messages</button>` : section === 'requests' ? `<div class="queue-toolbar"><span class="eyebrow">REQUESTS</span><button class="text-button" data-section="activity">${icon('history')}History</button></div><label class="search-field">${icon('search')}<input id="filter" aria-label="Filter requests" placeholder="Find a request…" value="${escape(filter)}" autocomplete="off"></label><div id="tree">${tree()}</div>` : section === 'detail' ? detail() : section === 'providers' ? providers() : `<section class="activity"><button class="text-button back activity-back" data-action="back">${icon('chevron', 'rotate')}Back to requests</button><div class="queue-toolbar"><span class="eyebrow">ACTIVITY HISTORY</span><span class="micro">${liveMode ? 'Workspace' : 'Demo'}</span></div><ol>${state.events.map(e => `<li class="event ${e.kind}"><span class="event-dot"></span><div><p>${escape(e.text)}</p><span class="micro">${escape(e.time.slice(11, 16))} · ${e.kind}</span></div></li>`).join('')}</ol></section>`}</main>
  ${notice ? `<div class="notice" role="status"><span>${escape(notice)}</span><button class="icon-button" data-action="dismiss" aria-label="Dismiss notification">${icon('close')}</button></div>` : ''}
  ${composer({ draft, choice, attachments, references, settingsOpen: modelSettingsOpen, live: liveMode, catalog: catalogs, nativeClaude, nativeCodex })}</div>${dialog ? `<dialog open class="preview-dialog" aria-label="Preview document"><header><strong>Preview document</strong><button class="icon-button" data-action="closeDialog" aria-label="Close preview document">${icon('close')}</button></header><pre>${escape(dialog)}</pre></dialog>` : ''}`;
  const main = app.querySelector<HTMLElement>('.main-content')!;
  main.scrollTop = section === 'chat' && (scrollToLatest || following) ? main.scrollHeight : scrollPositions[section] ?? 0;
  scrollToLatest = false; lastRenderedSection = section;
  const latest = app.querySelector<HTMLElement>('#latest-messages');
  const updateLatest = () => { if (latest) { latest.hidden = main.scrollHeight - main.scrollTop - main.clientHeight < 64; if (latest.hidden) lastReadMessage = state.messages.at(-1)?.id; } };
  main.addEventListener('scroll', updateLatest, { passive: true }); updateLatest();
  if (dialog) { document.querySelector<HTMLDialogElement>('dialog')?.querySelector<HTMLButtonElement>('button')?.focus(); }
}
function closeReferences() {
  referenceToken = undefined; referenceItems = []; referenceRequest++;
  clearTimeout(referenceTimer);
  const picker = app.querySelector<HTMLElement>('#reference-picker'); if (picker) picker.hidden = true;
  app.querySelector('#draft')?.removeAttribute('aria-activedescendant');
}
function paintReferences() {
  const picker = app.querySelector<HTMLElement>('#reference-picker'); if (!picker || !referenceToken) return;
  picker.hidden = false; picker.innerHTML = referenceOptions(referenceItems, referenceIndex, !!vscode);
  if (referenceItems.length) app.querySelector('#draft')?.setAttribute('aria-activedescendant', `ref-option-${referenceIndex}`);
  app.querySelector(`#ref-option-${referenceIndex}`)?.scrollIntoView({ block: 'nearest' });
}
function updateReferences(textarea: HTMLTextAreaElement) {
  if (modelSettingsOpen) { modelSettingsOpen = false; app.querySelector('.composer-settings')?.remove(); app.querySelector('.model-trigger')?.setAttribute('aria-expanded', 'false'); }
  const caret = textarea.selectionStart;
  const match = /(?:^|\s)([@$/])([^\s@$]*)$/.exec(textarea.value.slice(0, caret));
  if (!match || match[2].length > 200) { closeReferences(); return; }
  const trigger = match[1] as '@' | '$' | '/'; const query = match[2];
  referenceToken = { start: caret - query.length - 1, end: caret, trigger, query }; referenceIndex = 0;
  clearTimeout(referenceTimer); const requestId = ++referenceRequest;
  if (vscode) {
    referenceItems = []; paintReferences();
    referenceTimer = setTimeout(() => vscode.postMessage({ type: 'searchReferences', requestId, trigger, query, provider: choice.provider }), 120);
  } else {
    referenceItems = sampleReferences.filter(r => (trigger === '@' ? ['file', 'folder'].includes(r.kind) : trigger === '/' ? r.kind === 'skill' : ['agent', 'skill'].includes(r.kind)) && r.label.toLowerCase().includes(query.toLowerCase())).map(r => ({ ...r, value: trigger === '/' ? r.value.replace(/^\$/, '/') : r.value }));
    paintReferences();
  }
}
function insertReference(index: number) {
  const ref = referenceItems[index]; const token = referenceToken; if (!ref || !token) return;
  draft = `${draft.slice(0, token.start)}${ref.value} ${draft.slice(token.end)}`;
  if (!references.some(r => r.id === ref.id && r.value === ref.value) && references.length < 30) references.push(ref);
  const caret = token.start + ref.value.length + 1; render();
  const textarea = app.querySelector<HTMLTextAreaElement>('#draft'); textarea?.focus(); textarea?.setSelectionRange(caret, caret);
}
function appendAttachments(files: Attachment[]) {
  if (!files.length) return;
  let skipped = false;
  for (const file of files) {
    if (!isAttachment(file) || attachments.length >= attachmentLimits.count || attachments.reduce((sum, a) => sum + a.size, 0) + file.size > attachmentLimits.totalBytes) { skipped = true; continue; }
    attachments.push(file);
  }
  notice = skipped ? 'Attachment limit: 6 files, 4 MiB each, 12 MiB total. Some files were skipped.' : liveMode ? 'Attachments ready. Contents will be sent to the selected native agent.' : 'Attachments added locally. No files are uploaded; only metadata is saved on send.';
  render(); app.querySelector<HTMLTextAreaElement>('#draft')?.focus();
}
async function takeFiles(files: File[]) {
  const selected: Attachment[] = [];
  for (const file of files.slice(0, attachmentLimits.count + 1)) {
    if (file.size > attachmentLimits.fileBytes) { selected.push({ id: crypto.randomUUID(), name: file.name, size: file.size, mime: file.type }); continue; }
    let thumbnail: string | undefined;
    const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Image preview unavailable')); reader.readAsDataURL(file); });
    if (imageMimes.includes(file.type)) thumbnail = encoded;
    selected.push({ id: crypto.randomUUID(), name: file.name, size: file.size, mime: file.type || 'application/octet-stream', thumbnail, data: encoded.split(',')[1] });
  }
  appendAttachments(selected);
}
function completeSubmission(input: Incoming, route: Exclude<Route, { kind: 'ask' }>, clearDraft = true) {
  state = explainTaskSubmission(applySubmission(state, input, route)); pendingRoute = undefined; delete answerDrafts.routing;
  const latest = state.submissions[0];
  notice = ''; scrollToLatest = true; section = 'chat'; if (latest.specId) state.selected = latest.specId;
  filter = ''; detailTab = 'overview'; if (clearDraft) { draft = ''; attachments = []; references = []; }
  persist(); render(); app.querySelector<HTMLTextAreaElement>('#draft')?.focus();
}
app.addEventListener('input', event => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'draft') { draft = target.value; app.querySelector<HTMLButtonElement>('.send-button')!.disabled = !draft.trim() && !attachments.length; updateReferences(target as unknown as HTMLTextAreaElement); }
  if (target.id === 'filter') { filter = target.value; app.querySelector('#tree')!.innerHTML = tree(); }
  if (target.dataset.customAnswer) {
    answerDrafts[target.dataset.customAnswer] = { custom: target.value };
    const form = target.closest('form')!; form.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(r => { r.checked = false; });
    form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled = !target.value.trim();
  }
});
app.addEventListener('change', event => {
  const target = event.target as HTMLInputElement;
  if (['provider', 'model', 'effort'].includes(target.id)) {
    if (target.id === 'provider') choice = { provider: target.value === 'claude' ? 'claude' : 'codex', model: 'default', effort: 'default' };
    else choice = normalizeChoice({ ...choice, [target.id]: target.value }, catalogs);
    render(); app.querySelector<HTMLSelectElement>(`#${target.id}`)?.focus();
  }
  if (target.id === 'attachment-input') void takeFiles(Array.from(target.files ?? [])).catch(() => { notice = 'Could not read that image preview. Try another file.'; render(); });
  if (target.type === 'radio') {
    const form = target.closest<HTMLFormElement>('form[data-question]')!;
    answerDrafts[form.dataset.question!] = { optionId: target.value, custom: '' };
    const textarea = form.querySelector<HTMLTextAreaElement>('textarea'); if (textarea) textarea.value = '';
    form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled = false;
  }
});
app.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target as HTMLFormElement;
  if (form.dataset.question) {
    const id = form.dataset.question; const answer = answerDrafts[id]; if (!answer) return;
    if (id === 'routing' && pendingRoute) {
      const { input, route } = pendingRoute; const match = route.matches.find(m => m.requestId === answer.optionId);
      if (match) { if (input.choice.provider !== match.provider) input.choice = { provider: match.provider, model: 'default', effort: 'default' }; completeSubmission(input, { kind: 'amend', match, reason: 'User resolved an ambiguous or cross-agent routing question.' }, false); }
      else if (answer.optionId === 'new') completeSubmission(input, { kind: 'new', reason: 'User chose separate work after the preview search.' }, false);
      return;
    }
    const decision = state.decisions.find(d => d.id === id); if (!decision) return;
    if (liveMode) { const text = answer.custom.trim() || decision.options.find(o => o.id === answer.optionId)?.label || ''; host({ type: 'liveAnswer', id, text }); return; }
    const text = answer.custom.trim() || decision.options.find(o => o.id === answer.optionId)?.label || '';
    const next = answerDecision(state, id, text, answer.optionId);
    notice = next.decisions.find(d => d.id === id)?.answer ? '' : 'This decision changed. Review the latest specification before answering.';
    state = next; section = 'chat'; openDecision = undefined; scrollToLatest = true; persist(); render(); return;
  }
  if (form.id !== 'request-form' || (!draft.trim() && !attachments.length)) return;
  if (liveMode) { host({ type: 'liveSubmit', text: draft.trim() || 'Review the attached context.', choice, attachments }); draft = ''; attachments = []; references = []; section = 'chat'; scrollToLatest = true; modelSettingsOpen = false; render(); return; }
  const input: Incoming = { text: draft.trim() || 'Review the attached context.', choice: { ...choice }, attachments: attachments.map(({ id, name, size, mime }) => ({ id, name, size, mime })), references: references.filter(r => draft.includes(r.value)) };
  if (messageIntent(input.text) === 'conversation') {
    state = discussProject(state, input); draft = ''; attachments = []; references = []; notice = ''; modelSettingsOpen = false;
    section = 'chat'; scrollToLatest = true; persist(); render(); app.querySelector<HTMLTextAreaElement>('#draft')?.focus(); return;
  }
  if (pendingRoute) { notice = 'Finish the pending routing choice before sending another change. You can still ask questions.'; render(); return; }
  if (state.requests.length >= 200 || allSpecs(state).some(s => s.amendments.length >= 200)) { notice = 'Preview storage limit reached. Export a report or reset the demo.'; render(); return; }
  state = rememberUserMessage(state, input); persist(); modelSettingsOpen = false;
  const route = previewRoute(state, input.text, choice.provider);
  if (route.kind === 'ask') { pendingRoute = { input, route }; draft = ''; attachments = []; references = []; section = 'chat'; scrollToLatest = true; render(); app.querySelector<HTMLFormElement>('[data-question="routing"]')?.querySelector<HTMLInputElement>('input')?.focus(); }
  else completeSubmission(input, route);
});
app.addEventListener('paste', event => {
  if ((event.target as HTMLElement).id !== 'draft') return;
  const files = Array.from((event as ClipboardEvent).clipboardData?.files ?? []); if (!files.length) return;
  event.preventDefault(); void takeFiles(files).catch(() => { notice = 'Could not read the pasted attachment.'; render(); });
});
app.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button'); if (!button || button.disabled) return;
  if (button.dataset.reference !== undefined) { insertReference(Number(button.dataset.reference)); return; }
  if (button.dataset.removeAttachment) { attachments = attachments.filter(a => a.id !== button.dataset.removeAttachment); render(); return; }
  if (button.dataset.removeReference) {
    const ref = references.find(r => r.id === button.dataset.removeReference); if (ref) draft = draft.replace(ref.value, '');
    references = references.filter(r => r.id !== button.dataset.removeReference); render(); return;
  }
  if (button.dataset.worktree) { host({ type: 'openWorktree', id: button.dataset.worktree }); return; }
  if (button.dataset.runRequest) { host({ type: 'liveRun', id: button.dataset.runRequest }); return; }
  if (button.dataset.requestControl) { state = setRequestControl(state, button.dataset.requestControl, button.dataset.control === 'resume' ? undefined : button.dataset.control as 'paused' | 'stopped'); persist(); render(); return; }
  if (button.dataset.openRequest) {
    const id = button.dataset.openRequest; if (!state.expanded.includes(id)) state.expanded.push(id);
    section = 'requests'; moreOpen = false; persist(); render();
    app.querySelector<HTMLButtonElement>(`[data-expand="${id}"]`)?.scrollIntoView({ block: 'start' }); return;
  }
  if (button.dataset.expand) { const id = button.dataset.expand; state.expanded = state.expanded.includes(id) ? state.expanded.filter(x => x !== id) : [...state.expanded, id]; persist(); render(); app.querySelector<HTMLButtonElement>(`[data-expand="${id}"]`)?.focus(); return; }
  if (button.dataset.select) { state.selected = button.dataset.select; section = 'detail'; detailTab = 'overview'; persist(); render(); return; }
  if (button.dataset.section) { section = button.dataset.section as Section; moreOpen = false; if (section === 'chat') scrollToLatest = true; render(); return; }
  if (button.dataset.detail) { detailTab = button.dataset.detail as typeof detailTab; render(); app.querySelector<HTMLButtonElement>(`[data-detail="${detailTab}"]`)?.focus(); return; }
  if (button.dataset.diff) { host({ type: 'openDiff', id: state.selected, sha: button.dataset.diff }); return; }
  switch (button.dataset.action) {
    case 'mode': host({ type: 'setMode', live: !liveMode }); return;
    case 'stopLive': host({ type: 'liveStop' }); return;
    case 'discoverModels': host({ type: 'models', provider: choice.provider }); notice = 'Loading the native runtime model catalog...'; render(); return;
    case 'more': moreOpen = !moreOpen; modelSettingsOpen = false; break;
    case 'progressDetails': executionDetailsOpen = !executionDetailsOpen; break;
    case 'modelSettings': modelSettingsOpen = !modelSettingsOpen; moreOpen = false; break;
    case 'latest': app.querySelector<HTMLElement>('.main-content')?.scrollTo({ top: app.querySelector<HTMLElement>('.main-content')!.scrollHeight }); return;
    case 'focusComposer': app.querySelector<HTMLTextAreaElement>('#draft')?.focus(); return;
    case 'attach': if (vscode) host({ type: 'pickAttachments' }); else app.querySelector<HTMLInputElement>('#attachment-input')?.click(); return;
    case 'decisions': {
      const decision = state.decisions.find(d => !d.answer)!;
      openDecision = decision.id; section = 'chat'; scrollToLatest = true; render();
      const form = app.querySelector<HTMLFormElement>(`[data-question="${decision.id}"]`); form?.scrollIntoView({ block: 'center' }); form?.querySelector<HTMLInputElement>('input')?.focus(); return;
    }
    case 'clearFilter': filter = ''; render(); app.querySelector<HTMLInputElement>('#filter')?.focus(); return;
    case 'back': section = 'requests'; break;
    case 'providers': section = 'providers'; moreOpen = false; break;
    case 'plan': host({ type: 'openPlan' }); return;
    case 'report': host({ type: 'openReport', markdown: report(state, liveMode) }); return;
    case 'pause': state.paused = !state.paused; record(state, `Demo ${state.paused ? 'paused' : 'resumed'}.`); appendChat(state, { role: 'assistant', text: `The demo is ${state.paused ? 'paused' : 'running again'}. You can keep discussing the project here.`, kind: 'update', requestIds: [] }); persist(); break;
    case 'advance': state = advanceDemo(state); persist(); break;
    case 'reset': state = createDemo(); section = 'chat'; filter = ''; draft = ''; attachments = []; references = []; pendingRoute = undefined; openDecision = undefined; executionDetailsOpen = false; modelSettingsOpen = false; moreOpen = false; scrollToLatest = true; Object.keys(answerDrafts).forEach(id => { delete answerDrafts[id]; }); notice = 'Preview data reset.'; persist(); break;
    case 'check': checking = true; render(); host({ type: 'checkRuntimes' }); return;
    case 'openSpec': host({ type: 'openSpec', id: state.selected }); return;
    case 'dismiss': notice = ''; break;
    case 'closeDialog': dialog = ''; break;
    default: return;
  }
  render();
});
document.addEventListener('keydown', event => {
  if (referenceToken && document.activeElement?.id === 'draft') {
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && referenceItems.length) { event.preventDefault(); referenceIndex = (referenceIndex + (event.key === 'ArrowDown' ? 1 : -1) + referenceItems.length) % referenceItems.length; paintReferences(); return; }
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && referenceItems.length) { event.preventDefault(); insertReference(referenceIndex); return; }
    if (event.key === 'Escape') { event.preventDefault(); closeReferences(); return; }
  }
  if (event.key === 'Escape' && dialog) { event.preventDefault(); dialog = ''; render(); }
  else if (event.key === 'Escape' && (modelSettingsOpen || moreOpen)) { event.preventDefault(); modelSettingsOpen = false; moreOpen = false; render(); app.querySelector<HTMLButtonElement>('.model-trigger')?.focus(); }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && document.activeElement?.id === 'draft') { event.preventDefault(); app.querySelector<HTMLFormElement>('#request-form')?.requestSubmit(); }
});
app.addEventListener('click', event => {
  const target = event.target as Element;
  if (!target.closest('.composer')) closeReferences();
  if (moreOpen && !target.closest('.workspace-header')) { moreOpen = false; app.querySelector('.utility-menu')?.remove(); app.querySelector('[data-action="more"]')?.setAttribute('aria-expanded', 'false'); }
  if (modelSettingsOpen && !target.closest('.composer-settings, .model-trigger')) { modelSettingsOpen = false; app.querySelector('.composer-settings')?.remove(); app.querySelector('.model-trigger')?.setAttribute('aria-expanded', 'false'); }
});
app.addEventListener('keyup', event => { if ((event.target as HTMLElement).id === 'draft' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes((event as KeyboardEvent).key)) updateReferences(event.target as HTMLTextAreaElement); });
window.addEventListener('message', (event: MessageEvent<ToWebview>) => {
  // Only VS Code uses this bridge. The browser preview never accepts host messages.
  if (!vscode || !event.data || typeof event.data !== 'object') return;
  const message = event.data;
  if (message.type === 'workspace') { liveMode = message.live; nativeClaude = message.claudeIntegration !== 'sdk'; nativeCodex = message.codexIntegration === 'native'; workspaceName = message.name; catalogs = liveMode ? { codex: [{ id: 'default', label: 'Runtime default', efforts: ['default'] }], claude: [{ id: 'default', label: 'Runtime default', efforts: ['default'] }] } : structuredClone(sampleModels); if (liveMode && nativeClaude) catalogs.claude = [{ id: 'default', label: 'Selected in Claude extension', efforts: ['default'] }]; if (liveMode && nativeCodex) catalogs.codex = [{ id: 'default', label: 'Selected in Codex extension', efforts: ['default'] }]; choice = { provider: choice.provider, model: 'default', effort: 'default' }; render(); }
  if (message.type === 'activity') { activity = message.text; render(); }
  if (message.type === 'models') { catalogs[message.provider] = message.items; choice = normalizeChoice(choice, catalogs); notice = 'Native model catalog loaded.'; render(); }
  if (message.type === 'restore') { const restored = restoreDemo(message.state); if (restored) { state = restored; render(); } }
  if (message.type === 'reset') { state = createDemo(); section = 'chat'; openDecision = undefined; pendingRoute = undefined; scrollToLatest = true; persist(); render(); }
  if (message.type === 'diagnostics' && Array.isArray(message.results)) { runtimeResults = message.results; checking = false; section = 'providers'; render(); }
  if (message.type === 'attachments' && Array.isArray(message.files)) appendAttachments(message.files.filter(isAttachment));
  if (message.type === 'references' && referenceToken && message.requestId === referenceRequest && Array.isArray(message.items)) { referenceItems = message.items.filter(isReference).slice(0, 40); referenceIndex = 0; paintReferences(); }
  if (message.type === 'notice' && typeof message.text === 'string') { checking = false; notice = message.text; render(); }
});
if (!vscode) document.body.dataset.theme = new URLSearchParams(location.search).get('theme') ?? 'dark';
render();
vscode?.postMessage({ type: 'ready' });
