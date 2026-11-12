import { download } from '@vscode/test-electron';
import { mkdir, lstat, realpath, symlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// Pin the portable runtime so F5 and native smoke tests use the same tested build.
const version = '1.145.3';
const local = join(root, '.relay-local');
await mkdir(local, { recursive: true });
const executable = await download({ version, cachePath: join(local, 'vscode-cache'), extensionDevelopmentPath: root });
const runtimeRoot = process.platform === 'darwin' ? resolve(dirname(executable), '../../..') : dirname(executable);
const link = join(local, 'debug-runtime');
try {
  const info = await lstat(link);
  const actual = await realpath(link);
  if (!info.isSymbolicLink() || actual.toLowerCase() !== (await realpath(runtimeRoot)).toLowerCase()) {
    throw new Error('The existing .relay-local/debug-runtime points elsewhere. Keep it intact and choose a new runtime link before changing the pinned version.');
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  await symlink(runtimeRoot, link, process.platform === 'win32' ? 'junction' : 'dir');
}
await Promise.all(['debug-user', 'debug-extensions', 'host-smoke-user', 'host-smoke-extensions'].map(name => mkdir(join(local, name), { recursive: true })));
console.log(`Relay debug runtime ready: VS Code ${version}`);
console.log(executable);
