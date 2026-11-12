import { build, context } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await mkdir('artifacts', { recursive: true });
const jobs = [
  { entryPoints: ['src/extension.ts'], outfile: 'dist/extension.js', platform: 'node', format: 'cjs', external: ['vscode'] },
  { entryPoints: ['src/webview/main.ts'], outfile: 'dist/webview.js', platform: 'browser', format: 'iife' },
  { entryPoints: ['src/native/proxy.ts'], outfile: 'dist/native-proxy.mjs', platform: 'node', format: 'esm', banner: { js: "import { createRequire as relayCreateRequire } from 'node:module'; const require = relayCreateRequire(import.meta.url);" } },
  { entryPoints: ['src/engine/claude.ts'], outfile: 'dist/claude.mjs', platform: 'node', format: 'esm', banner: { js: "import { createRequire as relayCreateRequire } from 'node:module'; const require = relayCreateRequire(import.meta.url);" } }
];
const shared = { bundle: true, sourcemap: true, target: 'es2022', logLevel: 'info' };
if (process.argv.includes('--watch')) {
  for (const job of jobs) await (await context({ ...shared, ...job })).watch();
} else {
  await Promise.all(jobs.map(job => build({ ...shared, ...job })));
}
