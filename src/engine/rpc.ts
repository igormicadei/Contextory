import { spawn, execFile, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EngineError } from './types';
type Packet = { id?: string | number; method?: string; params?: any; result?: any; error?: { code: number; message?: string } };
// Bounded JSONL transport. Raw provider stderr/config/auth never enters the UI or logs.
export class Rpc {
  private child: ChildProcessWithoutNullStreams;
  private serial = 0;
  private pending = new Map<number, { resolve(value: any): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
  private closed = false;
  notification: (method: string, params: any) => void = () => {};
  requestFromServer: (method: string, params: any) => Promise<unknown> = async () => { throw new EngineError('Unsupported server request.'); };
  onClose: () => void = () => {};
  constructor(executable: string, cwd: string) {
    this.child = spawn(executable, ['app-server'], { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stderr.resume();
    let buffer = '';
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk: string) => {
      buffer += chunk;
      if (buffer.length > 16 * 1024 * 1024) { this.fail(); void this.close(); return; }
      let index: number;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        try { this.packet(JSON.parse(line) as Packet); } catch { this.fail(); void this.close(); return; }
      }
    });
    this.child.on('error', () => this.fail()); this.child.on('exit', () => this.fail()); this.child.stdin.on('error', () => this.fail());
  }
  private packet(packet: Packet) {
    if (packet.method && packet.id !== undefined) {
      void this.requestFromServer(packet.method, packet.params).then(result => this.send({ id: packet.id, result }), () => this.send({ id: packet.id, error: { code: -32601, message: 'Relay cannot handle this request.' } }));
    } else if (packet.method) this.notification(packet.method, packet.params);
    else if (typeof packet.id === 'number') {
      const entry = this.pending.get(packet.id); if (!entry) return;
      clearTimeout(entry.timer); this.pending.delete(packet.id);
      if (packet.error) entry.reject(new EngineError(`Codex rejected the request (code ${packet.error.code}). Check native login, project trust and runtime compatibility.`));
      else entry.resolve(packet.result);
    }
  }
  private send(packet: Packet) { if (!this.closed) this.child.stdin.write(JSON.stringify(packet) + '\n'); }
  notify(method: string, params?: unknown) { this.send({ method, params }); }
  request(method: string, params: unknown, timeout = 30000): Promise<any> {
    if (this.closed) return Promise.reject(new EngineError('Codex connection closed.'));
    return new Promise((resolve, reject) => {
      const id = ++this.serial;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new EngineError(`Codex timed out: ${method}.`)); }, timeout);
      this.pending.set(id, { resolve, reject, timer }); this.send({ id, method, params });
    });
  }
  private fail() {
    if (this.closed) return; this.closed = true;
    for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(new EngineError('Codex process ended. Check the configured native executable.')); }
    this.pending.clear(); this.onClose();
  }
  async close(): Promise<void> {
    this.fail(); this.child.stdin.end();
    if (this.child.exitCode === null && this.child.pid) {
      if (process.platform === 'win32') await new Promise<void>(resolve => execFile('taskkill.exe', ['/PID', String(this.child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 }, () => resolve()));
      else this.child.kill('SIGTERM');
    }
  }
}
