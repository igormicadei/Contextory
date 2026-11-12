import { join } from 'node:path';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { Store } from './store';
import { planResponse, planSchema, intakeInstructions, type PlanResponse } from './plan';
import { createWorktree, verifyWorktree, git, runCheck, type CheckRecipe } from './git';
import { checkAbort, EngineError, type Agent, type AgentEvent } from './types';
import { WorkspaceFiles } from './files';
import { appendChat, isDemoState, record, type DemoState, type Provider } from '../shared/model';
import type { ExecutionChoice } from '../shared/context';
export interface LivePlan { revision: number; choice: ExecutionChoice; worktree?: string; phase?: string; integratedMilestones?: string[] }
export interface LiveState { schema: 1; projection: DemoState; plans: Record<string, LivePlan>; sessions: Partial<Record<Provider, string>>; nextSpec: number }
export function emptyLive(): LiveState {
  const projection: DemoState = { schema: 3, requests: [], events: [], decisions: [], submissions: [], messages: [], expanded: [], selected: '', paused: false, nextRequest: 1 };
  appendChat(projection, { role: 'assistant', kind: 'message', requestIds: [], text: 'Ask about this workspace, explore an idea, or describe a change. I will investigate before planning. Saved plans appear in Requests; use Run request when you are ready to implement them in an isolated worktree.' });
  return { schema: 1, projection, plans: {}, sessions: {}, nextSpec: 1 };
}
export function isLiveState(value: unknown): value is LiveState {
  try {
    const v = value as LiveState;
    return Boolean(v && v.schema === 1 && isDemoState(v.projection) && v.plans && typeof v.plans === 'object' && !Array.isArray(v.plans) && v.sessions && typeof v.sessions === 'object' && Object.entries(v.sessions).every(([k, s]) => ['codex', 'claude'].includes(k) && typeof s === 'string' && s.length < 200) && Number.isSafeInteger(v.nextSpec) && v.nextSpec > 0 && Object.entries(v.plans).every(([id, p]) => /^REQ-\d{3,6}$/.test(id) && p && Number.isSafeInteger(p.revision) && p.revision > 0 && ['codex', 'claude'].includes(p.choice?.provider) && typeof p.choice.model === 'string' && typeof p.choice.effort === 'string' && (p.worktree === undefined || typeof p.worktree === 'string')) && v.projection.requests.every(r => v.plans[r.id]?.choice.provider === r.provider));
  } catch { return false; }
}
export interface EngineOptions {
  root: string; storage: string; agent(provider: Provider): Promise<Agent>;
  changed(state: LiveState): void; activity(text: string): void;
  approve(title: string, detail: string): Promise<boolean>;
  checks(): CheckRecipe[]; push(): boolean;
}
export class Coordinator {
  state!: LiveState;
  private store: Store<LiveState>;
  private chatAbort?: AbortController;
  private runAbort?: AbortController;
  private running?: string;
  private operations = new Set<Promise<unknown>>();
  constructor(private options: EngineOptions) { this.store = new Store(join(options.storage, 'workspace.json'), isLiveState); }
  async open(): Promise<void> {
    this.state = await this.store.load(emptyLive);
    for (const request of this.state.projection.requests) {
      if (this.state.plans[request.id].phase === 'running' || request.milestones.some(m => m.specs.some(s => ['implementing', 'testing', 'committing', 'pushing'].includes(s.status)))) {
        request.control = 'stopped'; request.blocked = true; request.note = 'VS Code restarted during execution. Worktree changes are preserved; inspect them before resuming.';
        for (const m of request.milestones) for (const s of m.specs) if (s.status !== 'completed') s.status = 'blocked';
      }
    }
    await this.save();
  }
  private async save() { await this.store.save(this.state); this.options.changed(this.state); }
  private event = (event: AgentEvent) => { if (event.type === 'activity') this.options.activity(event.text); };
  private track<T>(operation: Promise<T>): Promise<T> { this.operations.add(operation); void operation.finally(() => this.operations.delete(operation)).catch(() => {}); return operation; }
  search(query: string) {
    const tokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    return this.state.projection.requests.map(r => ({ id: r.id, title: r.title, provider: r.provider, revision: this.state.plans[r.id].revision, completed: r.milestones.every(m => m.specs.every(s => s.status === 'completed')), score: tokens.filter(t => JSON.stringify(r).toLowerCase().includes(t)).length })).sort((a, b) => b.score - a.score).slice(0, 30);
  }
  get(id: string) { return { request: this.state.projection.requests.find(r => r.id === id) ?? null, revision: this.state.plans[id]?.revision }; }
  submit(text: string, choice: ExecutionChoice, images: string[] = []): Promise<void> { return this.track(this.submitTurn(text, choice, images)); }
  private async submitTurn(text: string, choice: ExecutionChoice, images: string[]): Promise<void> {
    if (this.chatAbort) throw new EngineError('A conversation turn is already running. Stop it or wait for its response.');
    this.chatAbort = new AbortController(); const controller = this.chatAbort;
    appendChat(this.state.projection, { role: 'user', kind: 'message', text, choice, requestIds: [] });
    try {
      await this.save(); this.options.activity('Reviewing the workspace and request history…');
      const agent = await this.options.agent(choice.provider);
      const files = new WorkspaceFiles(this.options.root);
      const response = await agent.run({ cwd: this.options.root, text: `${intakeInstructions}\n\nCurrent request index (use tools for details):\n${JSON.stringify(this.search(''))}\n\nUser message:\n${text}`, choice, images, write: false, schema: planSchema, session: this.state.sessions[choice.provider], signal: controller.signal, tools: { search: q => this.search(q), get: id => this.get(id), list: path => files.list(path), read: path => files.read(path) }, event: this.event, approve: this.options.approve });
      checkAbort(controller.signal);
      const result = planResponse.parse(JSON.parse(response.text));
      this.applyPlan(result, choice);
      this.state.sessions[choice.provider] = response.session;
      await this.save();
    } catch (error) {
      const message = error instanceof EngineError ? error.message : 'The agent response could not be validated. No plan changes were applied. Retry the message.';
      appendChat(this.state.projection, { role: 'assistant', kind: 'update', text: message, requestIds: [] }); await this.save(); throw new EngineError(message);
    } finally { if (this.chatAbort === controller) this.chatAbort = undefined; this.options.activity(''); }
  }
  private applyPlan(result: PlanResponse, choice: ExecutionChoice) {
    if (result.question && result.changes.length) throw new EngineError('The agent proposed work while asking a blocking question. Answer first and request an updated plan.');
    // Validate every amendment before applying any change. Completed milestones remain historical records.
    const seen = new Set<string>();
    for (const change of result.changes) if (change.requestId) {
      const plan = this.state.plans[change.requestId]; const request = this.state.projection.requests.find(r => r.id === change.requestId);
      const unfinishedWorktree = plan?.worktree && (request?.blocked || request?.milestones.some(m => m.specs.some(s => s.status !== 'completed')));
      if (seen.has(change.requestId) || !plan || !request || plan.revision !== change.expectedRevision || request.provider !== choice.provider || this.running === change.requestId || unfinishedWorktree) throw new EngineError('A target request changed, belongs to another agent, or has active/interrupted implementation work. Stop and review it before amending.');
      seen.add(change.requestId);
    }
    const next = structuredClone(this.state); const linked: string[] = [];
    let nextMilestone = Math.max(0, ...next.projection.requests.flatMap(r => r.milestones.map(m => Number(m.id.slice(3))))) + 1;
    for (const change of result.changes) {
      const id = change.requestId ?? `REQ-${String(next.projection.nextRequest++).padStart(3, '0')}`;
      let request = next.projection.requests.find(r => r.id === id);
      if (!request) { request = { id, title: change.title, provider: choice.provider, milestones: [] }; next.projection.requests.push(request); next.plans[id] = { revision: 1, choice }; }
      else { next.plans[id].revision++; request.control = undefined; request.blocked = false; request.title = change.title; }
      const completed = request.milestones.filter(m => m.specs.every(s => s.status === 'completed'));
      request.milestones = [...completed, ...change.milestones.map((m, index) => ({ id: `MS-${String(nextMilestone++).padStart(3, '0')}`, title: m.title, branch: `relay/${id}/m${completed.length + index + 1}`, specs: m.specs.map(s => ({ ...s, id: `SPEC-${String(next.nextSpec++).padStart(3, '0')}`, revision: next.plans[id].revision, status: 'queued' as const, checks: [], commits: [], amendments: [] })) }))];
      request.note = 'Plan saved. Run request to implement it in an isolated Git worktree.'; request.reviewPending = false;
      record(next.projection, `${id} · plan revision ${next.plans[id].revision} saved.`); linked.push(id);
    }
    appendChat(next.projection, { role: 'assistant', kind: linked.length ? 'task' : 'message', text: result.reply, requestIds: linked });
    if (result.question) {
      const id = `DEC-${String(next.projection.decisions.length + 1).padStart(3, '0')}`;
      // Standalone conversation questions use a reserved scope, never a fake development request.
      next.projection.decisions.push({ id, requestId: 'conversation', choice, revision: 1, question: result.question.question, context: 'Your answer continues the project conversation.', options: result.question.options.map((label, index) => ({ id: `option-${index}`, label, description: '' })) });
    }
    // Preserve object identities held by an active runner while intake adds unrelated work.
    next.projection.requests = next.projection.requests.map(r => linked.includes(r.id) ? r : this.state.projection.requests.find(old => old.id === r.id) ?? r);
    for (const [id, plan] of Object.entries(this.state.plans)) if (!linked.includes(id)) next.plans[id] = plan;
    if (!isLiveState(next)) throw new EngineError('Plan exceeds supported workspace storage limits or has an invalid shape. Split the request into smaller parts.');
    this.state = next;
  }
  run(id: string): Promise<void> { return this.track(this.runRequest(id)); }
  private async runRequest(id: string): Promise<void> {
    if (this.runAbort) throw new EngineError('Another request is running.');
    const request = this.state.projection.requests.find(r => r.id === id); const plan = this.state.plans[id];
    if (!request || !plan) throw new EngineError('Request not found.');
    const checks = this.options.checks();
    if (!checks.length) throw new EngineError('Configure relay.checks before execution. Relay requires independent checks before committing a specification.');
    const controller = new AbortController(); this.runAbort = controller; this.running = id;
    const branch = `relay/${id}/integration`;
    try {
      request.control = undefined; request.blocked = false; await this.save();
      const path = plan.worktree ?? join(this.options.storage, 'worktrees', id);
      let exists = true;
      try { await access(join(path, '.git')); } catch { exists = false; }
      if (!plan.worktree || (!exists && plan.phase === 'preparing')) {
        // Persist intent first. A crash during creation is reconciled on the next attempt.
        plan.worktree = path; plan.phase = 'preparing'; await this.save();
        await createWorktree(this.options.root, path, branch); plan.phase = 'prepared'; await this.save();
      }
      await verifyWorktree(this.options.root, path, branch);
      plan.phase = 'running'; await this.save();
      const agent = await this.options.agent(request.provider);
      for (const milestone of request.milestones) {
        if (milestone.specs.every(s => s.status === 'completed') && plan.integratedMilestones?.includes(milestone.id)) continue;
        checkAbort(controller.signal);
        const current = await git(path, ['branch', '--show-current']);
        if (current !== milestone.branch) {
          if (await git(path, ['status', '--porcelain'])) throw new EngineError('The worktree has changes from an interrupted operation. Inspect them before changing milestone branches.');
          await git(path, ['checkout', '-b', milestone.branch, branch]);
        }
        const docRoot = join(path, '.relay', 'requests', id);
        await mkdir(docRoot, { recursive: true });
        await writeFile(join(docRoot, `${milestone.id}.md`), `# ${request.title}\n\nPlan revision ${plan.revision}\n\n${milestone.specs.map(s => `## ${s.id}: ${s.title}\n\n${s.description}\n\n${s.criteria.map(c => `- ${c}`).join('\n')}`).join('\n\n')}`, 'utf8');
        for (const spec of milestone.specs) {
          if (spec.status === 'completed') continue;
          checkAbort(controller.signal); spec.status = 'implementing'; request.note = `Implementing ${spec.id}.`; this.state.projection.selected = spec.id; await this.save();
          const head = await git(path, ['rev-parse', 'HEAD']);
          const files = new WorkspaceFiles(path);
          // The native extension URI has no cwd parameter. Instructions route edits;
          // detect visible Git changes to the original checkout before any checks/commit.
          const original = agent.worktreeRouting === 'prompt' ? { head: await git(this.options.root, ['rev-parse', 'HEAD']), branch: await git(this.options.root, ['branch', '--show-current']) } : undefined;
          if (original && await git(this.options.root, ['status', '--porcelain'])) throw new EngineError('Native extension execution requires a clean original checkout. Inspect your changes before running this worktree task.');
          const implementation = await agent.run({ cwd: path, text: `Implement ONLY ${spec.id} in this owned worktree. Read .relay/requests/${id}/${milestone.id}.md and native project instructions. Use relay_list_files and relay_read_file when native shell inspection is unavailable; use native file editing tools to make the change.\n${spec.title}\n${spec.description}\nAcceptance:\n${spec.criteria.join('\n')}\nCreate/update meaningful tests including UI behavior and overflow tests when applicable. Do not commit, push, change Git branches or invoke goal-guardian. Relay independently runs checks and owns Git commits. Required checks: ${JSON.stringify(checks)}.`, choice: plan.choice, write: true, signal: controller.signal, event: this.event, tools: { search: q => this.search(q), get: rid => this.get(rid), list: p => files.list(p), read: p => files.read(p) }, approve: this.options.approve });
          appendChat(this.state.projection, { role: 'assistant', kind: 'update', text: `${spec.id} · Agent implementation report (checks follow):\n${implementation.text}`, requestIds: [id] });
          checkAbort(controller.signal);
          if (original && (await git(this.options.root, ['rev-parse', 'HEAD']) !== original.head || await git(this.options.root, ['branch', '--show-current']) !== original.branch || await git(this.options.root, ['status', '--porcelain']))) throw new EngineError('The original checkout changed during native execution. Relay stopped before checks or commits. Inspect both checkouts; no files were reverted.');
          if (await git(path, ['rev-parse', 'HEAD']) !== head || await git(path, ['branch', '--show-current']) !== milestone.branch) throw new EngineError('The agent changed Git history or branch. Inspect the worktree before continuing.');
          spec.status = 'testing'; spec.checks = [];
          await git(path, ['add', '--all']);
          const verifiedTree = await git(path, ['write-tree']); await this.save();
          for (const recipe of checks) {
            this.options.activity(`Checking ${spec.id} · ${recipe.name}`);
            const result = await runCheck(path, recipe, controller.signal);
            spec.checks.push({ name: recipe.name, kind: recipe.kind, status: result.passed ? 'passed' : 'pending', detail: result.detail, revision: spec.revision }); await this.save();
            if (!result.passed) throw new EngineError(`${recipe.name} failed. Worktree changes are preserved; the specification is blocked.`);
          }
          checkAbort(controller.signal); spec.status = 'committing'; await this.save();
          await git(path, ['add', '--all']);
          if (await git(path, ['write-tree']) !== verifiedTree) {
            for (const check of spec.checks) check.status = 'stale';
            throw new EngineError('Checks changed source files. Inspect generated changes and re-run verification before committing.');
          }
          await git(path, ['diff', '--cached', '--check']);
          if (!await git(path, ['diff', '--cached', '--name-only'])) throw new EngineError('No source changes to commit. Inspect the plan and worktree.');
          const beforeCommit = await git(path, ['write-tree']);
          await git(path, ['commit', '-m', `${spec.id}: ${spec.title}`]);
          const sha = await git(path, ['rev-parse', 'HEAD']);
          if (await git(path, ['rev-parse', 'HEAD^{tree}']) !== beforeCommit || await git(path, ['status', '--porcelain'])) throw new EngineError('A Git hook changed verified source. Re-run checks before completing the spec.');
          spec.commits.push({ sha, subject: spec.title, revision: spec.revision, pushed: false }); await this.save();
          if (this.options.push()) { spec.status = 'pushing'; await this.save(); await git(path, ['push', '--set-upstream', 'origin', milestone.branch]); spec.commits.at(-1)!.pushed = true; }
          spec.status = 'completed'; record(this.state.projection, `${spec.id} verified and committed as ${sha.slice(0, 8)}.`, 'success'); await this.save();
        }
        for (const recipe of checks) { const result = await runCheck(path, recipe, controller.signal); if (!result.passed) throw new EngineError(`Milestone final gate failed: ${recipe.name}.`); }
        if (await git(path, ['status', '--porcelain'])) throw new EngineError('Milestone checks changed the source. Inspect and reverify before integration.');
        checkAbort(controller.signal);
        await git(path, ['checkout', branch]); await git(path, ['merge', '--ff-only', milestone.branch]);
        plan.integratedMilestones = [...(plan.integratedMilestones ?? []), milestone.id]; await this.save();
      }
      plan.phase = 'completed'; request.note = 'All specifications passed configured checks and were committed. Request branch is ready for integration.';
      appendChat(this.state.projection, { role: 'assistant', kind: 'update', text: `${id} completed. ${request.note}`, requestIds: [id] }); await this.save();
    } catch (error) {
      request.note = error instanceof EngineError ? error.message : 'Execution failed. Inspect the preserved worktree before resuming.';
      plan.phase = 'blocked'; request.blocked = true; request.control = controller.signal.aborted ? 'stopped' : undefined;
      for (const m of request.milestones) for (const s of m.specs) if (['implementing', 'testing', 'committing', 'pushing'].includes(s.status)) s.status = 'blocked';
      record(this.state.projection, `${id} · ${request.note}`, 'warning'); appendChat(this.state.projection, { role: 'assistant', kind: 'update', text: request.note, requestIds: [id] }); await this.save(); throw new EngineError(request.note);
    } finally { this.runAbort = undefined; this.running = undefined; this.options.activity(''); }
  }
  stop() { this.chatAbort?.abort(); this.runAbort?.abort(); }
  async answer(id: string, text: string): Promise<void> {
    const decision = this.state.projection.decisions.find(d => d.id === id);
    if (!decision || decision.answer || !decision.choice) throw new EngineError('This question is no longer waiting for an answer.');
    if (this.chatAbort) throw new EngineError('Wait for the current conversation turn before answering.');
    decision.answer = { text, time: new Date().toISOString() }; await this.save();
    await this.submit(`For your question “${decision.question}”: ${text}`, decision.choice);
  }
  async close() { this.stop(); await Promise.allSettled([...this.operations]); await this.store.close(); }
}
