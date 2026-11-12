import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { inspectCodex, version } from './probe-lib.mjs';
const args = process.argv.slice(2);
const value = name => { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; };
if (args.includes('--help')) {
  console.log('npm run probe -- [--codex path-to-exe] [--claude path-to-exe] [--inspect-codex] [--mcp] [--cwd trusted-repository] [--output report.json]\nDefault: executable version checks only. --inspect-codex starts App Server and inspects effective config and skill discovery, without a thread or model call. --mcp also asks for MCP status. Claude SDK execution and all live model checks are deferred; see docs/COMPATIBILITY.md.');
  process.exit(0);
}
const cwd = resolve(value('--cwd') ?? process.cwd());
const executables = { codex: value('--codex') ?? 'codex', claude: value('--claude') ?? 'claude' };
const report = { schema: 1, recordedAt: new Date().toISOString(), mode: args.includes('--inspect-codex') ? 'read-only-discovery' : 'versions-only', modelCalls: false, providers: {} };
for (const provider of ['codex', 'claude']) {
  try { report.providers[provider] = { available: true, version: await version(executables[provider]), nativeDiscovery: 'not-verified' }; }
  catch { report.providers[provider] = { available: false, message: 'Version check failed or timed out.' }; }
}
if (args.includes('--inspect-codex') && report.providers.codex.available) {
  try { report.providers.codex.discovery = await inspectCodex(executables.codex, cwd, args.includes('--mcp')); report.providers.codex.nativeDiscovery = 'partially-verified'; }
  catch (error) { report.providers.codex.discovery = { error: error instanceof Error ? error.message : 'Inspection failed.' }; process.exitCode = 1; }
}
const json = JSON.stringify(report, null, 2) + '\n';
if (value('--output')) await writeFile(resolve(value('--output')), json, 'utf8');
console.log(json);
