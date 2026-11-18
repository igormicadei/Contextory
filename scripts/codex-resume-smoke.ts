// Optional native-client qualification. No credentials, model turns or user chats.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import { configureProvider } from "../src/providers/registration";
import { startService } from "../src/service/server";
import { toolDefinitions } from "../src/contracts/tools";

async function main() {
  const executable = process.argv[2];
  if (!executable)
    throw new Error(
      "Usage: node --import tsx scripts/codex-resume-smoke.ts <codex executable>",
    );
  await mkdir(resolve(".contextory-local"), { recursive: true });
  const directory = await mkdtemp(resolve(".contextory-local/codex-resume-"));
  const root = join(directory, "workspace"),
    storage = join(directory, "storage"),
    home = join(directory, "codex-home");
  await Promise.all([root, storage, home].map((path) => mkdir(path)));
  await writeFile(join(root, "main.ts"), "export const nativeSmoke = true;\n");
  await writeFile(
    join(home, "config.toml"),
    `model_provider = "offline_smoke"\nmodel = "offline-smoke"\n[model_providers.offline_smoke]\nname = "No model calls"\nbase_url = "http://127.0.0.1:9/v1"\nwire_api = "responses"\n[projects.${JSON.stringify(root)}]\ntrust_level = "trusted"\n`,
  );
  const registration = await configureProvider({
    root,
    provider: "codex",
    node: process.execPath,
    proxy: resolve("dist/mcp-proxy.mjs"),
    hook: resolve("dist/contextory-hook.mjs"),
    descriptor: join(storage, "codex.json"),
    hookDescriptor: join(storage, "codex-hook.json"),
  });
  const options = {
    root,
    storage,
    workerPath: resolve("dist/analysis-worker.mjs"),
    embeddingDirectory: join(directory, "embeddings"),
  };
  let service = await startService(options);
  const clients: ReturnType<typeof connect>[] = [];
  function connect() {
    const env = { ...process.env, CODEX_HOME: home };
    // An isolated home and offline provider must never borrow the user's auth.
    for (const key of Object.keys(env))
      if (/^(?:OPENAI|AZURE_OPENAI|CODEX_API|CHATGPT)/.test(key))
        delete env[key];
    const child = spawn(executable, ["app-server"], {
      cwd: root,
      env,
      windowsHide: true,
      stdio: "pipe",
    });
    let id = 0,
      stderr = "";
    const pending = new Map<
      number,
      { resolve(value: any): void; reject(error: Error): void }
    >();
    child.stderr.on("data", (data) => {
      stderr = (stderr + data).slice(-12000);
    });
    createInterface({ input: child.stdout }).on("line", (line) => {
      const packet = JSON.parse(line);
      if (packet.id !== undefined && pending.has(packet.id)) {
        const call = pending.get(packet.id)!;
        pending.delete(packet.id);
        if (packet.error) call.reject(new Error(JSON.stringify(packet.error)));
        else call.resolve(packet.result);
      } else if (packet.id !== undefined && packet.method) {
        child.stdin.write(
          JSON.stringify({
            id: packet.id,
            error: {
              code: -32601,
              message: "Interactive requests are outside this smoke test",
            },
          }) + "\n",
        );
      }
    });
    child.on("exit", (code) => {
      for (const item of pending.values())
        item.reject(new Error(`Codex exited ${code}: ${stderr}`));
      pending.clear();
    });
    child.on("error", (error) => {
      for (const item of pending.values()) item.reject(error);
      pending.clear();
    });
    return {
      async call(method: string, params: unknown = {}) {
        const requestId = ++id;
        return await new Promise<any>((resolve, reject) => {
          const timer = setTimeout(() => {
            pending.delete(requestId);
            reject(new Error(`${method} timed out: ${stderr}`));
          }, 30000);
          pending.set(requestId, {
            resolve: (value) => {
              clearTimeout(timer);
              resolve(value);
            },
            reject: (error) => {
              clearTimeout(timer);
              reject(error);
            },
          });
          child.stdin.write(
            JSON.stringify({ id: requestId, method, params }) + "\n",
          );
        });
      },
      async initialize() {
        const result = await this.call("initialize", {
          clientInfo: { name: "contextory_native_smoke", version: "1" },
          capabilities: { experimentalApi: true },
        });
        child.stdin.write(JSON.stringify({ method: "initialized" }) + "\n");
        return result;
      },
      async close() {
        if (child.exitCode !== null) return;
        child.stdin.end();
        await Promise.race([
          new Promise((resolve) => child.once("exit", resolve)),
          delay(3000),
        ]);
        if (child.exitCode === null) child.kill();
      },
    };
  }
  const report = {
    recordedAt: new Date().toISOString(),
    passed: false,
    checks: [] as string[],
    native: {} as unknown,
    error: undefined as string | undefined,
  };
  try {
    const first = connect();
    clients.push(first);
    report.native = await first.initialize();
    const thread = await first.call("thread/start", {
      cwd: root,
      ephemeral: false,
      approvalPolicy: "never",
      sandbox: "read-only",
    });
    const threadId = thread.thread.id;
    const inventory = await first.call("mcpServerStatus/list", { threadId });
    const server = inventory.data.find(
      (s: any) => s.name === registration.name,
    );
    assert.ok(server, JSON.stringify(inventory));
    assert.equal(Object.keys(server.tools).length, toolDefinitions().length);
    const call = (
      client: ReturnType<typeof connect>,
      tool: string,
      args: object = {},
    ) =>
      client.call("mcpServer/tool/call", {
        threadId,
        server: registration.name,
        tool,
        arguments: args,
      });
    const before = await call(first, "contextory_context_get");
    assert.ok(!before.isError, JSON.stringify(before));
    report.checks.push(
      "native thread discovers every workspace-scoped Contextory tool and calls MCP without a model turn",
    );
    await first.call("thread/inject_items", {
      threadId,
      items: [
        {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Disposable reconnect smoke history; do not start a model turn.",
            },
          ],
        },
      ],
    });
    const projectId = service.app.ledger.projectId;
    await service.close();
    const resumedCall = call(first, "contextory_context_get");
    await delay(400);
    service = await startService(options);
    assert.ok(!(await resumedCall).isError);
    assert.equal(service.app.ledger.projectId, projectId);
    report.checks.push(
      "existing native thread's first MCP call recovers across delayed service restart",
    );
    await first.close();
    const reopened = connect();
    clients.push(reopened);
    await reopened.initialize();
    const resumed = await reopened.call("thread/resume", {
      threadId,
      cwd: root,
    });
    assert.equal(resumed.thread.id, threadId);
    const after = await reopened.call("mcpServerStatus/list", { threadId });
    assert.equal(
      Object.keys(
        after.data.find((s: any) => s.name === registration.name).tools,
      ).length,
      toolDefinitions().length,
    );
    assert.ok(!(await call(reopened, "contextory_context_get")).isError);
    report.checks.push(
      "a fresh native app-server process resumes persisted history and recovers the full tool inventory and MCP calls",
    );
    report.passed = true;
  } catch (error) {
    report.error = error instanceof Error ? error.stack : String(error);
    process.exitCode = 1;
  } finally {
    for (const client of clients.reverse()) await client.close();
    await service.close();
    await writeFile(
      resolve("artifacts/codex-resume.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
