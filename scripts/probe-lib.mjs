import { spawn, execFile } from 'node:child_process';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { relative, isAbsolute } from 'node:path';
const execute = promisify(execFile);
export async function version(executable) {
  const result = await execute(executable, ['--version'], { timeout: 8000, windowsHide: true, maxBuffer: 128 * 1024 });
  return result.stdout.trim().split(/\r?\n/)[0].slice(0, 160);
}
export function safeLocation(path, cwd) {
  if (typeof path !== 'string') return undefined;
  const repoRelative = relative(cwd, path);
  if (!repoRelative.startsWith('..') && !isAbsolute(repoRelative)) return `<workspace>/${repoRelative.replaceAll('\\', '/')}`;
  const homeRelative = relative(homedir(), path);
  if (!homeRelative.startsWith('..') && !isAbsolute(homeRelative)) return `~/${homeRelative.replaceAll('\\', '/')}`;
  return '<external-path>';
}
export function summarizeCodex(config, skillResult, mcpResult, cwd) {
  const skills = (skillResult?.data ?? []).flatMap(row => row.skills ?? []);
  const servers = mcpResult?.data ?? [];
  return {
    effectiveConfiguration: config ? 'read-successfully' : 'not-verified',
    configurationLayers: Array.isArray(config?.layers) ? config.layers.length : undefined,
    skills: skills.map(s => ({ name: s.name, scope: s.scope, enabled: s.enabled, location: safeLocation(s.path, cwd) })),
    skillDiscoveryErrors: (skillResult?.data ?? []).reduce((n, row) => n + (row.errors?.length ?? 0), 0),
    mcp: mcpResult ? { inspected: true, servers: servers.map(s => ({ name: s.name, authStatus: s.authStatus, toolCount: Object.keys(s.tools ?? {}).length })), nextPageAvailable: !!mcpResult.nextCursor } : { inspected: false },
    agents: 'not-verified-by-this-probe', authentication: 'not-exercised', modelExecution: 'not-exercised', sessionResume: 'not-exercised', worktreeExecution: 'not-exercised'
  };
}
export async function inspectCodex(executable, cwd, includeMcp = false, spawnProcess = spawn) {
  const child = spawnProcess(executable, ['app-server'], { cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let serial = 0;
  let streamBytes = 0;
  const pending = new Map();
  const fail = () => { for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('App Server connection closed.')); } pending.clear(); };
  child.on('error', fail); child.on('exit', fail); child.stdin.on('error', fail);
  child.stderr.resume(); // Never write provider stderr or raw config/auth data to a report.
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    streamBytes += Buffer.byteLength(line);
    if (streamBytes > 16 * 1024 * 1024) { fail(); child.kill(); return; }
    let response; try { response = JSON.parse(line); } catch { return; }
    if (response.method && response.id !== undefined) {
      child.stdin.write(JSON.stringify({ id: response.id, error: { code: -32601, message: 'Read-only probe does not approve server actions.' } }) + '\n'); return;
    }
    const entry = pending.get(response.id); if (!entry) return;
    clearTimeout(entry.timer); pending.delete(response.id);
    if (response.error) entry.reject(new Error(`App Server request failed (${entry.method}).`)); else entry.resolve(response.result);
  });
  const request = (method, params) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`App Server request timed out (${method}).`)); }, 15000);
    pending.set(id, { resolve, reject, timer, method });
    child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
  });
  try {
    await request('initialize', { clientInfo: { name: 'relay_compatibility_probe', title: 'Relay Compatibility Probe', version: '0.0.1' }, capabilities: { experimentalApi: false } });
    child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
    const config = await request('config/read', { includeLayers: true, cwd });
    const skills = await request('skills/list', { cwds: [cwd], forceReload: true });
    const mcp = includeMcp ? await request('mcpServerStatus/list', { limit: 100, detail: 'toolsAndAuthOnly' }) : undefined;
    return summarizeCodex(config, skills, mcp, cwd);
  } finally {
    fail(); lines.close(); child.stdin.end();
    if (child.exitCode === null && child.pid) {
      if (process.platform === 'win32') {
        // Stop only the process tree we created, including any helper processes.
        await execute('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 }).catch(() => {});
      } else child.kill('SIGTERM');
    }
  }
}
