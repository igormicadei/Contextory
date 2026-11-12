import { realpath, readdir, open } from 'node:fs/promises';
import { relative, resolve, isAbsolute } from 'node:path';
import { EngineError } from './types';
export class WorkspaceFiles {
  constructor(private root: string) {}
  private async path(input: string): Promise<string> {
    if (isAbsolute(input) || /(^|[\\/])\.\.(?:[\\/]|$)/.test(input)) throw new EngineError('Use a path relative to the workspace.');
    const root = await realpath(this.root); const path = await realpath(resolve(root, input)); const rel = relative(root, path);
    if (rel.startsWith('..') || isAbsolute(rel) || /(^|[\\/])(?:\.git|node_modules)(?:[\\/]|$)/.test(rel)) throw new EngineError('Path is outside the readable source tree.');
    return path;
  }
  async list(path = '.'): Promise<string[]> {
    const dir = await this.path(path);
    return (await readdir(dir, { withFileTypes: true })).filter(e => !['.git', 'node_modules', '.relay-local'].includes(e.name) && !e.isSymbolicLink()).slice(0, 500).map(e => e.name + (e.isDirectory() ? '/' : ''));
  }
  async read(path: string): Promise<string> {
    const file = await open(await this.path(path), 'r');
    try {
      if (!(await file.stat()).isFile()) throw new EngineError('Select a regular text file.');
      const buffer = Buffer.alloc(256 * 1024 + 1); const result = await file.read(buffer, 0, buffer.length, 0);
      if (result.bytesRead > 256 * 1024 || buffer.subarray(0, result.bytesRead).includes(0)) throw new EngineError('File is binary or exceeds the 256 KiB inspection limit.');
      return buffer.subarray(0, result.bytesRead).toString('utf8');
    } finally { await file.close(); }
  }
}
