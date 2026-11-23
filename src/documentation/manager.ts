import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, realpath, mkdir, writeFile, stat } from "node:fs/promises";
import { join, relative, isAbsolute } from "node:path";
import type { Actor } from "../contracts/model";
import { ContextoryError } from "../contracts/model";
import type { Input } from "../contracts/tools";
import type { Workflow } from "../core/workflow";
import { digest } from "../storage/ledger";
import {
  DocumentationReader,
  recordFingerprint,
  type DocumentationLink,
} from "./reader";

/** PT-BR: Sirva recursos incluídos e execute jobs delimitados fora da inicialização.
 * EN: Serve bundled resources and execute bounded jobs outside startup. */
export class DocumentationManager {
  readonly reader: DocumentationReader;
  private children = new Set<ChildProcess>();
  private active = new Set<string>();
  private closing = false;
  private stop(child: ChildProcess) {
    if (process.platform === "win32" && child.pid) {
      const killer = spawn(
        "taskkill.exe",
        ["/pid", String(child.pid), "/T", "/F"],
        { windowsHide: true, stdio: "ignore" },
      );
      killer.once("error", () => child.kill());
    } else child.kill();
  }
  constructor(
    private workflow: Workflow,
    readonly bundle: string,
    private storage: string,
  ) {
    this.reader = new DocumentationReader(workflow.ledger);
  }
  async get(p: Input<"contextory_docs_get">) {
    if (p.section === "job") {
      const row = this.workflow.ledger.db
        .prepare("SELECT state,data FROM jobs WHERE id=?")
        .get(p.jobId ?? "");
      if (!row)
        throw new ContextoryError(
          "NOT_FOUND",
          "Documentation job was not found.",
        );
      const data = JSON.parse(String(row.data));
      if (data.type !== "documentation")
        throw new ContextoryError(
          "INVALID_ARGUMENT",
          "Choose a documentation job.",
        );
      return { state: String(row.state), data };
    }
    if (p.section === "guidance") {
      const manifest = JSON.parse(
        await readFile(join(this.bundle, "PROVENANCE.json"), "utf8"),
      );
      const resources = Object.keys(manifest.files).filter(
        (path) =>
          /\.(md|css|json|py|html|js|jsx|tsx?)$/.test(path) &&
          (!p.query || path.toLowerCase().includes(p.query.toLowerCase())),
      );
      if (!p.resource)
        return {
          provenance: {
            origin: manifest.origin,
            revision: manifest.revision,
            softwareDocumentation: manifest.softwareDocumentation,
            carbonDesign: manifest.carbonDesign,
          },
          resources: resources.slice(p.offset, p.offset + p.limit),
          total: resources.length,
          nextOffset:
            p.offset + p.limit < resources.length ? p.offset + p.limit : null,
        };
      if (
        !Object.hasOwn(manifest.files, p.resource) ||
        !/\.(md|css|json|py|html|js|jsx|tsx?)$/.test(p.resource)
      )
        throw new ContextoryError(
          "INVALID_PATH",
          "Choose a bundled text resource from the guidance listing.",
        );
      const base = await realpath(this.bundle),
        path = await realpath(join(base, p.resource)),
        rel = relative(base, path);
      if (rel.startsWith("..") || isAbsolute(rel))
        throw new ContextoryError(
          "INVALID_PATH",
          "Resource escaped the bundle.",
        );
      if ((await stat(path)).size > 2 * 1024 * 1024)
        throw new ContextoryError(
          "DOCS_LIMIT",
          "Resource exceeds the read limit.",
        );
      const text = await readFile(path, "utf8"),
        start = p.offset * 400,
        end = start + p.limit * 400;
      return {
        resource: p.resource,
        sha256: manifest.files[p.resource],
        text: text.slice(start, end),
        offset: p.offset,
        nextOffset: end < text.length ? p.offset + p.limit : null,
        note: "Offsets count 400-character units. Upstream guides are included unchanged; use Contextory's docs_run names and project scope rather than installing another plugin.",
      };
    }
    return this.reader.get(p);
  }
  /** PT-BR: Preserve associações anteriores na auditoria sem aprovar conteúdo.
   * EN: Retain prior associations in the audit without approving content. */
  async link(p: Input<"contextory_docs_link">, actor: Actor) {
    const receipt = this.workflow.ledger.db
      .prepare("SELECT signature,result FROM operations WHERE id=?")
      .get(p.operationId);
    if (receipt) {
      if (
        receipt.signature !==
        digest({ actor: actor.id, method: "docs.link", args: p })
      )
        throw new ContextoryError(
          "OPERATION_CONFLICT",
          "operationId was already used with different input or actor.",
        );
      return JSON.parse(String(receipt.result));
    }
    this.workflow.assertLease(p.specId, p.leaseId, actor);
    const captured = await this.reader.capture(p.pageId, p.sectionId);
    if (captured.corpusFingerprint !== p.corpusFingerprint)
      throw new ContextoryError(
        "REVISION_CONFLICT",
        "Documentation changed. Read the current section and fingerprint again.",
      );
    for (const id of p.recordIds) this.workflow.ledger.get(id);
    return this.workflow.ledger.transaction(
      p.operationId,
      actor,
      "docs.link",
      p,
      () => {
        this.workflow.assertLease(p.specId, p.leaseId, actor);
        const ledger = this.workflow.ledger,
          links = this.reader.links(),
          key = `${p.pageId}#${p.sectionId}`;
        const before = links[key];
        const link: DocumentationLink = {
          ...captured,
          pageId: p.pageId,
          sectionId: p.sectionId,
          recordIds: [...new Set(p.recordIds)],
          recordRevisions: Object.fromEntries(
            p.recordIds.map((id) => [id, ledger.get(id).revision]),
          ),
          recordFingerprints: Object.fromEntries(
            p.recordIds.map((id) => [id, recordFingerprint(ledger.get(id))]),
          ),
          reason: p.reason,
          actor: actor.id,
          time: new Date().toISOString(),
        };
        links[key] = link;
        ledger.db
          .prepare("INSERT OR REPLACE INTO meta VALUES (?,?)")
          .run("docs.links", JSON.stringify(links));
        ledger.db
          .prepare("DELETE FROM edges WHERE source=? AND kind='explains'")
          .run(`docs:${key}`);
        for (const id of link.recordIds)
          ledger.edge(
            `docs:${key}`,
            id,
            "explains",
            "Observed documentation association: " + p.reason,
          );
        ledger.audit("documentation.linked", p.specId, actor, {
          key,
          before,
          after: link,
        });
        return link;
      },
    );
  }
  /** PT-BR: Persista o job antes de executar; repetições exatas recuperam o recibo.
   * EN: Persist a job before execution; exact retries recover its receipt. */
  run(p: Input<"contextory_docs_run">, actor: Actor, executable: string) {
    const writes =
      ["init", "build", "integrations", "pages_publish"].includes(p.action) ||
      (["migrate", "readme"].includes(p.action) && p.apply);
    if (writes && (!p.specId || !p.leaseId))
      throw new ContextoryError(
        "LEASE_REQUIRED",
        "Documentation writes require a current specification lease.",
      );
    if (p.action === "pages_publish" && !p.publish)
      throw new ContextoryError(
        "PUBLICATION_REQUIRED",
        "Publication requires explicit user authorization and publish=true after reviewing pages_plan.",
      );
    const args: Record<string, unknown> = {};
    if (p.action === "init") {
      if (!p.name || !p.kind)
        throw new ContextoryError(
          "INVALID_ARGUMENT",
          "Documentation init requires name and kind.",
        );
      Object.assign(args, { name: p.name, kind: p.kind });
      if (p.sourceRoots) args.sourceRoots = p.sourceRoots;
    }
    if (p.action === "map")
      Object.assign(args, { offset: p.offset, limit: p.limit });
    if (p.action === "migrate") args.apply = p.apply;
    if (p.action === "readme") {
      if (!p.siteUrl)
        throw new ContextoryError(
          "INVALID_ARGUMENT",
          "README links require siteUrl.",
        );
      Object.assign(args, { siteUrl: p.siteUrl, apply: p.apply });
    }
    if (p.action.startsWith("pages_") && p.remote) args.remote = p.remote;
    const ledger = this.workflow.ledger;
    const result = ledger.transaction(
      p.operationId,
      actor,
      "docs.run",
      p,
      () => {
        if (writes) this.workflow.assertLease(p.specId!, p.leaseId!, actor);
        if (this.active.size)
          throw new ContextoryError(
            "DOCS_BUSY",
            "A documentation operation is already running. Poll it before starting another.",
          );
        const jobId = `JOB-${randomUUID()}`;
        ledger.db.prepare("INSERT INTO jobs VALUES (?,?,?)").run(
          jobId,
          "queued",
          JSON.stringify({
            type: "documentation",
            action: p.action,
            specId: p.specId,
            startedAt: new Date().toISOString(),
          }),
        );
        ledger.audit(
          "documentation.queued",
          p.specId ?? ledger.projectId,
          actor,
          { jobId, action: p.action },
        );
        return { jobId, state: "queued" };
      },
    );
    const row = ledger.db
      .prepare("SELECT state FROM jobs WHERE id=?")
      .get(result.jobId);
    if (row?.state === "queued" && !this.active.has(result.jobId)) {
      this.active.add(result.jobId);
      ledger.db
        .prepare("UPDATE jobs SET state='running' WHERE id=?")
        .run(result.jobId);
      void this.execute(result.jobId, p, actor, executable, args).finally(() =>
        this.active.delete(result.jobId),
      );
    }
    return {
      ...result,
      state: String(
        ledger.db.prepare("SELECT state FROM jobs WHERE id=?").get(result.jobId)
          ?.state,
      ),
    };
  }
  private async execute(
    jobId: string,
    p: Input<"contextory_docs_run">,
    actor: Actor,
    executable: string,
    args: Record<string, unknown>,
  ) {
    const ledger = this.workflow.ledger;
    let state = "passed",
      data: Record<string, unknown> = {
        type: "documentation",
        action: p.action,
        specId: p.specId,
      };
    try {
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn(
          executable,
          ["-I", "-B", "-X", "utf8", join(this.bundle, "bridge.py")],
          {
            cwd: ledger.root,
            windowsHide: true,
            shell: false,
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
        this.children.add(child);
        let stdout = "",
          stderr = "",
          failure: Error | undefined;
        const timer = setTimeout(() => {
          failure = new Error(
            "Documentation operation exceeded five minutes; inspect its artifacts before retrying.",
          );
          this.stop(child);
        }, 300000);
        child.stdout!.setEncoding("utf8");
        child.stderr!.setEncoding("utf8");
        child.stdout!.on("data", (chunk) => {
          stdout += chunk;
          if (stdout.length > 4 * 1024 * 1024) {
            failure = new Error(
              "Documentation result exceeded 4 MiB; narrow map pagination.",
            );
            this.stop(child);
          }
        });
        child.stderr!.on("data", (chunk) => {
          stderr = (stderr + chunk).slice(-4000);
        });
        child.stdin!.on("error", () => {});
        child.once("error", () => {
          failure = new Error(
            "Python 3.11+ is required only for documentation operations. Set contextory.pythonExecutable to its executable path.",
          );
        });
        child.once("close", (code) => {
          clearTimeout(timer);
          this.children.delete(child);
          if (failure) reject(failure);
          else if (code !== 0) {
            let message = stdout || stderr || "Documentation runtime failed.";
            try {
              message = JSON.parse(stdout).error ?? message;
            } catch {}
            reject(new Error(message));
          } else resolve(stdout);
        });
        child.stdin!.end(
          JSON.stringify({
            workspace: ledger.root,
            tool: `docs_${p.action}`,
            arguments: args,
          }),
        );
      });
      const value = JSON.parse(output);
      if (value.error) throw new Error(value.error);
      const artifact = `${jobId}.json`;
      await mkdir(join(this.storage, "artifacts"), { recursive: true });
      await writeFile(
        join(this.storage, "artifacts", artifact),
        JSON.stringify(value.result, null, 2),
        "utf8",
      );
      data = {
        ...data,
        artifact,
        result: output.length < 48000 ? value.result : undefined,
        excerpt: output.length >= 48000 ? output.slice(0, 4000) : undefined,
      };
    } catch (error) {
      state = this.closing ? "interrupted" : "failed";
      data.error = error instanceof Error ? error.message : String(error);
    }
    try {
      ledger.db
        .prepare("UPDATE jobs SET state=?,data=? WHERE id=?")
        .run(
          state,
          JSON.stringify({ ...data, finishedAt: new Date().toISOString() }),
          jobId,
        );
      ledger.audit(
        `documentation.${state}`,
        p.specId ?? ledger.projectId,
        actor,
        { jobId, action: p.action },
      );
      ledger.onChange();
    } catch {
      /* Shutdown retains the durable running job as interrupted on reopen. */
    }
  }
  async close() {
    this.closing = true;
    for (const child of this.children) this.stop(child);
    while (this.active.size)
      await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
