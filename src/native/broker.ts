import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Store } from '../engine/store';
import { planResponse, type PlanResponse } from '../engine/plan';
import { checkAbort, EngineError, type Agent, type AgentInput, type AgentResult } from '../engine/types';
export interface NativeTurn {
  id: string; cwd: string; text: string; write: boolean; status: 'waiting' | 'finished' | 'cancelled' | 'interrupted'; createdAt: string;
  session?: string; result?: string;
  progress?: string;
}
interface Inbox { schema: 1; turns: NativeTurn[] }
export interface NativeActions {
  open(turn: NativeTurn): Promise<void>;
  activity(text: string): void;
  history?(): { role: string; text: string }[];
  search?(query: string): unknown;
  request?(id: string): unknown;
}
function validInbox(value: unknown): value is Inbox {
  const v = value as Inbox;
  return !!v && v.schema === 1 && Array.isArray(v.turns) && v.turns.length <= 100 && v.turns.every(t => t && typeof t.id === 'string' && typeof t.cwd === 'string' && typeof t.text === 'string' && t.text.length <= 16 * 1024 * 1024 && typeof t.write === 'boolean' && ['waiting', 'finished', 'cancelled', 'interrupted'].includes(t.status) && typeof t.createdAt === 'string');
}
export class NativeBroker implements Agent {
  readonly worktreeRouting = 'prompt' as const;
  private store: Store<Inbox>;
  private inbox: Inbox = { schema: 1, turns: [] };
  private pending = new Map<string, { input: AgentInput; resolve(result: AgentResult): void; reject(error: Error): void; abort(): void }>();
  private label: string;
  constructor(storage: string, private actions: NativeActions, private provider: 'claude' | 'codex' = 'claude') { this.label = provider === 'codex' ? 'Codex' : 'Claude'; this.store = new Store(join(storage, provider === 'codex' ? 'native-codex-inbox.json' : 'native-inbox.json'), validInbox); }
  async open(): Promise<void> {
    this.inbox = await this.store.load(() => ({ schema: 1, turns: [] }));
    for (const turn of this.inbox.turns) { if (turn.status === 'waiting') turn.status = 'interrupted'; turn.text = ''; delete turn.result; }
    await this.store.save(this.inbox);
  }
  async models() { return [{ id: 'default', label: `Selected in ${this.label} extension`, efforts: ['default'] }]; }
  get(id: string): NativeTurn {
    const turn = this.inbox.turns.find(t => t.id === id);
    if (!turn) throw new EngineError('Relay native turn not found. Open a new turn from Relay.');
    return turn;
  }
  private active(id: string) {
    const turn = this.get(id); const runtime = this.pending.get(id);
    if (turn.status !== 'waiting' || !runtime || runtime.input.signal.aborted) throw new EngineError('This native turn is no longer active. Return to Relay for the latest instructions.');
    return { turn, runtime };
  }
  read(id: string) {
    const { turn, runtime } = this.active(id);
    const content: ({ type: 'text'; text: string } | { type: 'image'; mimeType: string; data: string })[] = [{ type: 'text', text: JSON.stringify({ ...turn, note: 'Run in the cwd shown here. Preserve native configuration. Native reports are not independent verification.' }) }];
    for (const image of runtime.input.images ?? []) {
      const match = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image);
      if (match) content.push({ type: 'image', mimeType: match[1], data: match[2] });
    }
    return { content };
  }
  async source(id: string, path: string, read: boolean): Promise<unknown> {
    const { runtime } = this.active(id);
    return read ? runtime.input.tools?.read?.(path) : runtime.input.tools?.list?.(path);
  }
  search(id: string | undefined, query: string): unknown { return id ? this.active(id).runtime.input.tools?.search(query) ?? [] : this.actions.search?.(query) ?? []; }
  request(id: string | undefined, requestId: string): unknown { return id ? this.active(id).runtime.input.tools?.get(requestId) ?? null : this.actions.request?.(requestId) ?? null; }
  async progress(id: string, message: string) {
    const { runtime, turn } = this.active(id); turn.progress = message;
    await this.store.save(this.inbox);
    runtime.input.event({ type: 'activity', text: `${this.label} native · ${message}` });
  }
  async finishPlan(id: string, result: PlanResponse, session?: string): Promise<void> {
    const { turn } = this.active(id);
    if (turn.write) throw new EngineError('Use relay_finish_implementation for implementation turns.');
    await this.finish(id, JSON.stringify(planResponse.parse(result)), session);
  }
  async finishImplementation(id: string, summary: string, session?: string): Promise<void> {
    if (!this.active(id).turn.write) throw new EngineError('Conversation turns cannot finish an implementation.');
    await this.finish(id, summary, session);
  }
  private async finish(id: string, result: string, session?: string) {
    const { turn, runtime } = this.active(id);
    const previous = { ...turn };
    turn.status = 'finished'; turn.session = session;
    // Retain session metadata, not a second full copy of conversation/attachment text.
    turn.text = ''; delete turn.result;
    try { await this.store.save(this.inbox); }
    catch (error) { Object.assign(turn, previous); throw error; }
    this.pending.delete(id); runtime.input.signal.removeEventListener('abort', runtime.abort);
    // Coordinator sessions are tagged; only the broker owns native-extension session IDs.
    runtime.resolve({ text: result, session: `${this.provider === 'codex' ? 'relay-native-codex:' : 'relay-native:'}${id}` });
  }
  async run(input: AgentInput): Promise<AgentResult> {
    checkAbort(input.signal);
    if (input.choice.provider !== this.provider) throw new EngineError('This native turn belongs to another provider.');
    if (input.choice.model !== 'default' || input.choice.effort !== 'default') throw new EngineError(`Choose model and effort in the native ${this.label} extension. Use runtime-default choices in the Relay plan.`);
    const history = input.write ? [] : this.actions.history?.() ?? [];
    const prior = [...this.inbox.turns].reverse().find(t => t.status === 'finished' && t.cwd === input.cwd && t.write === input.write && t.session);
    const turn: NativeTurn = { id: randomUUID(), cwd: input.cwd, text: `${input.text}${history.length ? `\n\nRecent shared Relay conversation:\n${JSON.stringify(history)}` : ''}`, write: input.write, status: 'waiting', createdAt: new Date().toISOString(), session: prior?.session };
    this.inbox.turns = [...this.inbox.turns.filter(t => t.status !== 'waiting').slice(-97), ...this.inbox.turns.filter(t => t.status === 'waiting'), turn]; await this.store.save(this.inbox);
    const result = new Promise<AgentResult>((resolve, reject) => {
      const abort = () => {
        if (!this.pending.has(turn.id)) return;
        turn.status = 'cancelled'; turn.text = ''; this.pending.delete(turn.id);
        input.signal.removeEventListener('abort', abort);
        void this.store.save(this.inbox).then(() => reject(new EngineError(`Relay stopped tracking this turn. Stop ${this.label} in its native tab too; it may still be working.`)), () => reject(new EngineError(`Stopped tracking native ${this.label}. Inspect the native tab and Relay storage.`)));
      };
      this.pending.set(turn.id, { input, resolve, reject, abort }); input.signal.addEventListener('abort', abort, { once: true });
    });
    void result.catch(() => {});
    try {
      checkAbort(input.signal);
      this.actions.activity(`Continue in the native ${this.label} tab. Relay is waiting for its MCP response.`);
      await this.actions.open(turn);
      return await result;
    } catch (error) {
      const runtime = this.pending.get(turn.id);
      if (runtime) { runtime.abort(); await result.catch(() => {}); }
      throw error;
    }
  }
  async close() {
    for (const entry of [...this.pending.values()]) entry.abort();
    await this.store.close();
  }
}
export function nativePrompt(turn: NativeTurn): string {
  return `Continue Relay turn ${turn.id}. Use the connected Relay MCP tool relay_read_turn with this turnId first, then follow its instructions. Investigate and search the shared request queue before creating or amending work. For conversation/planning, publish the answer or plan with relay_publish_plan (changes=[] for ordinary questions). For implementation, report progress with relay_report_progress and finish with relay_finish_implementation; Relay independently checks and commits the changes. Do not invoke goal-guardian. The required working directory is ${JSON.stringify(turn.cwd)}. If this is an implementation turn in a worktree, inspect/edit that worktree, not the original checkout. Keep native permissions and configuration.`;
}
export function nativeClaudeUri(turn: NativeTurn, scheme = 'vscode'): string {
  const params = new URLSearchParams({ prompt: nativePrompt(turn) });
  if (turn.session && /^[a-zA-Z0-9_-]{1,200}$/.test(turn.session)) params.set('session', turn.session);
  return `${scheme}://anthropic.claude-code/open?${params}`;
}
