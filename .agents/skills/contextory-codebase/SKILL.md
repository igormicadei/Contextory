---
name: contextory-codebase
description: Understand a connected workspace, locate definitions and related code, assess source impact, and recover relevant project decisions through Contextory. Use for codebase questions and before changes spanning related components.
metadata:
  version: "2"
---

<!-- contextory-managed-codebase -->

Use the Contextory capabilities advertised by the current client. A connected MCP server or packaged CLI supplies shared retrieval; hooks and editor language services are optional. The same workflow applies in any agent.

Start a code question or related edit with `contextory_code_context_get`: put the actual task in `query`, scope with known `paths` and optionally `specId`, and choose a bounded `budgetTokens`. Read the cited current files before deciding or editing. Read-only exploration does not require a tracked request.

Use `contextory_code_architecture_get` for orientation, `contextory_impact_get` for affected callers/dependencies/tests/records, `contextory_code_path_get` to explain a connection, and `contextory_flow_trace` for detailed branches/calls. Use `contextory_search` for earlier decisions, findings and changes, then inspect record state, revision and provenance. Resolve ambiguous symbols with `source:path#qualifiedName` where supported.

Keep source citations, graph snapshot, coverage and truncation attached to conclusions. Narrow or page bounded results. Static calls, test references and inferred contracts are possible relationships, not proof of execution or test coverage. Generated facts do not become approved requirements.

Saved edits refresh the source graph automatically; re-query relevant context after saving changes. Task/impact/path queries also verify disk content. Use `contextory_code_index_refresh` to recover an empty/stale/failed index or import regenerated Graphify data; repeated refresh cannot resolve every dynamic/external gap. Unsaved editor flow overlays are separate from the saved-file graph. If a capability is missing, use the packaged CLI or native source tools and state the gap; do not invent tool calls. Preserve the user's scope and native permissions.

Read [retrieval and coverage](references/retrieval.md) for tool inputs, paging, freshness recovery and headless use.
