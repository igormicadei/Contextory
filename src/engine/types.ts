import type { ExecutionChoice, ModelChoice } from '../shared/context';
export interface AgentInput {
  cwd: string; text: string; choice: ExecutionChoice; session?: string; write: boolean;
  schema?: Record<string, unknown>; images?: string[]; signal: AbortSignal;
  tools?: { search(query: string): unknown; get(id: string): unknown; list?(path: string): Promise<unknown>; read?(path: string): Promise<unknown> };
  event(event: AgentEvent): void;
  approve(title: string, detail: string): Promise<boolean>;
}
export type AgentEvent = { type: 'text'; text: string } | { type: 'session'; id: string } | { type: 'activity'; text: string };
export interface AgentResult { text: string; session: string }
export interface Agent { worktreeRouting?: 'prompt'; models(cwd: string): Promise<ModelChoice[]>; run(input: AgentInput): Promise<AgentResult> }
export class EngineError extends Error {}
export function checkAbort(signal: AbortSignal): void { if (signal.aborted) throw new EngineError('Stopped. Partial work is preserved.'); }
