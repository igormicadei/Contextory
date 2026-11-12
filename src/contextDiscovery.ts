import * as vscode from 'vscode';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { open } from 'node:fs/promises';
import { attachmentLimits, imageMimes, type Attachment, type Reference } from './shared/context';
import type { Provider } from './shared/model';

export async function pickAttachments(): Promise<Attachment[]> {
  const selected = await vscode.window.showOpenDialog({ canSelectMany: true, canSelectFolders: false, openLabel: 'Attach to Relay', title: 'Attach files or images' });
  const files: Attachment[] = [];
  let total = 0;
  for (const uri of (selected ?? []).slice(0, attachmentLimits.count)) {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type !== vscode.FileType.File || stat.size > attachmentLimits.fileBytes || total + stat.size > attachmentLimits.totalBytes) {
      await vscode.window.showWarningMessage('Relay preview supports up to 6 files, 4 MiB each, 12 MiB total. Some selections were skipped.');
      continue;
    }
    const name = uri.path.split('/').pop() ?? 'attachment';
    const mime = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' } as Record<string, string>)[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
    let thumbnail: string | undefined;
    // Native local file reads are bounded even if the file changes after stat.
    let data: string | undefined;
    if (uri.scheme === 'file') {
      const handle = await open(uri.fsPath, 'r');
      try {
        const buffer = Buffer.alloc(attachmentLimits.fileBytes + 1);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        if (bytesRead > attachmentLimits.fileBytes) continue;
        data = buffer.subarray(0, bytesRead).toString('base64');
        if (imageMimes.includes(mime)) thumbnail = `data:${mime};base64,${data}`;
      } finally { await handle.close(); }
    }
    total += stat.size;
    files.push({ id: randomUUID(), name, size: stat.size, mime, thumbnail, data });
  }
  return files;
}

export async function searchReferences(trigger: '@' | '$' | '/', query: string, provider: Provider): Promise<Reference[]> {
  const results: Reference[] = [];
  if (trigger === '@') {
    const cancellation = new vscode.CancellationTokenSource();
    const timer = setTimeout(() => cancellation.cancel(), 5000);
    try {
      const files = await vscode.workspace.findFiles('**/*', '**/{node_modules,.git,.relay-local,dist}/**', 2000, cancellation.token);
      const folders = new Set<string>();
      for (const uri of files) {
        const label = vscode.workspace.asRelativePath(uri, (vscode.workspace.workspaceFolders?.length ?? 0) > 1).replaceAll('\\', '/');
        results.push({ id: uri.toString(), label, value: `@${label.includes(' ') ? `"${label}"` : label}`, kind: 'file', scope: 'workspace', source: 'local' });
        const parts = label.split('/'); parts.pop();
        while (parts.length) { folders.add(`${parts.join('/')}/`); parts.pop(); }
      }
      for (const label of folders) results.push({ id: `folder:${label}`, label, value: `@${label.includes(' ') ? `"${label}"` : label}`, kind: 'folder', scope: 'workspace', source: 'local' });
    } finally { clearTimeout(timer); cancellation.dispose(); }
  } else {
    // Metadata-only file discovery. Native runtime catalogs are the production authority.
    const roots = [
      ...(vscode.workspace.workspaceFolders ?? []).map(f => ({ uri: f.uri, scope: 'workspace' as const })),
      { uri: vscode.Uri.file(homedir()), scope: 'user' as const }
    ];
    for (const root of roots) {
      const directories = provider === 'codex' ? ['.agents/skills', '.codex/skills', '.codex/agents'] : ['.claude/skills', '.claude/agents'];
      for (const directory of directories) {
        const base = vscode.Uri.joinPath(root.uri, directory);
        const agent = directory.endsWith('/agents');
        if (trigger === '/' && agent) continue;
        try {
          const entries = (await vscode.workspace.fs.readDirectory(base)).slice(0, 200);
          for (const [name, kind] of entries) {
            if (name.startsWith('.')) continue;
            if (!agent) {
              if (kind !== vscode.FileType.Directory) continue;
              try { if ((await vscode.workspace.fs.stat(vscode.Uri.joinPath(base, name, 'SKILL.md'))).type !== vscode.FileType.File) continue; } catch { continue; }
            } else if (kind !== vscode.FileType.File || !/\.(md|toml)$/.test(name)) continue;
            const label = agent ? name.replace(/\.(md|toml)$/, '') : name;
            results.push({ id: vscode.Uri.joinPath(base, name).toString(), label, value: `${trigger}${label}`, kind: agent ? 'agent' : 'skill', scope: root.scope, source: 'local' });
          }
        } catch { /* Absent native metadata directories are normal. */ }
      }
    }
  }
  return results.filter(r => r.label.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.label.localeCompare(b.label)).slice(0, 40);
}
