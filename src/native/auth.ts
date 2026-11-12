import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
export function supportedClaudeAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ANTHROPIC_API_KEY || ['CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY'].some(key => env[key] === '1')) return true;
  if (env.ANTHROPIC_AUTH_TOKEN && env.ANTHROPIC_BASE_URL) {
    try { const url = new URL(env.ANTHROPIC_BASE_URL); return ['http:', 'https:'].includes(url.protocol) && !['api.anthropic.com', 'claude.ai', 'api.claude.ai'].includes(url.hostname); } catch { return false; }
  }
  return false;
}
// Only decide whether a supported route is configured. Never return credentials to the caller.
// The native runtime remains responsible for resolving and using its actual authentication.
export async function configuredClaudeAuth(cwd: string, options: { env?: NodeJS.ProcessEnv; userDirectory?: string } = {}): Promise<boolean> {
  const inherited = options.env ?? process.env;
  const environment: NodeJS.ProcessEnv = { ...inherited }; let helper: unknown;
  const user = options.userDirectory ?? inherited.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
  for (const path of [join(user, 'settings.json'), join(cwd, '.claude', 'settings.json'), join(cwd, '.claude', 'settings.local.json')]) {
    try {
      const settings = JSON.parse(await readFile(path, 'utf8'));
      if (settings.env && typeof settings.env === 'object') for (const key of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY']) if (typeof settings.env[key] === 'string') environment[key] = settings.env[key];
      if ('apiKeyHelper' in settings) helper = settings.apiKeyHelper;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return false; }
  }
  return supportedClaudeAuth(environment) || (typeof helper === 'string' && helper.trim().length > 0);
}
