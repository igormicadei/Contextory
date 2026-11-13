import { createServer, type Server } from "node:http";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  mkdir,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
  open,
} from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import { Application } from "./application";
import { Ledger } from "../storage/ledger";
import { workspacePath } from "../verification/workspace";
import { toolDefinitions } from "../contracts/tools";
import {
  ContextoryError,
  version,
  type Actor,
  type CheckRecipe,
  type Descriptor,
  type FlowGraph,
  type Provider,
} from "../contracts/model";
export interface ServiceOptions {
  root: string;
  storage: string;
  workerPath: string;
  embeddingDirectory: string;
}
export async function writePrivate(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await rename(temporary, path);
}
export async function startService(options: ServiceOptions) {
  if (!isAbsolute(options.root) || !isAbsolute(options.storage))
    throw new ContextoryError(
      "ABSOLUTE_ROOT_REQUIRED",
      "Service paths must be absolute.",
    );
  const root = await realpath(options.root);
  await mkdir(options.storage, { recursive: true });
  const lockPath = join(options.storage, "service.lock");
  try {
    const old = JSON.parse(await readFile(lockPath, "utf8")) as { pid: number };
    let live = true;
    try {
      process.kill(old.pid, 0);
    } catch (error) {
      live = (error as NodeJS.ErrnoException).code !== "ESRCH";
    }
    if (live)
      throw new ContextoryError(
        "SERVICE_BUSY",
        "Another service owns this project. Attach using its descriptor.",
      );
    await unlink(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const lock = await open(lockPath, "wx", 0o600);
  await lock.writeFile(JSON.stringify({ pid: process.pid, root }));
  await lock.close();
  let cleanup: (() => Promise<void>) | undefined;
  try {
    const ledger = new Ledger(join(options.storage, "project.sqlite3"), root);
    const app = new Application(
      ledger,
      options.storage,
      options.workerPath,
      options.embeddingDirectory,
    );
    cleanup = () => app.close();
    const roles = [
      "ui",
      "codex",
      "claude",
      "bob",
      "codex-hook",
      "claude-hook",
      "bob-hook",
    ];
    const tokens = new Map(
      roles.map((role) => [role, randomBytes(32).toString("hex")]),
    );
    const instance = randomUUID();
    const streams = new Set<import("node:http").ServerResponse>();
    const clients = new Map<string, number>();
    const pendingEditor = new Map<
      string,
      {
        resolve(g: FlowGraph): void;
        reject(e: Error): void;
        timer: NodeJS.Timeout;
      }
    >();
    let changed = false;
    let changeTimer: NodeJS.Timeout | undefined;
    const notify = (value: unknown) => {
      for (const stream of streams)
        stream.write(`data: ${JSON.stringify(value)}\n\n`);
    };
    ledger.onChange = () => {
      if (!changed) {
        changed = true;
        changeTimer = setTimeout(() => {
          changed = false;
          notify({ type: "changed", sequence: ledger.sequence() });
        }, 50);
      }
    };
    app.editorTrace = (input) =>
      new Promise((resolve, reject) => {
        if (!streams.size) {
          reject(
            new ContextoryError(
              "EDITOR_UNAVAILABLE",
              "No editor host is connected.",
            ),
          );
          return;
        }
        const id = randomUUID();
        const timer = setTimeout(() => {
          pendingEditor.delete(id);
          reject(
            new ContextoryError(
              "EDITOR_TIMEOUT",
              "Editor language service did not respond within the query budget.",
            ),
          );
        }, input.limits?.timeoutMs ?? 2000);
        pendingEditor.set(id, { resolve, reject, timer });
        notify({ type: "editor.trace", id, input });
      });
    const parseRecipes = (value: unknown): CheckRecipe[] => {
      if (!Array.isArray(value) || value.length > 30)
        throw new ContextoryError(
          "INVALID_CHECKS",
          "Configure at most 30 check recipes.",
        );
      const ids = new Set<string>();
      return value.map((r) => {
        if (
          !r ||
          typeof r.id !== "string" ||
          !/^[\w-]{1,100}$/.test(r.id) ||
          ids.has(r.id) ||
          typeof r.name !== "string" ||
          typeof r.executable !== "string" ||
          !r.executable ||
          !Array.isArray(r.args) ||
          r.args.length > 100 ||
          r.args.some((a: unknown) => typeof a !== "string") ||
          (r.timeoutMs !== undefined &&
            (!Number.isInteger(r.timeoutMs) ||
              r.timeoutMs < 1000 ||
              r.timeoutMs > 1800000))
        )
          throw new ContextoryError(
            "INVALID_CHECKS",
            "Checks require a unique id, name, executable, args and optional 1–1800 second timeout.",
          );
        ids.add(r.id);
        return {
          id: r.id,
          name: r.name,
          executable: r.executable,
          args: r.args,
          timeoutMs: r.timeoutMs,
        };
      });
    };
    const invoke = async (
      role: string,
      method: string,
      params: Record<string, unknown>,
    ) => {
      const actor: Actor = {
        id: role,
        human: role === "ui",
        provider: ["codex", "claude", "bob"].includes(role)
          ? (role as Provider)
          : undefined,
      };
      if (role.endsWith("-hook")) {
        if (method !== "hook")
          throw new ContextoryError(
            "FORBIDDEN",
            "Hook credentials can only ingest observations.",
          );
        return app.hook(role.split("-")[0] as Provider, params);
      }
      if (method === "health")
        return {
          version,
          instance,
          root,
          node: process.versions.node,
          projectId: ledger.projectId,
        };
      if (method === "tools/list") {
        if (actor.provider) {
          app.seen(`mcp:${actor.provider}`);
          ledger.onChange();
        }
        return { tools: toolDefinitions() };
      }
      if (method === "tools/call") {
        if (actor.provider) {
          app.seen(`mcp:${actor.provider}`);
          ledger.onChange();
        }
        const result = await app.call(
          String(params.name),
          params.arguments,
          actor,
        );
        if (actor.human || JSON.stringify(result).length <= 24000)
          return result;
        const artifactId = `ART-${randomUUID()}`;
        await mkdir(join(options.storage, "artifacts"), { recursive: true });
        await writeFile(
          join(options.storage, "artifacts", `${artifactId}.json`),
          JSON.stringify(result),
          "utf8",
        );
        const graph = result as FlowGraph;
        return {
          artifactId,
          detail:
            "Result exceeds the native context budget. Read this artifact with contextory_entity_get using offset/limit, or page graph nodes with contextory_flow_expand.",
          graphId: graph.id,
          snapshotId: graph.snapshotId,
          nodes: graph.nodes?.length,
          edges: graph.edges?.length,
        };
      }
      if (!actor.human)
        throw new ContextoryError(
          "FORBIDDEN",
          "This operation belongs to the editor UI.",
        );
      switch (method) {
        case "client.attach":
          clients.set(String(params.id), Date.now());
          return { attached: true };
        case "client.detach":
          clients.delete(String(params.id));
          return { detached: true };
        case "dashboard":
          return app.dashboard();
        case "source.resolve":
          return workspacePath(root, String(params.path));
        case "analysis.invalidate":
          app.analysis.graphs.clear();
          return { invalidated: true };
        case "configure":
          app.checks.recipes = parseRecipes(params.recipes);
          if (
            typeof params.pythonExecutable === "string" &&
            params.pythonExecutable.trim()
          )
            app.analysis.python.executable = params.pythonExecutable;
          return { configured: true };
        case "provider.configured":
          if (!["codex", "claude", "bob"].includes(String(params.provider)))
            throw new ContextoryError(
              "INVALID_PROVIDER",
              "Choose a supported provider.",
            );
          app.seen(
            `configured:${params.provider}`,
            String(params.configured === true),
          );
          ledger.onChange();
          return { configured: true };
        case "index.sources":
          return app.indexSources();
        case "index.vectors":
          return app.knowledge.indexVectors((done, total) =>
            notify({ type: "index.progress", done, total }),
          );
        case "check.cancel":
          app.checks.cancel(String(params.id));
          return { cancelled: true };
        case "analysis.cancel":
          for (const pending of pendingEditor.values()) {
            clearTimeout(pending.timer);
            pending.reject(
              new ContextoryError("CANCELLED", "Source analysis stopped."),
            );
          }
          pendingEditor.clear();
          await app.analysis.close();
          return { cancelled: true };
        case "editor.response": {
          const p = pendingEditor.get(String(params.id));
          if (!p) return { ignored: true };
          clearTimeout(p.timer);
          pendingEditor.delete(String(params.id));
          if (params.error)
            p.reject(
              new ContextoryError("EDITOR_UNSUPPORTED", String(params.error)),
            );
          else p.resolve(params.graph as FlowGraph);
          return { received: true };
        }
        default:
          throw new ContextoryError(
            "UNKNOWN_METHOD",
            "Unknown editor operation.",
          );
      }
    };
    const http: Server = createServer(async (request, response) => {
      const supplied = Buffer.from(request.headers.authorization ?? "");
      const role = [...tokens].find(([, token]) => {
        const expected = Buffer.from(`Bearer ${token}`);
        return (
          expected.length === supplied.length &&
          timingSafeEqual(expected, supplied)
        );
      })?.[0];
      if (!role) {
        response.writeHead(401).end();
        return;
      }
      if (
        request.headers.origin ||
        !/^127\.0\.0\.1:\d+$/.test(request.headers.host ?? "")
      ) {
        response.writeHead(403).end();
        return;
      }
      if (
        request.url === "/events" &&
        request.method === "GET" &&
        role === "ui"
      ) {
        response.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-store",
        });
        response.write(`data: {"type":"connected"}\n\n`);
        streams.add(response);
        request.on("close", () => streams.delete(response));
        return;
      }
      if (request.url !== "/rpc" || request.method !== "POST") {
        response.writeHead(405).end();
        return;
      }
      response.setHeader("content-type", "application/json");
      response.setHeader("cache-control", "no-store");
      try {
        let size = 0;
        const chunks: Buffer[] = [];
        for await (const part of request) {
          size += part.length;
          if (size > 1024 * 1024)
            throw new ContextoryError(
              "PAYLOAD_LIMIT",
              "RPC payload exceeds 1 MiB.",
            );
          chunks.push(part);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          method: string;
          params?: Record<string, unknown>;
        };
        const result = await invoke(role, body.method, body.params ?? {});
        response.end(JSON.stringify({ result }));
      } catch (error) {
        response.end(
          JSON.stringify({
            error: {
              code:
                error instanceof ContextoryError
                  ? error.code
                  : "REQUEST_FAILED",
              message:
                error instanceof Error ? error.message : "Request failed",
            },
          }),
        );
      }
    });
    cleanup = async () => {
      clearTimeout(changeTimer);
      for (const stream of streams) stream.end();
      http.closeAllConnections();
      await new Promise<void>((resolve) => http.close(() => resolve()));
      await app.close();
    };
    await new Promise<void>((resolve, reject) => {
      http.once("error", reject);
      http.listen(0, "127.0.0.1", resolve);
    });
    const address = http.address();
    if (!address || typeof address === "string")
      throw new Error("No loopback listener.");
    const descriptors = new Map<string, Descriptor>();
    for (const [role, token] of tokens) {
      const descriptor: Descriptor = {
        schema: 1,
        url: `http://127.0.0.1:${address.port}/rpc`,
        token,
        root,
        role,
        instance,
      };
      await writePrivate(join(options.storage, `${role}.json`), descriptor);
      descriptors.set(role, descriptor);
    }
    let closed = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      clearInterval(lifetime);
      clearTimeout(changeTimer);
      ledger.onChange = () => {};
      for (const p of pendingEditor.values()) {
        clearTimeout(p.timer);
        p.reject(
          new ContextoryError("SERVICE_STOPPED", "Editor service stopped."),
        );
      }
      pendingEditor.clear();
      for (const stream of streams) stream.end();
      streams.clear();
      http.closeAllConnections();
      await new Promise<void>((resolve) => http.close(() => resolve()));
      await app.close();
      for (const role of tokens.keys()) {
        const path = join(options.storage, `${role}.json`);
        const stored = await readFile(path, "utf8")
          .then(
            (text) => JSON.parse(text),
            () => ({}),
          )
          .catch(() => ({}));
        if (stored.instance === instance) await unlink(path).catch(() => {});
      }
      await unlink(lockPath).catch(() => {});
    };
    const began = Date.now();
    const lifetime = setInterval(() => {
      for (const [id, seen] of clients)
        if (Date.now() - seen > 60000) clients.delete(id);
      if (!clients.size && Date.now() - began > 60000) void close();
    }, 10000);
    lifetime.unref();
    return { app, descriptors, close, port: address.port };
  } catch (error) {
    await cleanup?.();
    await unlink(lockPath).catch(() => {});
    throw error;
  }
}
