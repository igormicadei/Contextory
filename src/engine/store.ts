import { mkdir, readFile, rename, open, unlink, type FileHandle } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { EngineError } from './types';
// Single-owner, atomic snapshots with integrity checking. No native SQLite/Electron ABI dependency.
export class Store<T> {
  private tail: Promise<void> = Promise.resolve();
  private lock?: FileHandle;
  private owner = randomUUID();
  constructor(private path: string, private valid: (value: unknown) => value is T) {}
  async load(fallback: () => T): Promise<T> {
    await mkdir(dirname(this.path), { recursive: true });
    const lockPath = this.path + '.lock';
    try { this.lock = await open(lockPath, 'wx'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const lock = JSON.parse(await readFile(lockPath, 'utf8'));
      if (!Number.isSafeInteger(lock.pid)) throw new EngineError('Invalid Relay storage lock. Inspect it before opening the workspace again.');
      let alive = true; try { process.kill(lock.pid, 0); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ESRCH') alive = false; }
      if (alive) throw new EngineError('Relay is already open for this workspace in another extension host.');
      await unlink(lockPath); this.lock = await open(lockPath, 'wx');
    }
    await this.lock.writeFile(JSON.stringify({ pid: process.pid, owner: this.owner }));
    try {
      let data: string;
      try { data = await readFile(this.path, 'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback(); throw error; }
      const envelope = JSON.parse(data);
      if (typeof envelope.payload !== 'string' || createHash('sha256').update(envelope.payload).digest('hex') !== envelope.sha256) throw new EngineError('Relay state integrity check failed. The file was preserved for recovery.');
      const value: unknown = JSON.parse(envelope.payload);
      if (!this.valid(value)) throw new EngineError('Unsupported Relay state. The file was preserved for recovery.');
      return value;
    } catch (error) { await this.close(); throw error; }
  }
  save(value: T): Promise<void> {
    const payload = JSON.stringify(value);
    if (payload.length > 32 * 1024 * 1024) return Promise.reject(new EngineError('Relay workspace storage limit reached.'));
    const data = JSON.stringify({ sha256: createHash('sha256').update(payload).digest('hex'), payload });
    const operation = this.tail.then(async () => {
      if (!this.lock) throw new EngineError('Relay storage is not owned by this process.');
      const temp = this.path + '.' + this.owner + '.tmp';
      const file = await open(temp, 'w');
      try { await file.writeFile(data); await file.sync(); } finally { await file.close(); }
      await rename(temp, this.path);
    });
    this.tail = operation.catch(() => {}); return operation;
  }
  async close(): Promise<void> {
    await this.tail;
    if (!this.lock) return;
    await this.lock.close(); this.lock = undefined;
    await unlink(this.path + '.lock').catch(() => {});
  }
}
