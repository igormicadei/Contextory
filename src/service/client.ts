import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { rpc, readDescriptor } from "./rpc";
import { ContextoryError, version } from "../contracts/model";
import { toolDefinitions } from "../contracts/tools";
export class ServiceClient {
  readonly id = randomUUID();
  readonly descriptor: string;
  private process?: ChildProcess;
  private heartbeat?: NodeJS.Timeout;
  private controller = new AbortController();
  private opened = false;
  node = "node";
  bridgeChanged = false;
  bridgeFingerprint = "";
  constructor(
    readonly root: string,
    readonly storage: string,
    readonly extensionRoot: string,
    private executable: string,
    readonly embeddings: string,
    private event: (event: Record<string, unknown>) => void,
    private log: (text: string) => void,
  ) {
    this.descriptor = join(storage, "ui.json");
  }
  async start() {
    if (this.opened) return;
    const probe = await promisify(execFile)(
      this.executable,
      [
        "-e",
        "require('node:sqlite'); console.log(JSON.stringify({major:Number(process.versions.node.split('.')[0]),path:process.execPath}))",
      ],
      { windowsHide: true, timeout: 10000 },
    );
    const runtime = JSON.parse(probe.stdout.trim()) as {
      major: number;
      path: string;
    };
    if (runtime.major < 24)
      throw new ContextoryError(
        "NODE_REQUIRED",
        "Contextory needs Node.js 24+ with node:sqlite. Configure contextory.nodeExecutable.",
      );
    this.node = runtime.path;
    await mkdir(this.storage, { recursive: true });
    await mkdir(join(this.storage, "runtime"), { recursive: true });
    const bridgeHash = createHash("sha256");
    for (const file of ["mcp-proxy.mjs", "contextory-hook.mjs"]) {
      const source = await readFile(join(this.extensionRoot, "dist", file));
      bridgeHash.update(file).update(source);
      const old = await readFile(join(this.storage, "runtime", file)).catch(
        () => undefined,
      );
      if (old?.equals(source)) continue;
      this.bridgeChanged = true;
      await copyFile(
        join(this.extensionRoot, "dist", file),
        join(this.storage, "runtime", file),
      );
    }
    this.bridgeFingerprint = bridgeHash.digest("hex");
    try {
      await this.call("health");
    } catch {
      const child = spawn(
        this.node,
        [
          join(this.extensionRoot, "dist/service.mjs"),
          this.root,
          this.storage,
          join(this.extensionRoot, "dist/analysis-worker.mjs"),
          this.embeddings,
        ],
        { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], shell: false },
      );
      this.process = child;
      child.stderr?.on("data", (chunk) =>
        this.log(String(chunk).slice(0, 2000)),
      );
      let failure: Error | undefined;
      child.on("error", (error) => {
        failure = error;
      });
      const deadline = Date.now() + 12000;
      while (Date.now() < deadline) {
        try {
          await this.call("health");
          break;
        } catch {
          if (failure) throw failure;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      await this.call("health");
    }
    const health = await this.call<{ version?: string }>("health");
    const catalog = await this.call<{ tools: unknown[] }>("tools/list");
    if (
      health.version !== version ||
      JSON.stringify(catalog.tools) !== JSON.stringify(toolDefinitions())
    )
      throw new ContextoryError(
        "SERVICE_RESTART_REQUIRED",
        "The running Contextory service has a different version or tool contract. Use Contextory: Restart Agent Extensions; if it persists, close the editors for this project for 65 seconds and reopen it. Existing project data is retained.",
      );
    const descriptor = await readDescriptor(this.descriptor);
    if (descriptor.root.toLowerCase() !== this.root.toLowerCase())
      throw new ContextoryError(
        "WRONG_WORKSPACE",
        "Connected service belongs to a different root.",
      );
    await this.call("client.attach", { id: this.id });
    this.opened = true;
    this.heartbeat = setInterval(() => {
      void this.call("client.attach", { id: this.id }).catch((error) =>
        this.event({ type: "disconnected", message: error.message }),
      );
    }, 20000);
    this.heartbeat.unref();
    void this.subscribe();
  }
  call<T = unknown>(method: string, params: unknown = {}, timeoutMs = 30000) {
    return rpc<T>(this.descriptor, method, params, timeoutMs);
  }
  private async subscribe() {
    while (!this.controller.signal.aborted) {
      try {
        const d = await readDescriptor(this.descriptor);
        const response = await fetch(d.url.replace("/rpc", "/events"), {
          headers: { authorization: `Bearer ${d.token}` },
          signal: this.controller.signal,
          redirect: "error",
        });
        if (!response.ok || !response.body)
          throw new Error("Event subscription unavailable.");
        let buffer = "";
        const decoder = new TextDecoder();
        const reader = response.body.getReader();
        try {
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            buffer += decoder.decode(next.value, { stream: true });
            let end: number;
            while ((end = buffer.indexOf("\n\n")) >= 0) {
              const packet = buffer.slice(0, end);
              buffer = buffer.slice(end + 2);
              if (packet.startsWith("data: "))
                this.event(JSON.parse(packet.slice(6)));
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (error) {
        if (!this.controller.signal.aborted)
          this.event({
            type: "disconnected",
            message:
              error instanceof Error ? error.message : "Event connection lost",
          });
      }
      if (!this.controller.signal.aborted)
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  async close() {
    this.controller.abort();
    clearInterval(this.heartbeat);
    if (this.opened)
      await this.call("client.detach", { id: this.id }).catch(() => {});
    this.opened = false;
    this.process?.stdout?.destroy();
    this.process?.stderr?.destroy();
    this.process?.unref();
  }
}
