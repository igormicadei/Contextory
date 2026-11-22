# MCP API reference

## Read the advertised contract

Contextory 0.7.0 defines 36 tools. The following Zod schema excerpts were extracted with the TypeScript parser from the saved source without executing application code. They preserve required/optional/default/range semantics. The running MCP tools/list response is authoritative for the installed client version. contextory_catalog_review is human-UI-only even if its contract is visible.

Every tool additionally accepts optional projectId and workspaceId. Omitted/current project scope stays on that server’s project. Source tools additionally accept optional codebaseId where their schema/advertised contract permits it. Lines/characters in product tool source references are zero-based; documentation citation lines are one-based.

Shared schema aliases

```typescript
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

```

## Revisions, retries and completion

Read a record before editing. Existing records require current expectedRevision. Use a fresh operationId (8–160 characters) for a new mutation; retry uncertain work only with its exact original input/ID. Implementation writes require the attached session’s active spec lease except documented setup/release operations. Native permissions still apply.

[Evidence and completion sequence](outcomes.md)

## Hooks rebuild

Repair one provider’s managed hooks; requires a reachable service and preserves native trust.

Input schema · src/contracts/tools.ts:60

```typescript
// contextory_hooks_rebuild
z.object({
      operationId,
      provider: z.enum(["codex", "claude", "bob"]),
    })
```

## Workspace get

Discover project/workspace identities and optional coordinated-request status.

Input schema · src/contracts/tools.ts:68

```typescript
// contextory_workspace_get
z.object({ groupId: id.optional() })
```

## Workspace request create

Create linked local requests for selected projects with recoverable partial creation.

Input schema · src/contracts/tools.ts:73

```typescript
// contextory_workspace_request_create
z.object({
      operationId,
      projectIds: z.array(id).min(2).max(16),
      title: z.string().trim().min(1).max(300),
      description: text,
    })
```

## Version get

Read repository-wide version state, commits and semantic records with independent pagination.

Input schema · src/contracts/tools.ts:83

```typescript
// contextory_version_get
z.object({
      releaseId: id.optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Release prepare

Prepare a concrete release plan without source edits; no spec lease is needed.

Input schema · src/contracts/tools.ts:92

```typescript
// contextory_release_prepare
z.object({
      operationId,
      bump: z.enum(["auto", "patch", "minor", "major"]).default("auto"),
      version: z.string().max(100).optional(),
    })
```

## Release change

Apply, publish, recover or cancel an authorized release plan using its current revision.

Input schema · src/contracts/tools.ts:101

```typescript
// contextory_release_change
z.object({
      operationId,
      id,
      expectedRevision: z.number().int().positive(),
      action: z.enum(["apply", "publish", "recover", "cancel"]),
    })
```

## Project export

Page stored datasets for documentation, retaining sequence, snapshots and provenance.

Input schema · src/contracts/tools.ts:111

```typescript
// contextory_project_export
z.object({
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
    })
```

## Catalog get

Read catalog definitions, pending proposals, source freshness and optional file inventory.

Input schema · src/contracts/tools.ts:137

```typescript
// contextory_catalog_get
z.object({
      category: category.optional(),
      path: z.string().max(2000).optional(),
      query: z.string().max(4000).optional(),
      inventory: z.boolean().default(false),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Catalog change

Under a lease, create observations or propose exact definition replacements/retirements.

Input schema · src/contracts/tools.ts:149

```typescript
// contextory_catalog_change
z.object({
      operationId,
      ...lease,
      action: z.enum(["create", "revise", "retire"]),
      id: id.optional(),
      expectedRevision,
      content: catalogContent.optional(),
      reason: text,
      migrationId: id.optional(),
    })
```

## Catalog review

Human UI only: approve or reject an exact definition/proposal revision; native agents cannot approve.

Input schema · src/contracts/tools.ts:163

```typescript
// contextory_catalog_review
z.object({
      operationId,
      id,
      expectedRevision: z.number().int().positive(),
      action: z.enum(["approve", "reject"]),
      reason: text,
    })
```

## Catalog migrate

Bootstrap file descriptions in resumable batches; scanned candidates still need semantic review.

Input schema · src/contracts/tools.ts:174

```typescript
// contextory_catalog_migrate
z.object({
      operationId,
      ...lease,
      migrationId: id.optional(),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Context get

Read workspace contracts, active work, check recipes and guidance before implementation.

Input schema · src/contracts/tools.ts:184

```typescript
// contextory_context_get
z.object({ specId: id.optional() })
```

## Entity get

Read a current or immutable record revision, child page, job or artifact page.

Input schema · src/contracts/tools.ts:189

```typescript
// contextory_entity_get
z.object({
      id,
      revision: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## History get

Page audit history; pass nextBefore as before to continue.

Input schema · src/contracts/tools.ts:199

```typescript
// contextory_history_get
z.object({
      entityId: id.optional(),
      before: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(100).default(40),
    })
```

## Request change

Create or revise an authorized implementation request while preserving original intent.

Input schema · src/contracts/tools.ts:208

```typescript
// contextory_request_change
z.object({
      operationId,
      action: z.enum(["create", "revise"]),
      id: id.optional(),
      expectedRevision,
      title: z.string().min(1).max(300),
      description: text,
      reason: text.optional(),
    })
```

## Spec change

Create milestones/specs, revise/reopen/block/cancel work or explicitly request verified completion.

Input schema · src/contracts/tools.ts:221

```typescript
// contextory_spec_change
z.object({
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
    })
```

## Session attach

Register an agent session; use the exact hook-supplied nativeSessionId or omit it.

Input schema · src/contracts/tools.ts:246

```typescript
// contextory_session_attach
z.object({ operationId, nativeSessionId: id.optional() })
```

## Usage get

Read observed models/token metadata; unavailable counts stay unavailable.

Input schema · src/contracts/tools.ts:251

```typescript
// contextory_usage_get
z.object({
      entityId: id.optional(),
      provider: z.enum(["codex", "claude", "bob"]).optional(),
      nativeSessionId: z.string().min(1).max(200).optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Spec lease

Claim, renew or release one specification’s implementation lease with an attached session.

Input schema · src/contracts/tools.ts:262

```typescript
// contextory_spec_lease
z.object({
      operationId,
      specId: id,
      expectedRevision,
      action: z.enum(["claim", "renew", "release"]),
      sessionId: id,
      leaseId: id.optional(),
    })
```

## Finding record

Record an issue, impact and resolution; unresolved blocking findings prevent completion.

Input schema · src/contracts/tools.ts:274

```typescript
// contextory_finding_record
z.object({
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
    })
```

## Decision record

Record a choice, rationale, alternatives and consequences with sources.

Input schema · src/contracts/tools.ts:291

```typescript
// contextory_decision_record
z.object({
      operationId,
      ...lease,
      title: z.string().min(1).max(300),
      choice: text,
      rationale: text,
      alternatives: z.string().max(12000).default("None material"),
      consequences: text,
      supersedes: id.optional(),
      sources: z.array(source).max(30).default([]),
    })
```

## Evidence record

Record reported external/manual evidence; it remains separate from independent checks.

Input schema · src/contracts/tools.ts:306

```typescript
// contextory_evidence_record
z.object({
      operationId,
      ...lease,
      title: z.string().min(1).max(300),
      detail: text,
      criteria: z.array(id).min(1).max(50),
      result: z.enum(["passed", "failed", "not_run"]),
      command: z.string().max(4000).optional(),
    })
```

## Check run

Run a configured recipe independently and return a job to poll.

Input schema · src/contracts/tools.ts:319

```typescript
// contextory_check_run
z.object({
      operationId,
      ...lease,
      recipeId: id,
      criteria: z.array(id).min(1).max(50),
    })
```

## Outcome submit

Submit criterion evidence and a durable report; a separate complete action is still required.

Input schema · src/contracts/tools.ts:329

```typescript
// contextory_outcome_submit
z.object({
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
    })
```

## Search

Search source and project memory using lexical, semantic or hybrid retrieval.

Input schema · src/contracts/tools.ts:360

```typescript
// contextory_search
z.object({
      codebaseId: id.optional(),
      query: z.string().min(1).max(4000),
      mode: z.enum(["lexical", "semantic", "hybrid"]).default("hybrid"),
      limit: z.number().int().min(1).max(20).default(5),
    })
```

## Code context get

Retrieve ranked current source/task context with paths and a bounded estimated-token budget.

Input schema · src/contracts/tools.ts:370

```typescript
// contextory_code_context_get
z.object({
      codebaseId: id.optional(),
      query: z.string().min(1).max(4000),
      paths: z.array(z.string().max(2000)).max(20).default([]),
      specId: id.optional(),
      budgetTokens: z.number().int().min(512).max(6000).default(3000),
    })
```

## Code architecture get

Read subsystems, dependencies, entry points and coverage; refresh defaults to true.

Input schema · src/contracts/tools.ts:381

```typescript
// contextory_code_architecture_get
z.object({
      codebaseId: id.optional(),
      refresh: z.boolean().default(true),
    })
```

## Code path get

Explain a bounded indexed path between two source/record roots.

Input schema · src/contracts/tools.ts:389

```typescript
// contextory_code_path_get
z.object({
      codebaseId: id.optional(),
      from: z.string().min(1).max(2500),
      to: z.string().min(1).max(2500),
      direction: z.enum(["forward", "both"]).default("both"),
      maxDepth: z.number().int().min(1).max(10).default(6),
    })
```

## Code index refresh

Refresh source projection or validate/import optional Graphify data.

Input schema · src/contracts/tools.ts:400

```typescript
// contextory_code_index_refresh
z.object({
      codebaseId: id.optional(),
      graphifyPath: z.string().min(1).max(2000).optional(),
    })
```

## Codebase list

List the current project and its isolated read-only reference registrations.

Input schema · src/contracts/tools.ts:408

```typescript
// contextory_codebase_list
z.object({})
```

## Codebase change

Register or detach an authorized local reference; source files remain untouched.

Input schema · src/contracts/tools.ts:413

```typescript
// contextory_codebase_change
z
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
      )
```

## Relationship change

Link project records or source locations with a typed relationship and rationale.

Input schema · src/contracts/tools.ts:429

```typescript
// contextory_relationship_change
z.object({
      operationId,
      from: id,
      to: id.optional(),
      source: source.optional(),
      kind: z.enum(["implements", "resolves", "validated_by", "related_to"]),
      rationale: text,
    })
```

## Impact get

Traverse source/record relationships with explicit direction, depth and size bounds.

Input schema · src/contracts/tools.ts:441

```typescript
// contextory_impact_get
z.object({
      codebaseId: id.optional(),
      id: z.string().min(1).max(2500),
      direction: z.enum(["forward", "reverse", "both"]).default("reverse"),
      depth: z.number().int().min(1).max(10).default(5),
      limit: z.number().int().min(1).max(200).default(50),
    })
```

## Flow trace

Trace bounded calls/control flow from a symbol or source position.

Input schema · src/contracts/tools.ts:452

```typescript
// contextory_flow_trace
z.object({
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
    })
```

## Flow expand

Page a stored graph or expand a frontier while validating its source snapshot.

Input schema · src/contracts/tools.ts:473

```typescript
// contextory_flow_expand
z.object({
      codebaseId: id.optional(),
      graphId: id,
      snapshotId: id,
      nodeId: id.optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(30),
      limits,
    })
```

## Report export

Export one request’s report, completed-work changelog or JSON through an artifact handle.

Input schema · src/contracts/tools.ts:486

```typescript
// contextory_report_export
z.object({
      format: z.enum(["report", "changelog", "json"]).default("report"),
      requestId: id,
    })
```

## Modules, classes, methods and functions

### scripts/documentation/build.py:1 — <module>

Signature and location

```python
scripts/documentation/build.py
```

Build guides with the documentation skill's unchanged runtime and default layouts.

### scripts/documentation/build.py:26 — Links

Signature and location

```python
class Links(HTMLParser)
```

Collect local destinations and anchors to verify generated HTML.

### scripts/documentation/build.py:32 — Links.__init__

Signature and location

```python
__init__(self)
```

Initialize per-page collections.

### scripts/documentation/build.py:38 — Links.handle_starttag

Signature and location

```python
handle_starttag(self, tag, attrs)
```

Record links and IDs without running scripts.

### scripts/documentation/build.py:50 — write_managed

Signature and location

```python
write_managed(site, relative, content)
```

Write an artifact inside the site and return its byte hash.

### scripts/documentation/build.py:62 — verify_vendor

Signature and location

```python
verify_vendor()
```

Refuse changes to the runtime and default layouts copied from the skill.

### scripts/documentation/build.py:73 — root_landing

Signature and location

```python
root_landing(name)
```

Send the site root to the default guide without presenting a language choice.

### scripts/documentation/build.py:91 — compatibility

Signature and location

```python
compatibility()
```

Preserve legacy URLs and files without changing the default Carbon shell.

### scripts/documentation/build.py:128 — check_links

Signature and location

```python
check_links()
```

Check pages, images, exports and local anchors in the completed site.

### scripts/documentation/build.py:159 — export_markdown

Signature and location

```python
export_markdown()
```

Update only explicitly managed guides while preserving originals in the archive.

### scripts/documentation/build.py:174 — export_markdown.repository_link

Signature and location

```python
repository_link(match)
```

Adjust export links for the guide's repository location.

### scripts/documentation/build.py:198 — consumer_bundle

Signature and location

```python
consumer_bundle()
```

Generate the query bundle and include the distributed runtime's MIT license.

### scripts/documentation/build.py:221 — main

Signature and location

```python
main()
```

Run mapping/validation/build/export/preview without publishing or approving sources.

## Sources

- src/contracts/tools.ts
- src/service/application.ts
- src/service/server.ts

