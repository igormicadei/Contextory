import { query, tool, createSdkMcpServer, type Options } from '@anthropic-ai/claude-agent-sdk/core';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { checkAbort, EngineError, type Agent, type AgentInput, type AgentResult } from './types';
import type { ModelChoice } from '../shared/context';
import { configuredClaudeAuth } from '../native/auth';
export { supportedClaudeAuth } from '../native/auth';
export class ClaudeAgent implements Agent {
  constructor(private executable: string) {}
  private async options(cwd: string): Promise<Options> {
    if (!await configuredClaudeAuth(cwd)) throw new EngineError('The optional Claude SDK route needs API, supported cloud or custom gateway authentication in the environment or native settings. The default native-extension route uses its own login and configuration.');
    return { cwd, pathToClaudeCodeExecutable: this.executable, settingSources: ['user', 'project', 'local'], systemPrompt: { type: 'preset', preset: 'claude_code' }, stderr: () => {} };
  }
  async models(cwd: string): Promise<ModelChoice[]> {
    // Keep streaming input open without sending a model prompt during discovery.
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    async function* empty(): AsyncGenerator<never> { await gate; }
    const run = query({ prompt: empty(), options: await this.options(cwd) });
    const timer = setTimeout(() => { run.close(); release(); }, 30000);
    try { return [{ id: 'default', label: 'Runtime default', efforts: ['default'] }, ...(await run.supportedModels()).map(m => ({ id: m.value, label: m.displayName, efforts: ['default', ...(m.supportedEffortLevels ?? [])] }))]; }
    finally { clearTimeout(timer); run.close(); release(); }
  }
  async run(input: AgentInput): Promise<AgentResult> {
    checkAbort(input.signal);
    const sessionId = input.session?.startsWith('relay-native:') ? undefined : input.session;
    const abortController = new AbortController();
    const abort = () => abortController.abort(); input.signal.addEventListener('abort', abort, { once: true });
    const serverName = `relay_${randomUUID().replaceAll('-', '')}`;
    const server = input.tools ? createSdkMcpServer({ name: serverName, tools: [
      tool('relay_search_requests', 'Search all requests, including finished work. Search before proposing new work or amendments.', { query: z.string().max(4000) }, async ({ query: q }) => ({ content: [{ type: 'text', text: JSON.stringify(input.tools!.search(q)) }] })),
      tool('relay_get_request', 'Read the full request, specs, revisions and linked commits.', { id: z.string().max(100) }, async ({ id }) => ({ content: [{ type: 'text', text: JSON.stringify(input.tools!.get(id)) }] })),
      tool('relay_list_files', 'List a workspace-relative directory. Read-only inspection without a shell.', { path: z.string().max(2000) }, async ({ path }) => ({ content: [{ type: 'text', text: JSON.stringify(await input.tools!.list?.(path)) }] })),
      tool('relay_read_file', 'Read a bounded workspace-relative text file. Cannot write or access outside files.', { path: z.string().max(2000) }, async ({ path }) => ({ content: [{ type: 'text', text: JSON.stringify(await input.tools!.read?.(path)) }] }))
    ] }) : undefined;
    let session = sessionId ?? ''; let text = '';
    let run: ReturnType<typeof query> | undefined;
    const timeout = setTimeout(abort, 30 * 60 * 1000);
    try {
      run = query({ prompt: input.images?.length ? imagePrompt({ ...input, session: sessionId }) : input.text, options: {
        ...await this.options(input.cwd), abortController, resume: sessionId,
        model: input.choice.model === 'default' ? undefined : input.choice.model,
        effort: input.choice.effort === 'default' ? undefined : input.choice.effort as Options['effort'],
        permissionMode: input.write ? 'default' : 'plan', includePartialMessages: true,
        outputFormat: input.schema ? { type: 'json_schema', schema: input.schema } : undefined,
        mcpServers: server ? { [serverName]: server } : undefined,
        canUseTool: async (name, args, context) => {
          if (context.mcpServer?.source === 'sdk' && context.mcpServer.name === serverName) return { behavior: 'allow', updatedInput: args };
          if (!input.write) return { behavior: 'deny', message: 'Project conversation and planning cannot approve writes or external actions.' };
          return await input.approve(`Claude wants to use ${name}`, JSON.stringify(args).slice(0, 3000)) ? { behavior: 'allow', updatedInput: args } : { behavior: 'deny', message: 'The user declined this action.' };
        }
      } });
      for await (const message of run) {
        checkAbort(input.signal);
        if ('session_id' in message && message.session_id && message.session_id !== session) { session = message.session_id; input.event({ type: 'session', id: session }); }
        if (message.type === 'stream_event' && message.event.type === 'content_block_delta' && message.event.delta.type === 'text_delta') input.event({ type: 'text', text: message.event.delta.text });
        if (message.type === 'assistant') for (const block of message.message.content) if (block.type === 'tool_use') input.event({ type: 'activity', text: `Claude · ${block.name}` });
        if (message.type === 'result') {
          if (message.is_error || message.subtype !== 'success') throw new EngineError('Claude did not finish successfully. Check native runtime, permissions and supported authentication.');
          text = message.structured_output ? JSON.stringify(message.structured_output) : message.result;
        }
      }
      if (!text) throw new EngineError('Claude returned no final answer.');
      return { text, session };
    } finally { clearTimeout(timeout); input.signal.removeEventListener('abort', abort); run?.close(); }
  }
}
async function* imagePrompt(input: AgentInput) {
  yield { type: 'user' as const, session_id: input.session ?? '', parent_tool_use_id: null, message: { role: 'user' as const, content: [
    { type: 'text' as const, text: input.text }, ...(input.images ?? []).map(url => {
      const match = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url);
      if (!match) throw new EngineError('Unsupported image input.');
      return { type: 'image' as const, source: { type: 'base64' as const, media_type: match[1] as 'image/png', data: match[2] } };
    })
  ] } };
}
