import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile, realpath } from "node:fs/promises";
import { join, relative, isAbsolute } from "node:path";
import { z } from "zod";
import { tools, type Input, type ToolName } from "../contracts/tools";
import {
  ContextoryError,
  type Actor,
  type Dashboard,
  type FlowGraph,
  type FlowInput,
  type Provider,
} from "../contracts/model";
import { Ledger, digest } from "../storage/ledger";
import { Workflow } from "../core/workflow";
import { renderReport } from "../core/report";
import { historyPage } from "../core/history";
import { AnalysisManager } from "../analysis/manager";
import { Knowledge, Embeddings } from "../knowledge/search";
import { CheckRunner } from "../verification/checks";
import {
  sourceSnapshot,
  workspaceFiles,
  workspacePath,
} from "../verification/workspace";
export class Application {
  readonly workflow: Workflow;
  readonly knowledge: Knowledge;
  readonly analysis: AnalysisManager;
  readonly checks: CheckRunner;
  editorTrace?: (input: FlowInput) => Promise<FlowGraph>;
  constructor(
    readonly ledger: Ledger,
    readonly storage: string,
    workerPath: string,
    embeddingDirectory: string,
  ) {
    this.workflow = new Workflow(ledger);
    this.knowledge = new Knowledge(ledger, new Embeddings(embeddingDirectory));
    this.analysis = new AnalysisManager(ledger.root, workerPath);
    this.checks = new CheckRunner(
      this.workflow,
      join(storage, "artifacts"),
      [],
    );
  }
  dashboard(): Dashboard {
    return {
      root: this.ledger.root,
      projectId: this.ledger.projectId,
      sequence: this.ledger.sequence(),
      entities: this.ledger.all(),
      events: historyPage(this.ledger, 3).events,
      recipes: this.checks.recipes,
      connections: (["codex", "claude", "bob"] as Provider[]).map(
        (provider) => ({
          provider,
          configured: this.ledger.meta(`configured:${provider}`) === "true",
          mcpSeen: this.ledger.meta(`mcp:${provider}`),
          hookSeen: this.ledger.meta(`hook:${provider}`),
          lastEvent: this.ledger.meta(`event:${provider}`),
        }),
      ),
      semantic: this.knowledge.embeddings.status(),
    };
  }
  brief(specId?: string) {
    const specs = this.ledger
      .all("spec")
      .filter((s) =>
        specId
          ? s.id === specId
          : !["completed", "cancelled"].includes(s.state),
      );
    return {
      root: this.ledger.root,
      projectId: this.ledger.projectId,
      sequence: this.ledger.sequence(),
      specs: specs.slice(0, 20),
      recipes: this.checks.recipes,
      requests: this.ledger
        .all("request")
        .filter((r) => !["completed", "cancelled"].includes(r.state)),
      workflow: [
        "Search earlier requests, changes and decisions with contextory_search; inspect relevant source with contextory_flow_trace/contextory_impact_get.",
        "Create the authorized request, milestones and specs; attach a session and claim a spec lease.",
        "Record findings/fixes and decisions; run configured contextory_check_run checks and read the job until finished.",
        "Submit contextory_outcome_submit with evidence for every criterion. Then call contextory_spec_change action=complete, id=specId, expectedRevision=the returned revision. Read the spec to confirm state=completed.",
        "If completion is blocked, fix or report the explicit blocker; do not silently leave finished work open. With no configured checks, use native editing to add the project's existing test/check command to contextory.checks in workspace settings, then reread context for recipes. If no meaningful check is available, explicitly report that verification is pending. Parent milestones and requests close automatically when all their work is complete.",
      ],
      note: "Keep chatting in the native agent. Search past decisions and trace affected source before changes. Submit an outcome, then explicitly mark the spec done with contextory_spec_change action=complete and the latest revision. Submission or stopping chat does not complete it. Completion requires current independently passing evidence and resolved blocking issues.",
    };
  }
  async call(name: string, raw: unknown, actor: Actor): Promise<unknown> {
    if (!(name in tools))
      throw new ContextoryError("UNKNOWN_TOOL", `Unknown tool: ${name}`);
    const key = name as ToolName;
    const parsed = tools[key].schema.safeParse(raw);
    if (!parsed.success)
      throw new ContextoryError(
        "INVALID_ARGUMENT",
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
          .slice(0, 2000),
      );
    const a = parsed.data;
    switch (key) {
      case "contextory_context_get":
        return this.brief((a as Input<typeof key>).specId);
      case "contextory_history_get": {
        const p = a as Input<typeof key>;
        return historyPage(this.ledger, p.limit, p.before, p.entityId);
      }
      case "contextory_entity_get": {
        const p = a as Input<typeof key>;
        if (/^ART-[\da-f-]{36}$/.test(p.id)) {
          const content = await readFile(
            join(this.storage, "artifacts", `${p.id}.json`),
            "utf8",
          );
          const start = p.offset * 400;
          return {
            artifactId: p.id,
            content: content.slice(start, start + p.limit * 400),
            offset: p.offset,
            nextOffset:
              start + p.limit * 400 < content.length
                ? p.offset + p.limit
                : null,
            totalCharacters: content.length,
            encoding: "JSON text in 400-character pages",
          };
        }
        return p.id.startsWith("JOB-")
          ? this.checks.job(p.id)
          : {
              entity: this.ledger.get(p.id, p.revision),
              children: this.ledger.list(p.id, p.limit, p.offset),
              offset: p.offset,
            };
      }
      case "contextory_request_change":
        return this.workflow.request(a as Input<typeof key>, actor);
      case "contextory_spec_change": {
        const p = a as Input<typeof key>;
        return this.workflow.spec(
          p,
          actor,
          p.action === "complete"
            ? await sourceSnapshot(this.ledger.root)
            : undefined,
        );
      }
      case "contextory_session_attach":
        return this.workflow.session(a as Input<typeof key>, actor);
      case "contextory_spec_lease":
        return this.workflow.lease(a as Input<typeof key>, actor);
      case "contextory_finding_record": {
        const p = a as Input<typeof key>;
        for (const source of p.sources)
          await workspacePath(this.ledger.root, source.path);
        return this.workflow.finding(p, actor);
      }
      case "contextory_decision_record": {
        const p = a as Input<typeof key>;
        for (const source of p.sources)
          await workspacePath(this.ledger.root, source.path);
        return this.workflow.decision(p, actor);
      }
      case "contextory_evidence_record":
        return this.workflow.evidence(
          a as Input<typeof key>,
          actor,
          await sourceSnapshot(this.ledger.root),
        );
      case "contextory_check_run":
        return this.checks.start(a as Input<typeof key>, actor);
      case "contextory_outcome_submit": {
        const spec = this.workflow.outcome(
          a as Input<typeof key>,
          actor,
          await sourceSnapshot(this.ledger.root),
        );
        return {
          ...spec,
          nextAction: {
            tool: "contextory_spec_change",
            arguments: {
              action: "complete",
              id: spec.id,
              expectedRevision: spec.revision,
            },
            instruction:
              "Use a new operationId and call this now to mark the spec done. If verification fails, resolve or report the blocker.",
          },
        };
      }
      case "contextory_search": {
        const p = a as Input<typeof key>;
        return this.knowledge.search(p.query, p.mode, p.limit);
      }
      case "contextory_relationship_change": {
        const p = a as Input<typeof key>;
        this.ledger.get(p.from);
        if (p.to) this.ledger.get(p.to);
        if (!p.to && !p.source)
          throw new ContextoryError(
            "INVALID_ARGUMENT",
            "Supply a target record or source reference.",
          );
        if (p.source) await workspacePath(this.ledger.root, p.source.path);
        return this.ledger.transaction(p.operationId, actor, key, p, () => {
          const target =
            p.to ??
            `source:${p.source!.path}${p.source!.symbol ? `#${p.source!.symbol}` : ""}`;
          const id = this.ledger.edge(p.from, target, p.kind, p.rationale);
          this.ledger.audit("relationship.added", p.from, actor, {
            target,
            kind: p.kind,
          });
          return { id };
        });
      }
      case "contextory_impact_get": {
        const p = a as Input<typeof key>;
        return this.knowledge.impact(p.id, p.direction, p.depth, p.limit);
      }
      case "contextory_flow_trace": {
        const input: FlowInput = a as Input<typeof key>;
        if (actor.human && raw && typeof raw === "object" && "overlays" in raw)
          input.overlays = z
            .record(z.string().max(2000), z.string().max(524288))
            .parse(raw.overlays);
        return this.trace(input);
      }
      case "contextory_flow_expand": {
        const p = a as Input<typeof key>;
        const stored = this.analysis.graphs.get(p.graphId);
        if (!stored || stored.graph.snapshotId !== p.snapshotId)
          throw new ContextoryError(
            "STALE_GRAPH",
            "Graph was evicted or its snapshot differs. Trace from the current source again.",
          );
        if (!p.nodeId)
          return {
            ...stored.graph,
            nodes: stored.graph.nodes.slice(p.offset, p.offset + p.limit),
            offset: p.offset,
            totalNodes: stored.graph.nodes.length,
          };
        const node = stored.graph.nodes.find((n) => n.id === p.nodeId);
        if (!node?.source)
          throw new ContextoryError(
            "INVALID_FRONTIER",
            "Choose a graph node with a source location.",
          );
        const current = await this.trace(stored.input);
        if (current.snapshotId !== p.snapshotId)
          throw new ContextoryError(
            "STALE_GRAPH",
            "Source changed. Refresh before expanding.",
          );
        return this.trace({
          ...stored.input,
          root: stored.graph.frontier.find((f) => f.nodeId === p.nodeId)
            ?.target ?? {
            path: node.source.path,
            position: {
              line: node.source.line ?? 0,
              character: node.source.character ?? 0,
            },
            start: "function",
          },
          limits: p.limits ?? stored.input.limits,
        });
      }
      case "contextory_report_export": {
        const p = a as Input<typeof key>;
        const content = renderReport(this.ledger, p.format, p.requestId);
        const artifact = `report-${randomUUID()}.${p.format === "json" ? "json" : "md"}`;
        const artifactId = `ART-${randomUUID()}`;
        await mkdir(join(this.storage, "artifacts"), { recursive: true });
        await writeFile(
          join(this.storage, "artifacts", artifact),
          content,
          "utf8",
        );
        await writeFile(
          join(this.storage, "artifacts", `${artifactId}.json`),
          JSON.stringify({
            format: p.format,
            content,
            sequence: this.ledger.sequence(),
          }),
          "utf8",
        );
        return {
          artifact,
          artifactId,
          content: content.slice(0, 12000),
          truncated: content.length > 12000,
          sequence: this.ledger.sequence(),
        };
      }
    }
  }
  async trace(input: FlowInput) {
    const generation = this.analysis.generation;
    const current = () => {
      if (generation !== this.analysis.generation)
        throw new ContextoryError("CANCELLED", "Source analysis was cancelled.");
    };
    await workspacePath(this.ledger.root, input.root.path);
    current();
    if (
      !/\.py$/i.test(input.root.path) &&
      (input.view === "calls" || input.direction === "incoming")
    ) {
      try {
        if (this.editorTrace) {
          const graph = await this.editorTrace(input);
          current();
          this.analysis.remember(graph, input);
          return graph;
        }
      } catch (error) {
        current();
        if (
          !/\.[cm]?[jt]sx?$/.test(input.root.path) ||
          input.direction === "incoming"
        )
          throw error;
      }
    }
    return this.analysis.trace(input);
  }
  async hook(provider: Provider, raw: unknown) {
    const event = z
      .object({
        id: z.string().max(200),
        event: z.string().max(100),
        nativeSession: z.string().max(200),
        cwd: z.string().max(4000),
        tool: z.string().max(200).optional(),
      })
      .parse(raw);
    if (!isAbsolute(event.cwd))
      throw new ContextoryError(
        "WRONG_WORKSPACE",
        "Hook cwd must identify this workspace.",
      );
    const cwd = relative(this.ledger.root, await realpath(event.cwd));
    if (cwd.startsWith("..") || isAbsolute(cwd))
      throw new ContextoryError(
        "WRONG_WORKSPACE",
        "Hook cwd belongs to a different workspace.",
      );
    if (event.tool?.includes("contextory_")) return this.brief();
    const now = new Date().toISOString();
    const result = this.ledger.db
      .prepare("INSERT OR IGNORE INTO hooks VALUES (?,?,?,?,?)")
      .run(event.id, provider, event.nativeSession, event.event, now);
    if (result.changes) {
      this.seen(`hook:${provider}`, now);
      this.seen(`event:${provider}`, event.event);
      this.ledger.audit(
        `native.${event.event}`,
        provider,
        { id: provider, provider, human: false },
        { session: event.nativeSession, tool: event.tool },
      );
      this.ledger.onChange();
    }
    return this.brief();
  }
  seen(key: string, value = new Date().toISOString()) {
    this.ledger.db
      .prepare(
        "INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(key, value);
  }
  async indexSources() {
    const files = (await workspaceFiles(this.ledger.root, 100000)).filter(
      (path) =>
        /\.(?:[cm]?[jt]sx?|py|rs|go|java|cs|md|json|ya?ml)$/.test(path) &&
        !/(^|[\\/])(?:\.env|secrets?|credentials)([.\\/]|$)/i.test(path),
    );
    const keep = new Set<string>();
    let chunks = 0;
    for (const path of files) {
      if (chunks >= 10000) break;
      const resolved = await workspacePath(this.ledger.root, path).catch(
        () => undefined,
      );
      if (!resolved) continue;
      const text = await readFile(resolved, "utf8");
      if (text.length > 512 * 1024 || text.includes("\0")) continue;
      const lines = text.split("\n");
      const fileHash = digest(text);
      for (let line = 0; line < lines.length && chunks < 10000; line += 30) {
        const id = `source:${path}:${line}`;
        const body = lines
          .slice(line, line + 30)
          .join("\n")
          .slice(0, Math.min(8000, (10000 - chunks) * 900));
        for (const key of this.ledger.index(id, path, {
          text: body,
          hash: digest(body),
          fileHash,
          source: { path, line },
        })) {
          keep.add(key);
          chunks++;
        }
      }
    }
    for (const row of this.ledger.db
      .prepare("SELECT id FROM search WHERE id LIKE 'source:%'")
      .all())
      if (!keep.has(String(row.id)))
        this.ledger.db
          .prepare("DELETE FROM search WHERE id=?")
          .run(String(row.id));
    return { files: files.length, chunks, partial: chunks >= 10000 };
  }
  async close() {
    await this.checks.close();
    await this.analysis.close();
    await this.knowledge.embeddings.close();
    this.ledger.close();
  }
}
