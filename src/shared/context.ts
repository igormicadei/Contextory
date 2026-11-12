import type { Provider } from './model';

export interface ExecutionChoice { provider: Provider; model: string; effort: string }
export interface ModelChoice { id: string; label: string; efforts: string[] }
// Illustrative UI data only. Production catalogs come from the running provider.
export const sampleModels: Record<Provider, ModelChoice[]> = {
  codex: [
    { id: 'default', label: 'Runtime default', efforts: ['default'] },
    { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol · sample', efforts: ['default', 'low', 'medium', 'high'] }
  ],
  claude: [
    { id: 'default', label: 'Runtime default', efforts: ['default'] },
    { id: 'sonnet', label: 'Sonnet · sample', efforts: ['default', 'low', 'medium', 'high'] },
    { id: 'opus', label: 'Opus · sample', efforts: ['default', 'low', 'medium', 'high', 'max'] },
    { id: 'haiku', label: 'Haiku · sample', efforts: ['default'] }
  ]
};
export function normalizeChoice(choice: ExecutionChoice, catalog = sampleModels): ExecutionChoice {
  const model = catalog[choice.provider].find(m => m.id === choice.model) ?? catalog[choice.provider][0];
  return { provider: choice.provider, model: model.id, effort: model.efforts.includes(choice.effort) ? choice.effort : 'default' };
}
export interface AttachmentMeta { id: string; name: string; size: number; mime: string }
export interface Attachment extends AttachmentMeta { thumbnail?: string; data?: string }
export interface Reference {
  id: string; label: string; value: string; kind: 'file' | 'folder' | 'agent' | 'skill';
  scope: 'workspace' | 'user'; source: 'sample' | 'local';
}
export const attachmentLimits = { count: 6, fileBytes: 4 * 1024 * 1024, totalBytes: 12 * 1024 * 1024 };
export const imageMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export function isAttachmentMeta(value: unknown): value is AttachmentMeta {
  if (!value || typeof value !== 'object') return false;
  const a = value as AttachmentMeta;
  return typeof a.id === 'string' && a.id.length <= 120 && typeof a.name === 'string' && a.name.length <= 512 && Number.isSafeInteger(a.size) && a.size >= 0 && a.size <= attachmentLimits.fileBytes && typeof a.mime === 'string' && a.mime.length <= 120;
}
export function isAttachment(value: unknown): value is Attachment {
  if (!isAttachmentMeta(value)) return false;
  const a = value as Attachment;
  if (a.data !== undefined && (typeof a.data !== 'string' || a.data.length > Math.ceil(attachmentLimits.fileBytes * 4 / 3) + 4 || !/^[A-Za-z0-9+/=]*$/.test(a.data))) return false;
  return a.thumbnail === undefined || (imageMimes.includes(a.mime) && typeof a.thumbnail === 'string' && a.thumbnail.length <= Math.ceil(attachmentLimits.fileBytes * 4 / 3) + 100 && a.thumbnail.startsWith(`data:${a.mime};base64,`) && /^[A-Za-z0-9+/=]+$/.test(a.thumbnail.split(',')[1] ?? ''));
}
export function isReference(value: unknown): value is Reference {
  if (!value || typeof value !== 'object') return false;
  const r = value as Reference;
  return [r.id, r.label, r.value].every(s => typeof s === 'string' && s.length <= 1024) && ['file', 'folder', 'agent', 'skill'].includes(r.kind) && ['workspace', 'user'].includes(r.scope) && ['sample', 'local'].includes(r.source);
}
export const sampleReferences: Reference[] = [
  { id: 'file-main', label: 'src/webview/main.ts', value: '@src/webview/main.ts', kind: 'file', scope: 'workspace', source: 'sample' },
  { id: 'folder-src', label: 'src/', value: '@src/', kind: 'folder', scope: 'workspace', source: 'sample' },
  { id: 'file-plan', label: 'docs/PLAN.md', value: '@docs/PLAN.md', kind: 'file', scope: 'workspace', source: 'sample' },
  { id: 'agent-review', label: 'code-reviewer', value: '$code-reviewer', kind: 'agent', scope: 'workspace', source: 'sample' },
  { id: 'skill-ui', label: 'ui-review', value: '$ui-review', kind: 'skill', scope: 'user', source: 'sample' },
  { id: 'skill-tests', label: 'test-workflow', value: '$test-workflow', kind: 'skill', scope: 'workspace', source: 'sample' }
];
