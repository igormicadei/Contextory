import { isDemoState, type DemoState } from './model';
import { attachmentLimits, isAttachment, type Attachment, type ExecutionChoice, type ModelChoice, type Reference } from './context';
export type LiveCommand = { type: 'liveSubmit'; text: string; choice: ExecutionChoice; attachments: Attachment[] } | { type: 'liveRun' | 'openWorktree'; id: string } | { type: 'liveStop' } | { type: 'liveAnswer'; id: string; text: string } | { type: 'setMode'; live: boolean } | { type: 'models'; provider: 'codex' | 'claude' };
export type ToHost = LiveCommand | { type: 'ready' } | { type: 'save'; state: DemoState } | { type: 'pickAttachments' } | { type: 'searchReferences'; requestId: number; trigger: '@' | '$' | '/'; query: string; provider: 'codex' | 'claude' } | { type: 'checkRuntimes' } | { type: 'openPlan' } | { type: 'openSpec'; id: string } | { type: 'openDiff'; id: string; sha: string } | { type: 'openReport'; markdown: string };
export interface RuntimeResult { provider: 'codex' | 'claude'; available: boolean; version?: string; message: string }
export type ToWebview = { type: 'restore'; state: DemoState } | { type: 'workspace'; live: boolean; name: string; claudeIntegration?: 'native' | 'sdk'; codexIntegration?: 'native' | 'appServer' } | { type: 'activity'; text: string } | { type: 'models'; provider: 'codex' | 'claude'; items: ModelChoice[] } | { type: 'attachments'; files: Attachment[] } | { type: 'references'; requestId: number; items: Reference[] } | { type: 'diagnostics'; results: RuntimeResult[] } | { type: 'reset' } | { type: 'notice'; text: string };
export function isToHost(value: unknown): value is ToHost {
  if (!value || typeof value !== 'object') return false;
  const v = value as ToHost;
  if (v.type === 'liveStop') return true;
  if (v.type === 'setMode') return typeof v.live === 'boolean';
  if (v.type === 'models') return ['codex', 'claude'].includes(v.provider);
  if (v.type === 'liveRun' || v.type === 'openWorktree') return typeof v.id === 'string' && /^REQ-\d{3,6}$/.test(v.id);
  if (v.type === 'liveAnswer') return typeof v.id === 'string' && /^DEC-\d{3,6}$/.test(v.id) && typeof v.text === 'string' && v.text.trim().length > 0 && v.text.length <= 4000;
  if (v.type === 'liveSubmit') return typeof v.text === 'string' && v.text.trim().length > 0 && v.text.length <= 4000 && !!v.choice && ['codex', 'claude'].includes(v.choice.provider) && typeof v.choice.model === 'string' && v.choice.model.length <= 200 && typeof v.choice.effort === 'string' && v.choice.effort.length <= 40 && Array.isArray(v.attachments) && v.attachments.length <= attachmentLimits.count && v.attachments.every(isAttachment) && v.attachments.reduce((n, a) => n + a.size, 0) <= attachmentLimits.totalBytes;
  if (['ready', 'checkRuntimes', 'openPlan', 'pickAttachments'].includes(v.type)) return true;
  if (v.type === 'searchReferences') return Number.isSafeInteger(v.requestId) && v.requestId >= 0 && ['@', '$', '/'].includes(v.trigger) && typeof v.query === 'string' && v.query.length <= 200 && ['codex', 'claude'].includes(v.provider);
  if (v.type === 'save') return isDemoState(v.state);
  if (v.type === 'openReport') return typeof v.markdown === 'string' && v.markdown.length <= 200000;
  if (v.type === 'openSpec') return typeof v.id === 'string' && /^SPEC-\d{3,6}$/.test(v.id);
  if (v.type === 'openDiff') return typeof v.id === 'string' && /^SPEC-\d{3,6}$/.test(v.id) && typeof v.sha === 'string' && /^[a-f0-9]{7,40}$/.test(v.sha);
  return false;
}
