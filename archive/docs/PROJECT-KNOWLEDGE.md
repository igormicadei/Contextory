# Governed project knowledge and documentation

Contextory can keep a durable description of an application alongside its rebuildable source graph. Static extraction finds definitions and possible relationships; it cannot establish every business rule, infer intended layout or approve a requirement. The project catalog supplies that layer with provenance and immutable history.

## What the catalog records

| Category | Definition                                                         | Validation                                                                     |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| File     | One file's responsibility and source location                      | Current source fingerprint; missing descriptions appear in the paged inventory |
| Rule     | An invariant, restriction or conditional behavior                  | Specific test file/symbol references, or an explicit test gap                  |
| Feature  | An observable application capability                               | Source and test references, or an explicit test gap                            |
| UI       | Location/grouping, element, trigger, resulting behavior and states | Handler/layout sources and behavioral tests, or an explicit test gap           |

UI definitions explain what a button or value change does, including navigation, persistence and relevant initial/loading/error/disabled states. Pixel accuracy and dynamic behavior still require appropriate observation. A test reference is a declared link, not proof that a test ran or covers every branch. Independent checks remain separate evidence records.

The existing ledger stores `knowledge`, `knowledge_change` and `migration` entities without replacing earlier records. Definitions participate in search and source relationships. Revisions, approval actors/reasons, rejected proposals and retirements remain recoverable. Request reports include definitions and before/after changes; their changelog includes decisions, migrations and catalog events, including observations labeled with their state.

## Review and change a definition

The native agent reads `contextory_catalog_get` before related work, inspects current source and creates an observed definition through a leased `contextory_catalog_change`. Rule/feature/UI entries require tests or a written `testGap`; UI entries require all five interaction fields. Legacy projects with no catalog retain prior completion behavior; portable workflow instructions tell agents to initialize source-backed records within authorized implementation scope.

Open **Knowledge** in the Contextory sidebar/panel. Filter by category, text or source path, inspect source/test references, state and freshness, and enter a review reason before selecting **Approve baseline** or **Reject**. Generated file descriptions remain observations until semantic review. Approval is bound to the exact record revision and source fingerprints.

To alter or remove an established definition, the agent proposes a replacement or retirement with the target ID, current revision and reason. **Pending changes** shows before/after definitions, reason and target revision. **Approve change** applies that exact proposal and records the human reviewer; **Reject** keeps the existing definition. Competing proposals fail if their target revision is obsolete. Refresh stale candidates before approving them. Deleted sources can still have their old definition retired with an explicit reason; deletion never deletes history.

The service enforces approval through the authenticated UI role. Native MCP and hook credentials cannot self-approve or gain that role by passing `human:true`. Agents must not borrow UI credentials. Headless agents can collect observations/proposals and produce documentation; approval waits for a human review surface attached to the same ledger. This is a local collaboration boundary, not a sandbox against a process with unrestricted filesystem access to service credentials or SQLite.

When a catalog exists, outcomes require `catalog:{recordIds,explanation}` to explain updated definitions, retirements or why behavior remains unchanged. Pending proposals under the spec and stale approved definitions in the declared source scope block submission/completion. Revising an accounted definition after submission invalidates the outcome. These checks expose catalog drift; they cannot detect arbitrary semantic omissions, unregistered features or native edits outside tracked scope. Hooks are advisory; server checks work without hooks. File counts do not prove behavioral completeness.

## Migrate an existing project

Ask the native agent to use the portable [contextory-migrate skill](../skills/contextory-migrate/SKILL.md). It is the migration agent delivered to Codex, Claude Code, IBM Bob and generic clients; Contextory does not host an additional model or scheduler.

`contextory_catalog_migrate` takes a spec lease, operation ID and bounded batch limit. The first call captures a sorted authorized workspace manifest. Later calls pass the migration ID and resume its durable cursor. Repeating the exact operation ID/input returns the recorded result. Existing file descriptions are preserved. Missing, inaccessible or oversized inputs retain gaps. Graph symbols supply starting descriptions where available; unsupported files explicitly require source review.

The scan ends at `state:scanned`, not an approved or semantically complete baseline. The agent then reads source, callers, documentation, tests and historical decisions by subsystem; proposes meaningful file purposes; and adds rule, feature and UI candidates. Contradictions become findings. Missing tests, dynamic behavior and unavailable runtime inspection remain explicit. The agent reconciles the current inventory to catch files added after the captured manifest, and records a scoped migration report. Only the human approves reconstructed definitions; the migration request does not retroactively approve each inferred rule.

## Generate application documentation through MCP

Read-only documentation needs no implementation request. Call `contextory_project_export` with:

```json
{ "section": "overview" }
```

This discovers datasets/counts, configured checks, coverage, architecture, semantic availability and agent guidance. Then page each needed section with `offset` and `limit` (1–50), following `nextOffset` until null:

```json
{ "section": "records", "offset": 0, "limit": 20 }
```

| Section                                    | Stored information                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `records`                                  | Current requests, milestones, specs, sessions, issues, decisions, evidence, outcomes, catalog definitions/proposals and migrations |
| `revisions`                                | Every immutable record revision, including definitions and reviews                                                                 |
| `history`                                  | Ordered audit events, actors, times and details                                                                                    |
| `relationships`                            | Hierarchy and explicit record/source/test links                                                                                    |
| `code_files`                               | Indexed paths, language and hashes                                                                                                 |
| `code_nodes`, `code_edges`, `code_imports` | Stored source facts, snippets, relationships and imported analysis provenance                                                      |
| `jobs`                                     | Independent check executions, results and artifact references                                                                      |
| `usage`                                    | Observed native model/token metadata and attribution; no conversations                                                             |
| `artifacts`                                | Retained check output and exported reports/data                                                                                    |

`entityId` filters an exact record in records/revisions/history, either endpoint in relationships, and a spec's jobs/usage. For descendant history or aggregate usage, use `contextory_history_get` or `contextory_usage_get`. Use `contextory_entity_get` for an exact revision and `contextory_catalog_get` for fresh source fingerprints. Catalog record, proposal and inventory pagination are independent: follow every returned cursor. Reference graphs remain isolated and use their existing explicit `codebaseId` source tools.

List artifacts, then read a returned file name with `section:artifacts` and `artifact`. Artifact offsets/limits count 400-character units; other sections count rows. Large responses may return an `ART-` envelope; read it through `contextory_entity_get`. Credential descriptors, native chat transcripts, unrelated files and numeric retrieval embeddings are outside this documentation export. Temporary flow graphs remain readable through trace/expand while their handles are valid.

Every export retains ledger sequence and source snapshot identity. Exports describe stored facts without silently refreshing historical evidence. Re-query current source for current documentation, and restart changed datasets when constructing a consistent document. Agents can produce architecture guides, file catalogs, feature manuals, rule/test matrices, interaction specifications, migration reports and decision changelogs while labeling approved/observed/retired state, evidence origin, stale sources and coverage limits.

After upgrading, reload the client's MCP connection if it still advertises an older tool catalog. See [MCP tools](MCP-TOOLS.md) and [development](DEVELOPMENT.md) for packaging and managed resource synchronization.
