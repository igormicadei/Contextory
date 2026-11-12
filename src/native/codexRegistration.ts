import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse, stringify } from 'smol-toml';
import { EngineError } from '../engine/types';
import { nativeRegistration } from './registration';

const samePath = (a: string, b: string) => process.platform === 'win32' ? resolve(a).toLowerCase() === resolve(b).toLowerCase() : resolve(a) === resolve(b);
const table = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
// Codex CLI mcp add writes user configuration. Use the documented trusted-project
// layer instead, appending only our table and preserving all existing text.
export async function registerNativeCodex(root: string, proxy: string, descriptor: string): Promise<{ name: string; added: boolean }> {
  const registration = nativeRegistration(root, proxy, descriptor);
  const directory = join(root, '.codex'); await mkdir(directory, { recursive: true });
  if (!samePath(await realpath(directory), join(await realpath(root), '.codex'))) throw new EngineError('The project .codex folder points outside the workspace. Relay did not change its configuration.');
  const path = join(directory, 'config.toml'); const lockPath = join(directory, '.relay-registration.lock');
  const lock = await open(lockPath, 'wx').catch(() => { throw new EngineError('Relay project configuration is busy. Retry after the other connection finishes.'); });
  const temporary = join(directory, `.relay-${randomUUID()}.tmp`);
  try {
    let original: string | undefined; let mode = 0o600;
    try {
      const stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new EngineError('Relay cannot append to a linked or non-file project config.toml. The file was preserved.');
      mode = stat.mode & 0o777; original = await readFile(path, 'utf8');
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    let parsed: Record<string, unknown>;
    try { parsed = parse((original ?? '').replace(/^\uFEFF/, '')); }
    catch { throw new EngineError('The project Codex configuration could not be parsed. Fix config.toml and retry; no existing content was changed.'); }
    const servers = parsed.mcp_servers;
    const existing = table(servers) ? servers[registration.name] : undefined;
    if (existing !== undefined) {
      if (table(existing) && existing.command === registration.config.command && JSON.stringify(existing.args) === JSON.stringify(registration.config.args) && existing.enabled !== false && !existing.url) return { name: registration.name, added: false };
      throw new EngineError('A different or disabled Relay MCP entry already uses this project name. Inspect the project config.toml; Relay did not replace it.');
    }
    const newline = original?.includes('\r\n') ? '\r\n' : '\n';
    const stanza = stringify({ mcp_servers: { [registration.name]: { command: registration.config.command, args: registration.config.args } } }).replace(/\r?\n/g, newline);
    const next = `${original ?? ''}${original ? `${newline}${newline}` : ''}# Relay native workspace bridge${newline}${stanza}`;
    try { parse(next.replace(/^\uFEFF/, '')); }
    catch { throw new EngineError('Relay cannot safely append its MCP table to this config.toml layout. Existing configuration was preserved.'); }
    const file = await open(temporary, 'wx', mode);
    try { await file.writeFile(next, 'utf8'); await file.sync(); } finally { await file.close(); }
    const current = await readFile(path, 'utf8').catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; });
    if (current !== original) throw new EngineError('The project config.toml changed during connection. Retry; Relay did not overwrite it.');
    await rename(temporary, path);
    return { name: registration.name, added: true };
  } finally { await unlink(temporary).catch(() => {}); await lock.close(); await unlink(lockPath); }
}
