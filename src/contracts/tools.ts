import { z } from "zod";
const id = z.string().min(1).max(160);
const text = z.string().min(1).max(12000);
const operationId = z.string().min(8).max(160);
const expectedRevision = z.number().int().positive().optional();
const source = z.object({
  path: z.string().max(2000),
  line: z.number().int().nonnegative().optional(),
  character: z.number().int().nonnegative().optional(),
  symbol: z.string().max(500).optional(),
});
const lease = { specId: id, leaseId: id };
const limits = z
  .object({
    callDepth: z.number().int().min(0).max(12).optional(),
    nodes: z.number().int().min(5).max(500).optional(),
    edges: z.number().int().min(5).max(1000).optional(),
    targetsPerCall: z.number().int().min(1).max(30).optional(),
    timeoutMs: z.number().int().min(100).max(10000).optional(),
  })
  .optional();
export const tools = {
  contextory_context_get: {
    description:
      "Read workspace contracts, active specs, failures, configured checks and shared agent guidance before authorized implementation. Includes cached codebase orientation; use code_context_get for current task-specific source. Read-only questions need no request.",
    schema: z.object({ specId: id.optional() }),
  },
  contextory_entity_get: {
    description:
      "Read a full record, current state or cited immutable revision after search. Use offset/limit for children, job results or 400-character artifact pages; follow returned paging metadata. Historical text may be superseded. No tracked request is required for reads.",
    schema: z.object({
      id,
      revision: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    }),
  },
  contextory_history_get: {
    description:
      "Read full, paginated project history with readable titles and request/milestone/spec links. Filter by any hierarchy record to include its descendants. Pass nextBefore as before for older events.",
    schema: z.object({
      entityId: id.optional(),
      before: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(100).default(40),
    }),
  },
  contextory_request_change: {
    description:
      "Create an implementation request from authorized user intent, or revise one with a reason. Preserve original intent. Revisions need id and expectedRevision. Do not turn ordinary questions into requests.",
    schema: z.object({
      operationId,
      action: z.enum(["create", "revise"]),
      id: id.optional(),
      expectedRevision,
      title: z.string().min(1).max(300),
      description: text,
      reason: text.optional(),
    }),
  },
  contextory_spec_change: {
    description:
      "Create a milestone (parent=request) or a spec (parent=milestone, criteria required); revise/reopen a spec, or request verified completion. Never expand authorized scope. Existing records require expectedRevision.",
    schema: z.object({
      operationId,
      action: z.enum([
        "milestone",
        "create",
        "revise",
        "reopen",
        "complete",
        "block",
        "cancel",
      ]),
      id: id.optional(),
      parentId: id.optional(),
      expectedRevision,
      title: z.string().min(1).max(300).optional(),
      description: text.optional(),
      criteria: z.array(z.string().min(1).max(2000)).min(1).max(50).optional(),
      paths: z.array(z.string().max(2000)).max(100).optional(),
      dependencies: z.array(id).max(50).optional(),
      reason: text.optional(),
    }),
  },
  contextory_session_attach: {
    description:
      "Register this native agent session and return a Contextory session ID. Pass the exact nativeSessionId supplied by the Contextory hook reminder to link native model/usage metadata to leased specs. If unavailable, omit it; never guess. Chat and model routing remain native.",
    schema: z.object({ operationId, nativeSessionId: id.optional() }),
  },
  contextory_usage_get: {
    description:
      "Read recorded native models and observed token usage, optionally for a request/milestone/spec and its descendants. Counters may be unavailable or partial. Exact session/lease correlation only; no billing or quota estimates. Cached/reasoning tokens are subsets. Includes paged metadata records; no chat transcript is read or stored.",
    schema: z.object({
      entityId: id.optional(),
      provider: z.enum(["codex", "claude", "bob"]).optional(),
      nativeSessionId: z.string().min(1).max(200).optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    }),
  },
  contextory_spec_lease: {
    description:
      "Claim, renew or release a spec. Claim with a Contextory session ID from session_attach. Use returned leaseId for findings/evidence/outcomes. One implementation lease per spec; revisions and expiry are checked.",
    schema: z.object({
      operationId,
      specId: id,
      expectedRevision,
      action: z.enum(["claim", "renew", "release"]),
      sessionId: id,
      leaseId: id.optional(),
    }),
  },
  contextory_finding_record: {
    description:
      "Record/update an observed issue and explain its impact, fix and why it works. Existing finding updates require expectedRevision. Unresolved blocking findings prevent completion.",
    schema: z.object({
      operationId,
      ...lease,
      id: id.optional(),
      expectedRevision,
      title: z.string().min(1).max(300),
      observation: text,
      impact: text,
      resolution: text.optional(),
      status: z.enum(["open", "resolved", "deferred"]),
      blocking: z.boolean().default(true),
      sources: z.array(source).max(30).default([]),
    }),
  },
  contextory_decision_record: {
    description:
      "Store a concise user-facing design choice, rationale, alternatives and consequences. Do not store a reasoning transcript or attribute an agent choice to the human. Optional supersedes preserves decision history.",
    schema: z.object({
      operationId,
      ...lease,
      title: z.string().min(1).max(300),
      choice: text,
      rationale: text,
      alternatives: z.string().max(12000).default("None material"),
      consequences: text,
      supersedes: id.optional(),
      sources: z.array(source).max(30).default([]),
    }),
  },
  contextory_evidence_record: {
    description:
      "Record externally observed/manual evidence with its source and criterion IDs. It stays agent-reported, not an independent check. Contextory fingerprints current source; record immediately after observation.",
    schema: z.object({
      operationId,
      ...lease,
      title: z.string().min(1).max(300),
      detail: text,
      criteria: z.array(id).min(1).max(50),
      result: z.enum(["passed", "failed", "not_run"]),
      command: z.string().max(4000).optional(),
    }),
  },
  contextory_check_run: {
    description:
      "Run a named workspace-configured check independently, with exact argv and source fingerprints. No arbitrary commands. Returns a job ID; read it with entity_get or context_get. Output is bounded and retained as an artifact.",
    schema: z.object({
      operationId,
      ...lease,
      recipeId: id,
      criteria: z.array(id).min(1).max(50),
    }),
  },
  contextory_outcome_submit: {
    description:
      "Persist changes, issues/fixes, decisions, tests, limits and report/changelog. After submitting, call contextory_spec_change action=complete with the returned spec revision to mark the spec done. Submission alone leaves it open. Criterion/evidence links must cover current criteria. State when there were no findings or new decisions.",
    schema: z.object({
      operationId,
      ...lease,
      expectedRevision: z.number().int().positive(),
      summary: text,
      issuesSummary: text,
      decisionsSummary: text,
      limitations: text,
      report: text,
      changelog: z.string().min(1).max(2000),
      criteria: z
        .array(
          z.object({
            criterionId: id,
            evidenceIds: z.array(id).min(1).max(30),
          }),
        )
        .min(1)
        .max(50),
      commits: z
        .array(z.string().regex(/^[a-f0-9]{40,64}$/))
        .max(100)
        .default([]),
    }),
  },
  contextory_search: {
    description:
      "Recover earlier decisions, findings, changes and indexed source with lexical or optional local semantic/hybrid retrieval. Inspect cited revisions and current record state with entity_get; page history for chronology. Prefer code_context_get for structural code questions. Semantic unavailability is explicit; bounded search is not exhaustive impact.",
    schema: z.object({
      query: z.string().min(1).max(4000),
      mode: z.enum(["lexical", "semantic", "hybrid"]).default("hybrid"),
      limit: z.number().int().min(1).max(20).default(5),
    }),
  },
  contextory_code_context_get: {
    description:
      "Start code questions and related edits with a task in query, known paths and optional specId. Verifies saved source and returns ranked definitions, bounded relationships, tests/docs and project memory. Inspect cited current files and re-query after saves. No tracked request required. budgetTokens uses a hard UTF-8 byte budget of three bytes per token; retain coverage/truncation limits.",
    schema: z.object({
      query: z.string().min(1).max(4000),
      paths: z.array(z.string().max(2000)).max(20).default([]),
      specId: id.optional(),
      budgetTokens: z.number().int().min(512).max(6000).default(3000),
    }),
  },
  contextory_code_architecture_get: {
    description:
      "Orient across subsystems, dependencies, entry points, shared symbols, conventions and indexing coverage. Default refresh=true verifies saved source without executing it; refresh=false uses cached projection. Follow with scoped code_context_get for a task. Generated patterns are not approved requirements.",
    schema: z.object({ refresh: z.boolean().default(true) }),
  },
  contextory_code_path_get: {
    description:
      "Explain a bounded shortest connection between source symbols/files or project records after verifying saved source. Qualify ambiguous symbols as source:path#qualifiedName. Inspect edge direction, category and provenance; absence of a path is limited by depth and coverage, not proof of independence.",
    schema: z.object({
      from: z.string().min(1).max(2500),
      to: z.string().min(1).max(2500),
      direction: z.enum(["forward", "both"]).default("both"),
      maxDepth: z.number().int().min(1).max(10).default(6),
    }),
  },
  contextory_code_index_refresh: {
    description:
      "Recover an empty/stale/failed source graph or import regenerated Graphify JSON from a workspace-relative graphifyPath. Returns snapshot/coverage without executing source. Saved edits already refresh automatically; partial dynamic/external gaps need source inspection. Changed imported sources require Graphify regeneration/re-import, not just refresh.",
    schema: z.object({ graphifyPath: z.string().min(1).max(2000).optional() }),
  },
  contextory_relationship_change: {
    description:
      "Link versioned project records, or a record to an authorized source path/symbol. Graph links describe relationships; they do not approve evidence or infer dependencies from similarity.",
    schema: z.object({
      operationId,
      from: id,
      to: id.optional(),
      source: source.optional(),
      kind: z.enum(["implements", "resolves", "validated_by", "related_to"]),
      rationale: text,
    }),
  },
  contextory_impact_get: {
    description:
      "Find affected source and project records after verifying saved source. Accepts a record/code ID, path, unique symbol or source:path#qualifiedName. Reverse finds dependents/callers, forward dependencies, both surrounding connections; depth/limit bound traversal. Inspect provenance/coverage. Test references do not prove test execution.",
    schema: z.object({
      id: z.string().min(1).max(2500),
      direction: z.enum(["forward", "reverse", "both"]).default("reverse"),
      depth: z.number().int().min(1).max(10).default(5),
      limit: z.number().int().min(1).max(200).default(50),
    }),
  },
  contextory_flow_trace: {
    description:
      "Trace possible source calls/control flow for Python and TS/JS from a symbol or zero-based position, without executing source. Use before changing related code to understand branches and callers. Default five call hops with cycle, node, edge, fanout and time bounds. Dynamic targets are explicit gaps. Large graphs return a handle for paged reads.",
    schema: z.object({
      root: z.object({
        path: z.string().min(1).max(2000),
        position: z
          .object({
            line: z.number().int().nonnegative(),
            character: z.number().int().nonnegative(),
          })
          .optional(),
        symbol: z.string().max(500).optional(),
        start: z.enum(["cursor", "function"]).optional(),
      }),
      view: z.enum(["calls", "flow"]).default("calls"),
      direction: z.enum(["outgoing", "incoming"]).default("outgoing"),
      limits,
    }),
  },
  contextory_flow_expand: {
    description:
      "Expand a frontier or read a page of a stored graph. Snapshot IDs prevent combining obsolete source. Expansion produces a new bounded graph and preserves prior results.",
    schema: z.object({
      graphId: id,
      snapshotId: id,
      nodeId: id.optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(30),
      limits,
    }),
  },
  contextory_report_export: {
    description:
      "Export a request report containing its contract, milestones, specs, changes, issues, decisions, evidence, tests and outcomes, or its completed-work changelog. Supply requestId to isolate a request. Returns an artifact and bounded excerpt.",
    schema: z.object({
      format: z.enum(["report", "changelog", "json"]).default("report"),
      requestId: id,
    }),
  },
} as const;
export type ToolName = keyof typeof tools;
export type Input<N extends ToolName> = z.infer<(typeof tools)[N]["schema"]>;
export function toolDefinitions() {
  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: z.toJSONSchema(tool.schema, { target: "draft-7" }),
    annotations: {
      readOnlyHint: [
        "contextory_context_get",
        "contextory_entity_get",
        "contextory_history_get",
        "contextory_usage_get",
        "contextory_search",
        "contextory_code_context_get",
        "contextory_code_architecture_get",
        "contextory_code_path_get",
        "contextory_impact_get",
        "contextory_flow_trace",
        "contextory_flow_expand",
      ].includes(name),
      destructiveHint: false,
      openWorldHint: false,
    },
  }));
}
