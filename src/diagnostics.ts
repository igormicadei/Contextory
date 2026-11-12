import { execFile } from 'node:child_process';
import type { RuntimeResult } from './shared/protocol';
export type VersionRunner = (executable: string) => Promise<string>;
export const runVersion: VersionRunner = executable => new Promise((resolve, reject) => {
  // Native executable + fixed arguments. No shell, prompt, credentials, or model invocation.
  execFile(executable, ['--version'], { timeout: 8000, windowsHide: true, maxBuffer: 128 * 1024 }, (error, stdout) => error ? reject(error) : resolve(stdout.trim()));
});
export async function checkRuntimes(executables: { codex: string; claude: string }, runner: VersionRunner = runVersion): Promise<RuntimeResult[]> {
  return Promise.all((['codex', 'claude'] as const).map(async provider => {
    try {
      const version = (await runner(executables[provider])).split(/\r?\n/)[0]?.slice(0, 160);
      if (!version) throw new Error('Empty version');
      return { provider, available: true, version, message: 'Executable responds. Native discovery, authentication, and task execution are not verified.' };
    } catch {
      return { provider, available: false, message: 'Version check failed or timed out. Configure the native executable path in Relay settings.' };
    }
  }));
}
