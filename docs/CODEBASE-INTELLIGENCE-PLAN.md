# Codebase intelligence and agent portability

Authorized 2026-11-16. Tracking request: REQ-cd9f8775.

## Delivery status — 2026-11-16

All six stages are implemented in version 0.3.0. The complete check passes 56 backend tests and 23 UI tests. The extracted VSIX passes the VS Code and IBM Bob host scenarios. Both portable skills validate, and the repeatable checkout evaluation passes definition ranking, expected-file recall, call/contract correctness, decision linkage, freshness and response budgets. See the [validation record](VALIDATION.md), [usage and qualification limits](CODEBASE-INTELLIGENCE.md), and local `artifacts/contextory-workspace-0.3.0.vsix` with its SHA-256 file. The original implementation delivery was local. Publication is tracked separately under REQ-c51fae9d; see the [0.3.0 release notes](releases/v0.3.0.md).

| Stage | Tracked specification | Delivered implementation                                                                                                             |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | SPEC-61020633         | `src/codebase/{model,config,extract,python-index,worker}`, additive SQLite schema 4                                                  |
| 2     | SPEC-04afbcf9         | Serialized index publication, content/config/import hashes, watcher/poll, literal contracts, validated transactional Graphify import |
| 3     | SPEC-0bb5e79d         | `CodeQueries`, exact-definition seeds, project memory, byte-budgeted context, source/record impact, paths and architecture           |
| 4     | SPEC-d2fabd1c         | Architecture sidebar/workbench, source/record actions, state/coverage, cached orientation                                            |
| 5     | SPEC-b48bad9c         | Canonical packaged skills, capability adapters, generic MCP export, standalone CLI/stdio lifecycle                                   |
| 6     | SPEC-dd0f9c36         | Integration/UI/host coverage, repeatable evaluation, complete guides, package inspection and local distributable                     |

## Outcome

Contextory maintains a local, persistent model of source structure and connects it to project decisions, requests, findings and verification evidence. Native agents obtain relevant, cited context through the same MCP contracts. The extension presents architecture and source navigation; portable skills teach the workflow. Hooks and editor language services enhance the experience without being prerequisites for code intelligence.

This program includes all six stages below. Implementation and local packaging are authorized; external publishing is not part of delivery. Existing uncommitted work is preserved. Graphify is a design reference and optional input format, not a required Python/parser installation.

## Delivery stages

| Stage                        | Deliverables                                                                                                                                                                                                                                                                                                                             | Acceptance                                                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Persistent graph          | Additive SQLite projections for files, stable symbols, typed edges, source spans, extractor identity and snapshots. TS/JS compiler extraction; isolated Python AST extraction; Markdown sections and explicit source references; manifests and test classification. Reviewed project configuration stays separate from discovered facts. | Definitions survive line shifts without changing identity. Aliased cross-file calls resolve. Ambiguous/external targets are explicit. Old ledgers migrate without losing records. Indexing never executes workspace modules.                                                  |
| 2. Freshness and integration | Content/configuration/extractor fingerprints; changed-file parse reuse; graph relationship re-resolution; deletion/rename cleanup; debounced background refresh including external edits and branch changes. Contract edges for RPC, MCP, worker and webview messages. Optional validated Graphify JSON import.                          | Changed exports cannot leave old resolved edges. Deleted and excluded files disappear. Import failures preserve the previous usable graph. No relationship is asserted solely because unrelated identifiers share a label.                                                    |
| 3. Unified retrieval         | Exact-symbol ranking before lexical/semantic seeds; bounded neighborhood expansion; project-memory references; task-context MCP tool; source/record impact; shortest relationship paths; architecture summaries and coverage metadata.                                                                                                   | Definition ranking, cross-file callers, relevant tests/decisions and explainable paths work on realistic fixtures. Output budgets include envelope metadata. Missing/stale/unsupported results remain explicit. Read-only questions need no tracked request.                  |
| 4. Extension experience      | Architecture workbench with subsystem dependencies, entry points, query/inspect/refresh and validated source links. Workspace brief includes bounded orientation and index state. Existing flow/record panels remain available.                                                                                                          | Theme/responsiveness and navigation work in browser/editor fixtures. Empty, building, partial and failed index states have useful actions. Startup hooks consume cached bounded context rather than indexing synchronously.                                                   |
| 5. Portable execution        | Canonical `contextory-codebase` and `contextory-workflow` skills with progressive references; deterministic client packaging; capability-based adapter registry for existing clients and generic MCP; CLI query/index/impact/path/architecture/import commands and standalone stdio MCP lifecycle.                                       | Skill packaging check detects drift. Generic clients use the same contracts without hooks. Headless execution does not require an editor heartbeat or language service. Existing Codex/Claude/Bob registration and native permissions remain intact.                          |
| 6. Evaluation and delivery   | Graph/retrieval/freshness/import/client/headless/UI tests; repeatable evaluation with definition rank, relevant-file retrieval, relationship correctness, size and latency measurements; complete documentation and package inspection.                                                                                                  | Full type/build/core/integration/analysis/UI checks pass. Relevant host smoke checks pass where available. Package contains workers, parser and skill resources. Report actual measurements and unqualified native/cloud/language cases without inventing performance claims. |

## Architecture and invariants

- Keep graph projections separate from authoritative versioned work records. Rebuildable indexes never approve findings, dependencies or evidence.
- Reuse SQLite and isolated Node workers. Resolve TS/JS with its compiler and project configuration; use Python in isolated AST-only mode. Optional imported languages retain importer coverage and provenance.
- Symbol identity is project-relative path + qualified declaration identity and kind, not a mutable line number or a lowercased label. Renames are removal/addition unless an explicit identity migration exists.
- Every structural edge carries its evidence location, extractor and resolution category. Static possibility is not runtime proof; inferred contract links stay distinguishable.
- The project manifest defines exclusions, entry points and reviewed conventions. Generated topology and index state remain local storage projections.
- Refresh is serialized and publishes one coherent snapshot. Content hashes verify query freshness; unsaved editor overlays remain a separate flow-analysis feature.
- Retrieval prioritizes definitions and task paths, controls hub expansion and preserves enough edge evidence to explain why a result was included. Queries never imply exhaustive impact.
- Portable skill contents remain shared. Adapters own discovery paths, MCP configuration and supported lifecycle features. Generic MCP functionality is the minimum path; optional hooks cannot become correctness requirements.

## Validation and completion

Track each stage through the Contextory request. Record material design choices and findings. Run independent configured checks against the final source snapshot, submit outcomes with evidence for every criterion, and explicitly complete all specifications. Export the request report. Keep the plan status and user documentation aligned with delivered behavior.

## References

- Local Graphify checkout: `C:/Projetos/graphify`, version 0.9.111, inspected as reference; no code is copied without retaining its license obligations.
- [GitHub: Build once, run on any agent](https://github.blog/ai-and-ml/github-copilot/build-once-run-on-any-agent-a-practical-guide-to-agent-skills/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Client integration guidance](https://agentskills.io/client-implementation/adding-skills-support)
