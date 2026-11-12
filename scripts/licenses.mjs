import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const notices = ['Relay bundled runtime dependency notices', '', 'The separately installed native Codex and Claude executables are not included in the VSIX.', ''];
const seen = new Set();
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev || entry.optional) continue;
  const pkg = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'));
  const id = `${pkg.name}@${pkg.version}`; if (seen.has(id)) continue; seen.add(id);
  notices.push('='.repeat(72), id, `License: ${pkg.license ?? 'See package license'}`, typeof pkg.repository === 'object' ? pkg.repository.url ?? '' : pkg.repository ?? '', '');
  const files = (await readdir(path)).filter(name => /^(?:license|copying|notice)(?:\.|$)/i.test(name));
  for (const file of files) notices.push(file, await readFile(join(path, file), 'utf8'), '');
}
await writeFile('THIRD_PARTY_NOTICES.txt', notices.join('\n'), 'utf8');
console.log(`Bundled dependency notices generated for ${seen.size} packages.`);
