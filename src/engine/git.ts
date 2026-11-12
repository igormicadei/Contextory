import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { checkAbort, EngineError } from './types';
const execute = promisify(execFile);
export interface CheckRecipe { name: string; executable: string; args: string[]; kind: 'unit' | 'browser' | 'layout'; timeoutMs?: number }
export async function git(cwd: string, args: string[]): Promise<string> {
  try { return (await execute('git', args, { cwd, windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 })).stdout.trim(); }
  catch { throw new EngineError(`Git could not finish: ${args.slice(0, 2).join(' ')}. Check repository state, identity, hooks and remote authentication.`); }
}
export async function createWorktree(root: string, target: string, branch: string): Promise<void> {
  const top = await realpath(await git(root, ['rev-parse', '--show-toplevel']));
  if (top.toLowerCase() !== (await realpath(root)).toLowerCase()) throw new EngineError('Open the repository root as the workspace before running requests.');
  if (await git(root, ['status', '--porcelain'])) throw new EngineError('The original checkout has uncommitted changes. Commit or stash them before preparing a request worktree.');
  if (!/^relay\/REQ-\d{3,6}\/integration$/.test(branch)) throw new EngineError('Invalid request branch.');
  await mkdir(dirname(resolve(target)), { recursive: true });
  await git(root, ['worktree', 'add', '-b', branch, target, 'HEAD']);
}
export async function verifyWorktree(root: string, target: string, branch: string): Promise<void> {
  const registered = await git(root, ['worktree', 'list', '--porcelain']);
  const actual = (await realpath(target)).replaceAll('\\', '/');
  const owned = registered.split(/\r?\n\r?\n/).some(record => record.split(/\r?\n/).includes(`worktree ${actual}`));
  const current = await git(target, ['branch', '--show-current']);
  const milestonePrefix = branch.replace(/integration$/, 'm');
  const allowedBranch = current === branch || (current.startsWith(milestonePrefix) && /^\d+$/.test(current.slice(milestonePrefix.length)));
  if (!owned || !allowedBranch) throw new EngineError('Request worktree ownership or branch changed. Inspect it before resuming.');
}
export async function runCheck(cwd: string, recipe: CheckRecipe, signal: AbortSignal): Promise<{ passed: boolean; detail: string }> {
  checkAbort(signal);
  return new Promise(resolveCheck => {
    const child = spawn(recipe.executable, recipe.args, { cwd, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    // Capture only a bounded tail in memory. Persist command and exit result, not arbitrary secrets from test output.
    child.stdout.resume(); child.stderr.resume();
    let done = false;
    const finish = (passed: boolean, detail: string) => { if (done) return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort); resolveCheck({ passed, detail }); };
    const stop = async () => {
      if (process.platform === 'win32' && child.pid) await execute('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 }).catch(() => {});
      else child.kill('SIGTERM');
    };
    const abort = () => { void stop(); finish(false, 'Cancelled; no passing evidence recorded.'); };
    const timer = setTimeout(() => { void stop(); finish(false, 'Check timed out.'); }, recipe.timeoutMs ?? 300000);
    signal.addEventListener('abort', abort, { once: true });
    child.on('error', () => finish(false, 'Could not start the configured check executable. Use an executable, not a shell fragment.'));
    child.on('exit', code => finish(code === 0 && !signal.aborted, `${recipe.executable} ${recipe.args.join(' ')} · exit ${code ?? 'signal'}`));
  });
}
