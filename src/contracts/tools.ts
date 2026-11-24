import { z } from "zod";
const id = z.string().min(1).max(160);
const text = z.string().min(1).max(12000);
const operationId = z.string().min(8).max(160);
const expectedRevision = z.number().int().positive().optional();
const source = z.object({
  path: z.string().min(1).max(2000),
  line: z.number().int().nonnegative().optional(),
  character: z.number().int().nonnegative().optional(),
  symbol: z.string().max(500).optional(),
});
const lease = { specId: id, leaseId: id };
const category = z.enum(["file", "rule", "feature", "ui"]);
export const catalogContent = z
  .object({
    category,
    title: z.string().trim().min(1).max(300),
    description: text,
    sources: z.array(source).min(1).max(30),
    tests: z.array(source).max(30).default([]),
    testGap: z.string().trim().min(1).max(2000).optional(),
    ui: z
      .object({
        location: text,
        element: text,
        trigger: text,
        behavior: text,
        states: text,
      })
      .optional(),
  })
  .superRefine((p, ctx) => {
    if (p.category === "file" && p.sources.length !== 1)
      ctx.addIssue({
        code: "custom",
        message: "A file entry describes exactly one source file.",
      });
    if (p.category === "ui" && !p.ui)
      ctx.addIssue({
        code: "custom",
        message:
          "UI contracts need location, element, trigger, behavior and states.",
      });
    if (p.category !== "file" && !p.tests.length && !p.testGap)
      ctx.addIssue({
        code: "custom",
        message: "Behavior needs test links or an explicit testGap.",
      });
  });
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
  contextory_docs_get: {
    description:
      "Read project documentation without Python or a separate plugin. sections returns bounded bilingual natural-language explanations with stable IDs, source freshness and associated Contextory records; filter by query/path/recordId/pageId. overview reports coverage and missing/stale content. guidance pages the bundled documentation/Carbon resources (resource selects a listed text path). job reads an on-demand runtime operation. Documentation is authored explanation, never inferred human approval. Carry project identity; references are not writable projects.",
    schema: z.object({
      section: z
        .enum(["overview", "sections", "guidance", "job"])
        .default("overview"),
      query: z.string().max(4000).default(""),
      path: z.string().max(2000).optional(),
      recordId: id.optional(),
      pageId: id.optional(),
      sectionId: id.optional(),
      resource: z.string().max(2000).optional(),
      jobId: id.optional(),
      locale: z.enum(["en", "pt-BR"]).default("en"),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(10),
    }),
  },
  contextory_docs_run: {
    description:
      "Queue a bundled software-documentation operation in the selected project; poll docs_get section=job or entity_get. No external plugin installation is needed; Python 3.11+ (contextory.pythonExecutable) is required only when run. All upstream map/init/validate/build/integrations/migrate/readme/Pages operations are supported. Mutating operations require a current spec lease; migration/readme preview defaults apply=false. Pages publication additionally requires explicit user authorization and publish=true. Never run generation on startup or approve scaffolds automatically. Reuse exact operationId/input to recover the retained job; interrupted jobs are never replayed automatically.",
    schema: z.object({
      operationId,
      action: z.enum([
        "map",
        "init",
        "validate",
        "build",
        "integrations",
        "migrate",
        "readme",
        "pages_plan",
        "pages_publish",
        "pages_status",
      ]),
      specId: id.optional(),
      leaseId: id.optional(),
      name: z.string().trim().min(1).max(300).optional(),
      kind: z.enum(["application", "library", "plugin"]).optional(),
      sourceRoots: z
        .array(z.string().min(1).max(2000))
        .min(1)
        .max(30)
        .optional(),
      apply: z.boolean().default(false),
      siteUrl: z.string().max(2000).optional(),
      remote: z.string().max(300).optional(),
      publish: z.boolean().default(false),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(1000).default(100),
    }),
  },
  contextory_docs_link: {
    description:
      "Under a spec lease, associate an existing stable documentation page/section with local catalog/decision/spec/outcome records and capture its current source hashes. This records an observed maintenance baseline, not human approval or a documentation rewrite. Expected corpus fingerprint prevents linking obsolete text; preserve prior association history. Sources changing later mark the section stale. Inspect text/source first; do not refresh stale claims without review.",
    schema: z.object({
      operationId,
      ...lease,
      pageId: id,
      sectionId: id,
      corpusFingerprint: z.string().length(64),
      recordIds: z.array(id).max(30),
      reason: text,
    }),
  },
  contextory_hooks_rebuild: {
    description:
      "Explicitly rebuild Contextory's project hooks for codex, claude or bob and restore the packaged launcher. Preserves unrelated hooks, MCP configuration, portable skills and native trust. Use for missing/stale/duplicate managed hooks, not to bypass approval. Returns changed files and native trust/reload guidance; unchanged files do not prove hooks executed. Requires a reachable service; when unavailable use the editor's Contextory: Rebuild Agent Hooks command. Reuse the same operationId/input only to recover a retry; use a new operationId for a new repair. Respects projectId/workspaceId; cannot modify reference codebases or global hook approvals.",
    schema: z.object({
      operationId,
      provider: z.enum(["codex", "claude", "bob"]),
    }),
  },
  contextory_workspace_get: {
    description:
      "List the current project and active editor workspace projects without merging their records or graphs. Optional groupId reads a coordinated request's per-project branches and aggregate completion; unavailable or missing branches remain explicit. With multiple editor workspace contexts, supply workspaceId. Reference codebases are separate from writable workspace projects.",
    schema: z.object({ groupId: id.optional() }),
  },
  contextory_workspace_request_create: {
    description:
      "Create one coordinated request across explicitly selected active workspace projectIds. Each project keeps a linked local request, its own milestones/specs, leases, checks and evidence. Reuse exactly the same operationId and input to recover partial creation without duplicates. A partial result is not success; inspect each branch and retry explicitly. Does not authorize implementation or releases beyond user intent.",
    schema: z.object({
      operationId,
      projectIds: z.array(id).min(2).max(16),
      title: z.string().trim().min(1).max(300),
      description: text,
    }),
  },
  contextory_version_get: {
    description:
      "Read project-wide current version, Git tags/releases, unreleased commits, SemVer bump recommendation and global changelog context. Independent of requests; the service also observes Git automatically. releaseId selects a version's paginated commits and recorded semantic changes. offset/limit page each returned cursor. Observed local tags do not imply remote publication.",
    schema: z.object({
      releaseId: id.optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    }),
  },
  contextory_release_prepare: {
    description:
      "Prepare a concrete project-wide release plan from a clean Git root: exact base/head/branch, next SemVer, commit membership, global recorded decisions/definitions and reviewed version/changelog edits. bump=auto derives a recommendation from Conventional Commits; explicit version supports stable SemVer. Does not edit source, commit, tag or publish. No request/spec lease needed. Review the plan before applying it.",
    schema: z.object({
      operationId,
      bump: z.enum(["auto", "patch", "minor", "major"]).default("auto"),
      version: z.string().max(100).optional(),
    }),
  },
  contextory_release_change: {
    description:
      "Execute an explicitly authorized project release plan at its exact revision. apply writes only planned version/changelog files, creates a dedicated Git commit and annotated immutable local tag; publish pushes only that exact tag to the configured remote, never branches or overwritten tags. recover resumes interrupted local application after validating owned partial work. cancel accepts unexecuted plans. Journaled operations support retry with the same operationId/input. Never use this as authorization to release the current project; user scope/native permissions still apply.",
    schema: z.object({
      operationId,
      id,
      expectedRevision: z.number().int().positive(),
      action: z.enum(["apply", "publish", "recover", "cancel"]),
    }),
  },
  contextory_project_export: {
    description:
      "Discover and page all documentation datasets stored by Contextory: records, immutable revisions, audit history, record/source relationships, code files/nodes/edges/imports, checks/jobs, native usage metadata and artifacts. Use overview first, then section with offset/limit until nextOffset=null; artifact reads page 400-character units by returned file name. Optional entityId filters record revisions/history/relationships/jobs/usage. Preserves sequence/snapshot and provenance. No credentials or native conversations are exposed. Read-only documentation needs no request.",
    schema: z.object({
      section: z
        .enum([
          "overview",
          "records",
          "revisions",
          "history",
          "relationships",
          "code_files",
          "code_nodes",
          "code_edges",
          "code_imports",
          "jobs",
          "usage",
          "artifacts",
        ])
        .default("overview"),
      entityId: id.optional(),
      artifact: z.string().min(1).max(200).optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    }),
  },
  contextory_catalog_get: {
    description:
      "Read the versioned file-purpose, rule, feature and UI catalog before changes. Filter by path/category/query; page all results. pendingOnly=true restricts records to observed baselines before pagination and still returns matching pending proposals. Returns source freshness. Test references are not execution evidence. inventory=true also pages authorized workspace files and exposes missing descriptions; no claim of complete behavioral coverage.",
    schema: z.object({
      category: category.optional(),
      path: z.string().max(2000).optional(),
      query: z.string().max(4000).optional(),
      inventory: z.boolean().default(false),
      pendingOnly: z.boolean().default(false),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    }),
  },
  contextory_catalog_change: {
    description:
      "Under a spec lease, create an observed source-backed entry or revise/retire an exact revision. autoApprove=true with compatibility=preserved and impact=implementation records compatible maintenance without another human decision. Implementation conflicts may also auto-approve with compatibility=conflicting and impact=implementation; explain the conflict, rationale and validation in reason. Preserve behavioral descriptions/UI contracts; file-purpose prose may be corrected without attributing it to an earlier human review. Process/outcome conflicts, changed behavior, retirements and uncertain conflicts require human review BEFORE implementation. decisionIds links prior decisions; process/outcome or unclassified conflicts cannot be auto-overridden. Pending proposals block native implementation and completion; new observations have optional review. Every change retains before/after, hashes, spec, actor and approval provenance.",
    schema: z.object({
      operationId,
      ...lease,
      action: z.enum(["create", "revise", "retire"]),
      id: id.optional(),
      expectedRevision,
      content: catalogContent.optional(),
      reason: text.trim().min(1),
      migrationId: id.optional(),
      compatibility: z
        .enum(["preserved", "changed", "conflicting", "unknown"])
        .default("unknown"),
      impact: z
        .enum(["implementation", "process", "outcome", "unknown"])
        .default("unknown"),
      autoApprove: z.boolean().default(false),
      decisionIds: z.array(id).max(30).default([]),
    }),
  },
  contextory_catalog_review: {
    description:
      "Human UI only: approve/reject an exact observed baseline or pending catalog change, or refresh its source snapshot after checking the current files. Refresh preserves definition content and pending state; it never approves. Native agents cannot review or refresh; original revisions and reviewer identity remain in history.",
    schema: z.object({
      operationId,
      id,
      expectedRevision: z.number().int().positive(),
      action: z.enum(["approve", "reject", "refresh"]),
      reason: text.trim().min(1),
    }),
  },
  contextory_catalog_migrate: {
    description:
      "Bootstrap an existing project's file catalog in resumable bounded batches under a spec lease. Omit migrationId to start, then pass the returned id; the stored manifest/cursor prevents duplicate work. Candidates use current graph symbols with explicit uncertainty; no requirement is auto-approved. Use the contextory-migrate skill to inspect candidates and add rules/features/UI contracts and test gaps.",
    schema: z.object({
      operationId,
      ...lease,
      migrationId: id.optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
  },
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
      "Store a concise design choice, rationale, alternatives, consequences and impact (implementation/process/outcome/unknown). Never attribute an agent choice to a human. supersedes preserves earlier project decisions across specs: only implementation-to-implementation conflicts auto-approve. For process/outcome or unclassified conflicts, first obtain a human-approved catalog proposal in this spec whose decisionIds includes the old decision and whose description equals the new choice; pass its approvalId. Propose before implementing and wait. Record source links for regression investigation.",
    schema: z.object({
      operationId,
      ...lease,
      title: z.string().min(1).max(300),
      choice: text,
      rationale: text,
      alternatives: z.string().max(12000).default("None material"),
      consequences: text,
      supersedes: id.optional(),
      impact: z
        .enum(["implementation", "process", "outcome", "unknown"])
        .default("unknown"),
      approvalId: id.optional(),
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
      catalog: z
        .object({ recordIds: z.array(id).max(200), explanation: text })
        .optional(),
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
      codebaseId: id.optional(),
      query: z.string().min(1).max(4000),
      mode: z.enum(["lexical", "semantic", "hybrid"]).default("hybrid"),
      limit: z.number().int().min(1).max(20).default(5),
    }),
  },
  contextory_code_context_get: {
    description:
      "Start code questions and related edits with a task in query, known paths and optional specId. Verifies saved source and returns ranked definitions, bounded relationships, tests/docs and project memory. Inspect cited current files and re-query after saves. No tracked request required. budgetTokens uses a hard UTF-8 byte budget of three bytes per token; retain coverage/truncation limits.",
    schema: z.object({
      codebaseId: id.optional(),
      query: z.string().min(1).max(4000),
      paths: z.array(z.string().max(2000)).max(20).default([]),
      specId: id.optional(),
      budgetTokens: z.number().int().min(512).max(6000).default(3000),
    }),
  },
  contextory_code_architecture_get: {
    description:
      "Orient across subsystems, dependencies, entry points, shared symbols, conventions and indexing coverage. Default refresh=true verifies saved source without executing it; refresh=false uses cached projection. Follow with scoped code_context_get for a task. Generated patterns are not approved requirements.",
    schema: z.object({
      codebaseId: id.optional(),
      refresh: z.boolean().default(true),
    }),
  },
  contextory_code_path_get: {
    description:
      "Explain a bounded shortest connection between source symbols/files or project records after verifying saved source. Qualify ambiguous symbols as source:path#qualifiedName. Inspect edge direction, category and provenance; absence of a path is limited by depth and coverage, not proof of independence.",
    schema: z.object({
      codebaseId: id.optional(),
      from: z.string().min(1).max(2500),
      to: z.string().min(1).max(2500),
      direction: z.enum(["forward", "both"]).default("both"),
      maxDepth: z.number().int().min(1).max(10).default(6),
    }),
  },
  contextory_code_index_refresh: {
    description:
      "Recover an empty/stale/failed source graph or import regenerated Graphify JSON from a workspace-relative graphifyPath. Returns snapshot/coverage without executing source. Saved edits already refresh automatically; partial dynamic/external gaps need source inspection. Changed imported sources require Graphify regeneration/re-import, not just refresh.",
    schema: z.object({
      codebaseId: id.optional(),
      graphifyPath: z.string().min(1).max(2000).optional(),
    }),
  },
  contextory_codebase_list: {
    description:
      "List the current workspace and named local reference codebases. Reference analysis has isolated source projections and no active project memory. Pass a reference id as codebaseId to source tools; omission always selects the current workspace.",
    schema: z.object({}),
  },
  contextory_codebase_change: {
    description:
      "Add an explicitly authorized absolute local reference directory for isolated read-only source analysis, or detach it by codebaseId. No source, client configuration, requirements or checks are written in the reference. Adding does not switch the active workspace or index it until queried. Up to eight references; detach retains rebuildable cache in service storage. Use only for directories within the user's authorized scope.",
    schema: z
      .object({
        operationId,
        action: z.enum(["add", "remove"]),
        root: z.string().min(1).max(2000).optional(),
        name: z.string().trim().min(1).max(100).optional(),
        codebaseId: id.optional(),
      })
      .refine(
        (p) => (p.action === "add" ? Boolean(p.root) : Boolean(p.codebaseId)),
        "Add requires root; remove requires codebaseId.",
      ),
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
      codebaseId: id.optional(),
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
      codebaseId: id.optional(),
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
      codebaseId: id.optional(),
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
export const scopedCodeTools: readonly string[] = [
  "contextory_search",
  "contextory_code_context_get",
  "contextory_code_architecture_get",
  "contextory_code_path_get",
  "contextory_code_index_refresh",
  "contextory_impact_get",
  "contextory_flow_trace",
  "contextory_flow_expand",
];
export function toolDefinitions() {
  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description:
      tool.description +
      " Optional projectId selects an active workspace project from contextory_workspace_get for this call only; omission/current stays on this server's project. Keep project identity with all records, source IDs and citations. workspaceId disambiguates multiple editor workspace contexts. Unknown projects fail; no project is inferred from an ID or the UI selection." +
      (scopedCodeTools.includes(name)
        ? " Optional codebaseId selects an isolated reference from contextory_codebase_list; omission/current selects the active workspace. Paths and IDs belong to that codebase. Keep returned codebase identity with citations; reference knowledge does not authorize current-project changes."
        : ""),
    inputSchema: (() => {
      const schema = z.toJSONSchema(tool.schema, { target: "draft-7" });
      return {
        ...schema,
        properties: {
          ...schema.properties,
          projectId: { type: "string", minLength: 1, maxLength: 160 },
          workspaceId: { type: "string", minLength: 1, maxLength: 160 },
        },
      };
    })(),
    annotations: {
      readOnlyHint: [
        "contextory_docs_get",
        "contextory_workspace_get",
        "contextory_context_get",
        "contextory_version_get",
        "contextory_project_export",
        "contextory_catalog_get",
        "contextory_entity_get",
        "contextory_history_get",
        "contextory_usage_get",
        "contextory_search",
        "contextory_codebase_list",
        "contextory_code_context_get",
        "contextory_code_architecture_get",
        "contextory_code_path_get",
        "contextory_impact_get",
        "contextory_flow_trace",
        "contextory_flow_expand",
      ].includes(name),
      destructiveHint: false,
      openWorldHint:
        name === "contextory_release_change" || name === "contextory_docs_run",
    },
  }));
}
