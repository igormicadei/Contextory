import { realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative } from "node:path";
import { randomUUID } from "node:crypto";
import {
  ContextoryError,
  type Actor,
  type CodebaseInfo,
} from "../contracts/model";
import { Ledger } from "../storage/ledger";
import { AnalysisManager } from "../analysis/manager";
import { Knowledge, Embeddings } from "../knowledge/search";
import { CodebaseIndex } from "./index";
import { CodeQueries } from "./queries";

type Reference = CodebaseInfo & { addedAt: string };
type Runtime = {
  ledger: Ledger;
  index: CodebaseIndex;
  queries: CodeQueries;
  analysis: AnalysisManager;
};
const pathKey = (path: string) =>
  process.platform === "win32" ? path.toLowerCase() : path;
const contains = (parent: string, child: string) => {
  const path = relative(pathKey(parent), pathKey(child));
  return (
    !path ||
    (path !== ".." &&
      !path.startsWith("../") &&
      !path.startsWith("..\\") &&
      !isAbsolute(path))
  );
};

// Only this registry lives in the active ledger. Reference projections have no
// workflow service, checks, client configuration or access to active memory.
export class ReferenceCodebases {
  private runtimes = new Map<string, Runtime>();
  private pending = new Map<string, Set<Promise<unknown>>>();
  private closed = false;
  constructor(
    private owner: Ledger,
    private storage: string,
    private workerPath: string,
    private embeddings: Embeddings,
  ) {}
  list(): Reference[] {
    return JSON.parse(this.owner.meta("code.references") ?? "[]");
  }
  private save(references: Reference[]) {
    this.owner.db
      .prepare(
        "INSERT INTO meta VALUES ('code.references',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(JSON.stringify(references));
  }
  async add(
    input: { root: string; name?: string; operationId: string },
    actor: Actor,
  ) {
    if (!isAbsolute(input.root))
      throw new ContextoryError(
        "INVALID_REFERENCE_ROOT",
        "Choose an absolute local directory.",
      );
    let root: string;
    try {
      root = await realpath(input.root);
      if (!(await stat(root)).isDirectory()) throw new Error("not a directory");
    } catch {
      throw new ContextoryError(
        "INVALID_REFERENCE_ROOT",
        "Reference directory is missing or unreadable.",
      );
    }
    const storage = await realpath(this.storage);
    if (
      contains(root, this.owner.root) ||
      contains(this.owner.root, root) ||
      contains(root, storage) ||
      contains(storage, root)
    )
      throw new ContextoryError(
        "INVALID_REFERENCE_ROOT",
        "Reference directories must be separate from the current workspace and service storage.",
      );
    return this.owner.transaction(
      input.operationId,
      actor,
      "codebase.add",
      input,
      () => {
        const references = this.list();
        const existing = references.find(
          (r) => pathKey(r.root) === pathKey(root),
        );
        if (existing) return existing;
        if (references.length >= 8)
          throw new ContextoryError(
            "REFERENCE_LIMIT",
            "Detach a reference before adding more than eight codebases.",
          );
        const reference: Reference = {
          id: `ref-${randomUUID()}`,
          name: input.name ?? basename(root).slice(0, 100),
          root,
          role: "reference",
          addedAt: new Date().toISOString(),
        };
        this.save([...references, reference]);
        return reference;
      },
    );
  }
  async remove(
    input: { codebaseId: string; operationId: string },
    actor: Actor,
  ) {
    const result = this.owner.transaction(
      input.operationId,
      actor,
      "codebase.remove",
      input,
      () => {
        const references = this.list();
        if (!references.some((r) => r.id === input.codebaseId))
          throw new ContextoryError(
            "NOT_FOUND",
            "Reference codebase was not found.",
          );
        this.save(references.filter((r) => r.id !== input.codebaseId));
        return { removed: input.codebaseId };
      },
    );
    // Let already accepted queries finish before closing their SQLite connection.
    await Promise.allSettled([...(this.pending.get(input.codebaseId) ?? [])]);
    await this.closeRuntime(input.codebaseId);
    return result;
  }
  async use<T>(
    id: string,
    python: string,
    query: (runtime: Runtime, info: CodebaseInfo) => Promise<T>,
  ): Promise<T> {
    if (this.closed)
      throw new ContextoryError("CANCELLED", "Reference analysis is closed.");
    const info = this.list().find((r) => r.id === id);
    if (!info)
      throw new ContextoryError(
        "NOT_FOUND",
        "Unknown reference codebaseId. List codebases before querying.",
      );
    const work = (async () => {
      // Recheck aliases on every access rather than following a retargeted link
      // into a different repository with a previously approved identity.
      const root = await realpath(info.root).catch(() => "");
      if (pathKey(root) !== pathKey(info.root))
        throw new ContextoryError(
          "REFERENCE_UNAVAILABLE",
          "Reference root moved or is unavailable. Detach and add its current location.",
        );
      let runtime = this.runtimes.get(id);
      if (!runtime) {
        const ledger = new Ledger(
          join(this.storage, "references", id, "projection.sqlite3"),
          root,
        );
        const index = new CodebaseIndex(ledger, this.workerPath);
        runtime = {
          ledger,
          index,
          queries: new CodeQueries(
            index,
            new Knowledge(ledger, this.embeddings),
            info,
          ),
          analysis: new AnalysisManager(root, this.workerPath),
        };
        this.runtimes.set(id, runtime);
      }
      runtime.index.pythonExecutable = python;
      runtime.analysis.python.executable = python;
      return query(runtime, info);
    })();
    const pending = this.pending.get(id) ?? new Set<Promise<unknown>>();
    this.pending.set(id, pending);
    pending.add(work);
    try {
      return await work;
    } finally {
      pending.delete(work);
      if (!pending.size) this.pending.delete(id);
    }
  }
  private async closeRuntime(id: string) {
    const runtime = this.runtimes.get(id);
    this.runtimes.delete(id);
    if (!runtime) return;
    await runtime.index.close();
    await runtime.analysis.close();
    runtime.ledger.close();
  }
  async close() {
    this.closed = true;
    await Promise.allSettled([...this.pending.values()].flatMap((p) => [...p]));
    await Promise.all(
      [...this.runtimes.keys()].map((id) => this.closeRuntime(id)),
    );
  }
}
