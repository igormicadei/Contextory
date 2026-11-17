import { Worker } from "node:worker_threads";
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { Ledger, digest } from "../storage/ledger";
import { ContextoryError } from "../contracts/model";
import { workspaceFiles, workspacePath } from "../verification/workspace";
import { included, readProjectConfig, type ProjectConfig } from "./config";
import {
  extractorVersion,
  type CodeEdge,
  type CodeExtraction,
  type CodeFile,
  type CodeNode,
  type CodeStatus,
  type CodeImport,
} from "./model";

export class CodebaseIndex {
  pythonExecutable = "python";
  private worker?: Worker;
  private building?: Promise<CodeStatus>;
  private timer?: NodeJS.Timeout;
  private closed = false;
  private requested = false;
  private generation = 0;
  private failure?: string;
  config?: ProjectConfig;
  constructor(
    readonly ledger: Ledger,
    private workerPath: string,
  ) {
    this.config = JSON.parse(ledger.meta("code.config") ?? "null") ?? undefined;
  }
  status(): CodeStatus {
    const saved = JSON.parse(
      this.ledger.meta("code.status") ?? "null",
    ) as CodeStatus | null;
    return {
      state: this.building
        ? "building"
        : this.failure
          ? "failed"
          : this.requested
            ? "stale"
            : (saved?.state ?? "empty"),
      snapshotId: saved?.snapshotId ?? "",
      indexedAt: saved?.indexedAt,
      files: saved?.files ?? 0,
      symbols: saved?.symbols ?? 0,
      edges: saved?.edges ?? 0,
      partial: Boolean(this.failure) || (saved?.partial ?? false),
      gaps: this.failure
        ? [...(saved?.gaps ?? []), this.failure]
        : (saved?.gaps ?? []),
      changedFiles: saved?.changedFiles ?? 0,
    };
  }
  schedule(delay = 750) {
    if (this.closed) return;
    this.requested = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.refresh().catch(() => {});
    }, delay);
    this.timer.unref();
  }
  async refresh(update?: {
    id: string;
    data: CodeImport;
  }): Promise<CodeStatus> {
    if (this.closed)
      throw new ContextoryError("CANCELLED", "Code index is closed.");
    if (this.building) {
      await this.building.catch(() => {});
      return this.refresh(update);
    }
    clearTimeout(this.timer);
    this.timer = undefined;
    this.requested = false;
    const generation = this.generation;
    this.building = this.build(generation, update);
    try {
      const status = await this.building;
      this.failure = undefined;
      return status;
    } catch (error) {
      this.failure =
        error instanceof Error ? error.message : "Code indexing failed";
      throw error;
    } finally {
      this.building = undefined;
      if (this.requested && !this.closed) this.schedule();
    }
  }
  private async build(
    generation: number,
    update?: { id: string; data: CodeImport },
  ): Promise<CodeStatus> {
    const config = await readProjectConfig(this.ledger.root);
    const manifest = await workspaceFiles(this.ledger.root);
    const files: CodeFile[] = [],
      gaps: string[] = [];
    let bytes = 0,
      unsupported = 0;
    for (const path of manifest) {
      if (!included(path, config) || /(^|\/)graphify-out\//.test(path))
        continue;
      const language = /\.[cm]?[jt]sx?$/.test(path)
        ? "typescript"
        : /\.py$/.test(path)
          ? "python"
          : /\.(md|mdx)$/.test(path)
            ? "markdown"
            : /\.(json|ya?ml|toml)$/.test(path)
              ? "configuration"
              : undefined;
      if (!language) {
        unsupported++;
        continue;
      }
      if (files.length >= config.maxFiles || bytes >= config.maxBytes) {
        gaps.push(
          "File/byte indexing capacity reached; narrow include/exclude patterns or raise the configured limits.",
        );
        break;
      }
      try {
        const absolute = await workspacePath(this.ledger.root, path);
        if ((await stat(absolute)).size > 512 * 1024) {
          gaps.push(`Skipped large input: ${path}`);
          continue;
        }
        const text = await readFile(absolute, "utf8");
        if (Buffer.byteLength(text) > 512 * 1024 || text.includes("\0")) {
          gaps.push(`Skipped large/binary input: ${path}`);
          continue;
        }
        if (bytes + Buffer.byteLength(text) > config.maxBytes) {
          gaps.push(`Byte capacity excludes ${path}`);
          continue;
        }
        files.push({ path, text, language, hash: digest(text) });
        bytes += Buffer.byteLength(text);
      } catch {
        gaps.push(`Unreadable or external input: ${path}`);
      }
      if (this.closed || generation !== this.generation)
        throw new ContextoryError("CANCELLED", "Code index was cancelled.");
    }
    this.config = config;
    const old = new Map(
      this.ledger.db
        .prepare("SELECT path,hash FROM code_files")
        .all()
        .map((r) => [String(r.path), String(r.hash)]),
    );
    const changedFiles =
      files.filter((f) => old.get(f.path) !== f.hash).length +
      [...old.keys()].filter((p) => !files.some((f) => f.path === p)).length;
    const importedGraphs = new Map(
      this.ledger.db
        .prepare("SELECT id,data FROM code_imports ORDER BY id")
        .all()
        .map((r) => [String(r.id), JSON.parse(String(r.data)) as CodeImport]),
    );
    if (update) importedGraphs.set(update.id, update.data);
    if (
      [...importedGraphs.values()].reduce((s, g) => s + g.nodes.length, 0) >
        50000 ||
      [...importedGraphs.values()].reduce((s, g) => s + g.edges.length, 0) >
        200000
    )
      throw new ContextoryError(
        "IMPORT_LIMIT",
        "Combined imports exceed graph capacity.",
      );
    const sourceHashes = new Map(files.map((f) => [f.path, f.hash]));
    const imports: CodeImport[] = [],
      importState: unknown[] = [];
    let importBytes = 0;
    for (const [id, graph] of importedGraphs) {
      let valid = Boolean(graph.sourceHashes);
      for (const [path, hash] of Object.entries(graph.sourceHashes ?? {})) {
        if (!sourceHashes.has(path)) {
          try {
            if (!included(path, config) || !manifest.includes(path))
              throw new Error("excluded");
            const absolute = await workspacePath(this.ledger.root, path),
              info = await stat(absolute);
            importBytes += info.size;
            if (info.size > 512 * 1024 || importBytes > config.maxBytes)
              throw new Error("limit");
            sourceHashes.set(path, digest(await readFile(absolute, "utf8")));
          } catch {
            sourceHashes.set(path, "unavailable");
          }
        }
        if (sourceHashes.get(path) !== hash) valid = false;
      }
      importState.push([id, graph, valid]);
      if (valid) imports.push(graph);
      else
        gaps.push(
          `Graphify import ${id} is stale or excluded; re-import after regenerating it for current sources.`,
        );
    }
    const snapshotId = digest([
      extractorVersion,
      config,
      this.pythonExecutable,
      files.map((f) => [f.path, f.hash]),
      importState,
      unsupported,
      gaps,
    ]);
    if (snapshotId === this.status().snapshotId)
      return { ...this.status(), state: "ready", changedFiles: 0 };
    const result = await this.extract(files);
    if (this.closed || generation !== this.generation)
      throw new ContextoryError("CANCELLED", "Code index was cancelled.");
    for (const imported of imports) {
      result.nodes.push(...imported.nodes);
      result.edges.push(...imported.edges);
      result.gaps.push(...imported.gaps);
    }
    const nodes = [...new Map(result.nodes.map((n) => [n.id, n])).values()];
    const ids = new Set(nodes.map((n) => n.id));
    const edges = [
      ...new Map(
        result.edges
          .filter((e) => ids.has(e.source) && ids.has(e.target))
          .map((e) => [e.id, e]),
      ).values(),
    ];
    const status: CodeStatus = {
      state: "ready",
      snapshotId,
      indexedAt: new Date().toISOString(),
      files: files.length,
      symbols: nodes.filter(
        (n) => !["file", "contract", "package"].includes(n.kind),
      ).length,
      edges: edges.length,
      partial: gaps.length > 0 || result.gaps.length > 0 || unsupported > 0,
      gaps: [
        ...new Set([
          ...gaps,
          ...result.gaps,
          ...(unsupported
            ? [
                `${unsupported} input(s) have no native extractor; use Graphify import for additional language coverage.`,
              ]
            : []),
        ]),
      ].slice(0, 100),
      changedFiles,
    };
    this.ledger.db.exec("BEGIN IMMEDIATE");
    try {
      this.ledger.db.exec(
        "DELETE FROM code_files; DELETE FROM code_nodes; DELETE FROM code_edges;",
      );
      const file = this.ledger.db.prepare(
          "INSERT INTO code_files VALUES (?,?,?)",
        ),
        node = this.ledger.db.prepare(
          "INSERT INTO code_nodes VALUES (?,?,?,?,?,?)",
        ),
        edge = this.ledger.db.prepare(
          "INSERT INTO code_edges VALUES (?,?,?,?,?)",
        );
      for (const f of files) file.run(f.path, f.hash, f.language);
      for (const n of nodes)
        node.run(
          n.id,
          n.path,
          n.label,
          n.qualifiedName,
          n.kind,
          JSON.stringify(n),
        );
      for (const e of edges)
        edge.run(e.id, e.source, e.target, e.kind, JSON.stringify(e));
      if (update)
        this.ledger.db
          .prepare(
            "INSERT INTO code_imports VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
          )
          .run(update.id, JSON.stringify(update.data));
      this.ledger.db
        .prepare(
          "INSERT INTO meta VALUES ('code.status',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .run(JSON.stringify(status));
      this.ledger.db
        .prepare(
          "INSERT INTO meta VALUES ('code.config',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .run(JSON.stringify(config));
      const groups = new Map<string, number>();
      for (const f of files) {
        const parts = f.path.split("/"),
          name =
            parts.length === 1
              ? "."
              : parts[0] === "src" && parts.length > 2
                ? parts.slice(0, 2).join("/")
                : parts[0];
        groups.set(name, (groups.get(name) ?? 0) + 1);
      }
      const orientation = {
        subsystems: [...groups]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, files]) => ({ name, files })),
        entryPoints: files
          .filter(
            (f) =>
              config.entryPoints.includes(f.path) ||
              /(^|\/)(main|index|app|extension|__main__)\.[^/]+$/.test(f.path),
          )
          .slice(0, 5)
          .map((f) => ({ path: f.path, line: 0 })),
      };
      this.ledger.db
        .prepare(
          "INSERT INTO meta VALUES ('code.orientation',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .run(JSON.stringify(orientation));
      this.ledger.db.exec("COMMIT");
    } catch (error) {
      this.ledger.db.exec("ROLLBACK");
      throw error;
    }
    this.ledger.onChange();
    return status;
  }
  private extract(files: CodeFile[]): Promise<CodeExtraction> {
    const worker = (this.worker ??= new Worker(
      join(dirname(this.workerPath), "codebase-worker.mjs"),
      {
        workerData: { root: this.ledger.root },
        resourceLimits: { maxOldGenerationSizeMb: 512 },
      },
    ));
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const clean = () => {
        clearTimeout(timer);
        worker.off("message", message);
        worker.off("error", fail);
        worker.off("exit", exited);
      };
      const fail = (error: Error) => {
        clean();
        this.worker = undefined;
        reject(error);
      };
      const exited = () =>
        fail(
          new ContextoryError(
            "ANALYSIS_INTERRUPTED",
            "Code index worker exited.",
          ),
        );
      const message = (m: {
        id: string;
        result: CodeExtraction;
        error?: string;
      }) => {
        if (m.id !== id) return;
        clean();
        if (m.error) reject(new ContextoryError("INDEX_FAILED", m.error));
        else resolve(m.result);
      };
      const timer = setTimeout(() => {
        fail(
          new ContextoryError(
            "INDEX_TIMEOUT",
            "Code index exceeded 45 seconds. Narrow project inputs.",
          ),
        );
        void worker.terminate();
      }, 45000);
      worker.on("message", message);
      worker.once("error", fail);
      worker.once("exit", exited);
      worker.postMessage({
        id,
        files,
        python: this.pythonExecutable,
        pythonScript: join(dirname(this.workerPath), "python-index.py"),
      });
    });
  }
  nodes(): CodeNode[] {
    return this.ledger.db
      .prepare("SELECT data FROM code_nodes ORDER BY path,id")
      .all()
      .map((r) => JSON.parse(String(r.data)));
  }
  edges(): CodeEdge[] {
    return this.ledger.db
      .prepare("SELECT data FROM code_edges ORDER BY id")
      .all()
      .map((r) => JSON.parse(String(r.data)));
  }
  async fresh() {
    await this.refresh();
    return this.status();
  }
  async close() {
    this.closed = true;
    this.generation++;
    clearTimeout(this.timer);
    const worker = this.worker;
    this.worker = undefined;
    await worker?.terminate();
    await this.building?.catch(() => {});
  }
}
