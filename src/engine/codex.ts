import { Rpc } from './rpc';
import { checkAbort, EngineError, type Agent, type AgentInput, type AgentResult } from './types';
import type { ModelChoice } from '../shared/context';
const tools = [
  { type: 'function', name: 'relay_search_requests', description: 'Search ALL Relay requests, including finished requests. Search before proposing new work or amendments.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { type: 'function', name: 'relay_get_request', description: 'Read a full request and its milestones, specifications, revisions and commits.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false } },
  { type: 'function', name: 'relay_list_files', description: 'List a workspace-relative source directory, read-only. Use this if native shell inspection is unavailable.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } },
  { type: 'function', name: 'relay_read_file', description: 'Read a bounded text file using its workspace-relative path. Cannot write or read outside the workspace.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } }
];
export class CodexAgent implements Agent {
  constructor(private executable: string) {}
  private async connect(cwd: string) {
    const rpc = new Rpc(this.executable, cwd);
    try { await rpc.request('initialize', { clientInfo: { name: 'relay_workspace', title: 'Relay', version: '0.0.1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized'); return rpc; }
    catch (error) { await rpc.close(); throw error; }
  }
  async models(cwd: string): Promise<ModelChoice[]> {
    const rpc = await this.connect(cwd);
    try {
      const models: ModelChoice[] = []; let cursor: string | undefined;
      do {
        const result = await rpc.request('model/list', { limit: 100, cursor });
        for (const model of result.data ?? []) if (!model.hidden) models.push({ id: model.model, label: model.displayName, efforts: ['default', ...model.supportedReasoningEfforts.map((e: { reasoningEffort: string }) => e.reasoningEffort)] });
        cursor = result.nextCursor;
      } while (cursor && models.length < 500);
      return [{ id: 'default', label: 'Runtime default', efforts: ['default'] }, ...models];
    } finally { await rpc.close(); }
  }
  async run(input: AgentInput): Promise<AgentResult> {
    checkAbort(input.signal);
    const resume = input.session?.startsWith('relay-native-codex:') ? undefined : input.session;
    const rpc = await this.connect(input.cwd);
    let session = resume ?? ''; let turnId = ''; let text = ''; let finalText = ''; let settled = false;
    let finish!: (result: AgentResult) => void; let fail!: (error: Error) => void;
    const completed = new Promise<AgentResult>((resolve, reject) => { finish = resolve; fail = reject; });
    // Attach a handler before startup so early disconnects cannot become unhandled rejections.
    void completed.catch(() => {});
    rpc.onClose = () => { if (!settled) fail(new EngineError('Codex disconnected before the turn finished.')); };
    rpc.notification = (method, params) => {
      if (params?.threadId !== session) return;
      if (method === 'item/agentMessage/delta') { text += params.delta; input.event({ type: 'text', text: params.delta }); }
      if (method === 'item/started') input.event({ type: 'activity', text: `Codex · ${params.item?.type ?? 'working'}` });
      if (method === 'item/completed' && params.item?.type === 'agentMessage') finalText = params.item.text ?? '';
      if (method === 'turn/completed') {
        settled = true;
        if (params.turn?.status === 'completed') finish({ text: finalText || text, session });
        else fail(new EngineError(input.signal.aborted ? 'Stopped. Partial work is preserved.' : `Codex turn ${params.turn?.status ?? 'failed'}. No completion was recorded.`));
      }
    };
    rpc.requestFromServer = async (method, params) => {
      if (params.threadId !== session) throw new EngineError('Unknown thread.');
      if (method === 'item/tool/call' && input.tools) {
        try {
          const result = params.tool === 'relay_search_requests' ? input.tools.search(String(params.arguments?.query ?? '')) : params.tool === 'relay_get_request' ? input.tools.get(String(params.arguments?.id ?? '')) : params.tool === 'relay_list_files' ? await input.tools.list?.(String(params.arguments?.path ?? '.')) : params.tool === 'relay_read_file' ? await input.tools.read?.(String(params.arguments?.path ?? '')) : { error: 'Unknown tool' };
          return { contentItems: [{ type: 'inputText', text: JSON.stringify(result ?? { error: 'Tool unavailable' }) }], success: true };
        } catch { return { contentItems: [{ type: 'inputText', text: 'Cannot inspect this path. Use an existing workspace-relative directory or a text file of at most 256 KiB.' }], success: false }; }
      }
      if (method === 'item/commandExecution/requestApproval' || method === 'item/fileChange/requestApproval') {
        const title = method === 'item/fileChange/requestApproval' ? 'Codex wants to change files' : 'Codex wants to run a command';
        const allowed = input.write && await input.approve(title, JSON.stringify({ command: params.command, reason: params.reason, grantRoot: params.grantRoot, cwd: params.cwd }).slice(0, 3000));
        return { decision: allowed ? 'accept' : 'decline' };
      }
      throw new EngineError('This native interaction is not supported yet.');
    };
    const interrupt = () => { if (session && turnId) void rpc.request('turn/interrupt', { threadId: session, turnId }).catch(() => {}); fail(new EngineError('Stopped. Partial work is preserved.')); };
    const timeout = setTimeout(interrupt, 30 * 60 * 1000);
    input.signal.addEventListener('abort', interrupt, { once: true });
    try {
      const thread = await rpc.request(resume ? 'thread/resume' : 'thread/start', { ...(resume ? { threadId: resume } : { dynamicTools: input.tools ? tools : undefined }), cwd: input.cwd, model: input.choice.model === 'default' ? undefined : input.choice.model, sandbox: input.write ? 'workspace-write' : 'read-only', approvalPolicy: 'on-request' });
      session = thread.thread.id; input.event({ type: 'session', id: session }); checkAbort(input.signal);
      const turn = await rpc.request('turn/start', { threadId: session, input: [{ type: 'text', text: input.text, text_elements: [] }, ...(input.images ?? []).map(url => ({ type: 'image', url }))], effort: input.choice.effort === 'default' ? undefined : input.choice.effort, outputSchema: input.schema });
      turnId = turn.turn.id; checkAbort(input.signal);
      return await completed;
    } finally { settled = true; clearTimeout(timeout); input.signal.removeEventListener('abort', interrupt); await rpc.close(); }
  }
}
