import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile, realpath } from "node:fs/promises";
import { join, relative, isAbsolute } from "node:path";
import { z } from "zod";
import {
  tools,
  scopedCodeTools,
  type Input,
  type ToolName,
} from "../contracts/tools";
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
import { recordUsage, usageSummary } from "../core/usage";
import { hookObservation } from "../contracts/usage";
import { AnalysisManager } from "../analysis/manager";
import { Knowledge, Embeddings } from "../knowledge/search";
import { CheckRunner } from "../verification/checks";
import { CodebaseIndex } from "../codebase/index";
import { CodeQueries } from "../codebase/queries";
import { importGraphify } from "../codebase/import";
import { ReferenceCodebases } from "../codebase/references";
import { clients, clientIds } from "../providers/clients";
import {
  completionNote,
  retrievalGuidance,
  retrievalReminder,
  workflowGuidance,
} from "../agents/instructions";
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
  readonly codebase: CodebaseIndex;
  readonly codeQueries: CodeQueries;
  readonly references: ReferenceCodebases;
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
    this.codebase = new CodebaseIndex(ledger, workerPath);
    this.codeQueries = new CodeQueries(this.codebase, this.knowledge);
    this.references = new ReferenceCodebases(
      ledger,
      storage,
      workerPath,
      this.knowledge.embeddings,
    );
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
      connections: clientIds
        .filter(
          (id) =>
            id !== "generic" ||
            this.ledger.meta("configured:generic") === "true" ||
            this.ledger.meta("mcp:generic"),
        )
        .map((provider) => ({
          provider,
          configured: this.ledger.meta(`configured:${provider}`) === "true",
          mcpSeen: this.ledger.meta(`mcp:${provider}`),
          hookSeen: this.ledger.meta(`hook:${provider}`),
          lastEvent: this.ledger.meta(`event:${provider}`),
        })),
      semantic: this.knowledge.embeddings.status(),
      codebase: this.codebase.status(),
      references: this.references.list(),
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
      codebase: this.codebase.status(),
      references: this.references.list(),
      requests: this.ledger
        .all("request")
        .filter((r) => !["completed", "cancelled"].includes(r.state)),
      retrieval: retrievalGuidance,
      workflow: workflowGuidance,
      note: `${retrievalReminder} ${completionNote}`,
      clients: clientIds.map((id) => ({
        id,
        label: clients[id].label,
        hooks: Boolean(clients[id].hooksPath),
        contextFormat: clients[id].contextFormat,
      })),
      architecture: this.codebase.status().snapshotId
        ? {
            ...JSON.parse(this.ledger.meta("code.orientation") ?? "{}"),
            contextTool: "contextory_code_context_get",
          }
        : {
            contextTool: "contextory_code_context_get",
            detail:
              "The local code graph is prepared in the background or on the first code query.",
          },
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
    if (
      raw &&
      typeof raw === "object" &&
      "codebaseId" in raw &&
      !scopedCodeTools.includes(key) &&
      key !== "contextory_codebase_change"
    )
      throw new ContextoryError(
        "INVALID_ARGUMENT",
        "codebaseId scopes source analysis only; workflow records always belong to the current project.",
      );
    const codebaseId = (a as { codebaseId?: string }).codebaseId;
    if (
      codebaseId &&
      codebaseId !== "current" &&
      scopedCodeTools.includes(key)
    ) {
      return this.references.use(
        codebaseId,
        this.codebase.pythonExecutable,
        async (runtime, info) => {
          let result: object;
          switch (key) {
            case "contextory_search": {
              const p = a as Input<typeof key>;
              result = await runtime.queries.search(p.query, p.mode, p.limit);
              break;
            }
            case "contextory_code_context_get": {
              const p = a as Input<typeof key>;
              if (p.specId)
                throw new ContextoryError(
                  "INVALID_ARGUMENT",
                  "Reference analysis cannot use current-project specifications.",
                );
              return runtime.queries.context(
                p.query,
                p.paths,
                undefined,
                p.budgetTokens,
              );
            }
            case "contextory_code_architecture_get": {
              if ((a as Input<typeof key>).refresh) await runtime.index.fresh();
              result = runtime.queries.architecture();
              break;
            }
            case "contextory_code_path_get": {
              const p = a as Input<typeof key>;
              result = await runtime.queries.path(
                p.from,
                p.to,
                p.direction,
                p.maxDepth,
              );
              break;
            }
            case "contextory_code_index_refresh": {
              const p = a as Input<typeof key>;
              result = p.graphifyPath
                ? await importGraphify(runtime.index, p.graphifyPath)
                : await runtime.index.refresh();
              break;
            }
            case "contextory_impact_get": {
              const p = a as Input<typeof key>;
              result = await runtime.queries.impact(
                p.id,
                p.direction,
                p.depth,
                p.limit,
              );
              break;
            }
            case "contextory_flow_trace": {
              const input = a as Input<typeof key>;
              await workspacePath(info.root, input.root.path);
              result = await runtime.analysis.trace(input);
              break;
            }
            case "contextory_flow_expand":
              result = await this.expand(
                a as Input<typeof key>,
                runtime.analysis,
                async (input) => {
                  await workspacePath(info.root, input.root.path);
                  return runtime.analysis.trace(input);
                },
              );
              break;
            default:
              throw new ContextoryError(
                "UNKNOWN_TOOL",
                "Unsupported reference analysis.",
              );
          }
          return { ...result, codebase: info };
        },
      );
    }
    switch (key) {
      case "contextory_codebase_list":
        return {
          current: {
            id: "current",
            name: this.ledger.root.split(/[\\/]/).pop(),
            root: this.ledger.root,
            role: "current",
          },
          references: this.references.list(),
        };
      case "contextory_codebase_change": {
        const p = a as Input<typeof key>;
        return p.action === "add"
          ? this.references.add({ ...p, root: p.root! }, actor)
          : this.references.remove({ ...p, codebaseId: p.codebaseId! }, actor);
      }
      case "contextory_context_get":
        return this.brief((a as Input<typeof key>).specId);
      case "contextory_history_get": {
        const p = a as Input<typeof key>;
        return historyPage(this.ledger, p.limit, p.before, p.entityId);
      }
      case "contextory_usage_get":
        return usageSummary(this.ledger, a as Input<typeof key>);
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
        return this.codeQueries.search(p.query, p.mode, p.limit);
      }
      case "contextory_code_context_get": {
        const p = a as Input<typeof key>;
        return this.codeQueries.context(
          p.query,
          p.paths,
          p.specId,
          p.budgetTokens,
        );
      }
      case "contextory_code_architecture_get": {
        const p = a as Input<typeof key>;
        if (p.refresh) await this.codebase.fresh();
        return this.codeQueries.architecture();
      }
      case "contextory_code_path_get": {
        const p = a as Input<typeof key>;
        return this.codeQueries.path(p.from, p.to, p.direction, p.maxDepth);
      }
      case "contextory_code_index_refresh": {
        const p = a as Input<typeof key>;
        return p.graphifyPath
          ? importGraphify(this.codebase, p.graphifyPath)
          : this.codebase.refresh();
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
        return this.codeQueries.impact(p.id, p.direction, p.depth, p.limit);
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
        return this.expand(p, this.analysis, (input) => this.trace(input));
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
  private async expand(
    p: Input<"contextory_flow_expand">,
    analysis: AnalysisManager,
    trace: (input: FlowInput) => Promise<FlowGraph>,
  ) {
    const stored = analysis.graphs.get(p.graphId);
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
    const current = await trace(stored.input);
    if (current.snapshotId !== p.snapshotId)
      throw new ContextoryError(
        "STALE_GRAPH",
        "Source changed. Refresh before expanding.",
      );
    return trace({
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
  async trace(input: FlowInput) {
    const generation = this.analysis.generation;
    const current = () => {
      if (generation !== this.analysis.generation)
        throw new ContextoryError(
          "CANCELLED",
          "Source analysis was cancelled.",
        );
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
  async resolveSource(path: string, codebaseId?: string) {
    if (!codebaseId || codebaseId === "current")
      return workspacePath(this.ledger.root, path);
    return this.references.use(
      codebaseId,
      this.codebase.pythonExecutable,
      async (_runtime, info) => workspacePath(info.root, path),
    );
  }
  async cancelReferenceAnalysis(codebaseId: string) {
    return this.references.use(
      codebaseId,
      this.codebase.pythonExecutable,
      async (runtime) => {
        await runtime.analysis.close();
        return { cancelled: true };
      },
    );
  }
  async hook(provider: Provider, raw: unknown) {
    const event = hookObservation.parse(raw);
    const response = () =>
      ["SessionStart", "UserPromptSubmit", "PostCompact"].includes(event.event)
        ? this.brief()
        : { observed: true };
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
    if (event.tool?.includes("contextory_")) return response();
    const now = new Date().toISOString();
    this.ledger.db.exec("BEGIN IMMEDIATE");
    let changed = false;
    try {
      const result = this.ledger.db
        .prepare("INSERT OR IGNORE INTO hooks VALUES (?,?,?,?,?)")
        .run(
          `${provider}:${event.id}`,
          provider,
          event.nativeSession,
          event.event,
          now,
        );
      changed = Boolean(result.changes);
      if (changed) {
        recordUsage(this.ledger, provider, event, now);
        this.seen(`hook:${provider}`, now);
        this.seen(`event:${provider}`, event.event);
        // Per-request telemetry stays in its own indexed records, so it does not
        // displace meaningful project activity in the Overview or history.
        if (event.event !== "PostModelRequest")
          this.ledger.audit(
            `native.${event.event}`,
            provider,
            { id: provider, provider, human: false },
            {
              session: event.nativeSession,
              tool: event.tool,
              model: event.model,
            },
          );
      }
      this.ledger.db.exec("COMMIT");
    } catch (error) {
      this.ledger.db.exec("ROLLBACK");
      throw error;
    }
    if (changed) this.ledger.onChange();
    return response();
  }
  seen(key: string, value = new Date().toISOString()) {
    this.ledger.db
      .prepare(
        "INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(key, value);
  }
  async indexSources() {
    const codebase = await this.codebase.refresh();
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
    return { files: files.length, chunks, partial: chunks >= 10000, codebase };
  }
  async close() {
    await this.references.close();
    await this.codebase.close();
    await this.checks.close();
    await this.analysis.close();
    await this.knowledge.embeddings.close();
    this.ledger.close();
  }
}
