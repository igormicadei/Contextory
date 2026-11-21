# Code intelligence and advanced workflows

## Retrieve current task context

1. Start with contextory_workspace_get, then pass the intended projectId on every related call. UI selection never changes an agent server’s local default.
2. Call contextory_code_context_get with the actual task, known paths and a bounded budgetTokens value. Read the cited current source.
3. Use architecture for orientation, impact for dependencies/callers, path for connections, and flow trace for detailed calls/branches. Use search for earlier decisions and inspect their current state and revision.
4. Re-query relevant source after saved changes. Saved-file graphs refresh automatically; unsaved editor flow overlays remain separate. Page or narrow truncated results.

![Subsystem map, repository explorer and source inspector.](../assets/architecture-explorer.png)

Architecture explorer captured from Contextory.

Task-context arguments; replace the project ID

```json
{ "projectId": "PROJECT-ID", "query": "How are retries bounded?", "paths": ["src"], "budgetTokens": 3000 }
```

Qualify ambiguous definitions as source:path#qualifiedName. Task context accepts 512–6000 estimated tokens and caps JSON UTF-8 bytes at three times the estimate. Graph links and test references do not establish observed execution or complete behavioral coverage.

## Compare a reference repository

1. In Architecture, choose Add reference and select an authorized absolute local directory. Up to eight references can be registered per project.
2. Choose that Codebase, or pass its returned codebaseId on source/flow calls. Keep its identity and root with every citation.
3. Detach reference removes the registration while preserving source files. Registration and inspection do not authorize implementation in either repository.

Inspect an explicitly chosen reference

```powershell
node dist/contextory.mjs reference-add C:/Sources/LegacyApp --root C:/Projects/NewApp --name "Legacy app"
node dist/contextory.mjs references --root C:/Projects/NewApp
node dist/contextory.mjs architecture --root C:/Projects/NewApp --codebase ref-ID
```

Use actual returned IDs. References have separate source projections, refresh on queries and exclude the active project’s work records. Missing roots fail explicitly. Reference search is lexical; semantic-only mode is unavailable.

## Configure extraction and coverage

Optional contextory.project.json

```json
{
  "schemaVersion": 1, "name": "Checkout",
  "include": ["src/**", "tests/**", "docs/**", "*.json"],
  "exclude": ["src/generated/**"], "entryPoints": ["src/main.ts"],
  "maxFiles": 2000, "maxBytes": 16777216
}
```

TypeScript/JavaScript uses the TypeScript compiler; Python uses isolated AST parsing without importing workspace modules. Dynamic dispatch, framework injection, dependency implementation and unsupported languages remain gaps. The default input budget is 2,000 files/16 MiB, up to 512 KiB per file; configurable limits reach 10,000 files/64 MiB. Extraction caps and truncation are reported.

## Import optional Graphify data

Refresh/import arguments

```json
{ "graphifyPath": "graphify-out/graph.json" }
```

Pass these arguments to contextory_code_index_refresh. The importer checks schema, bounded JSON, IDs, edge endpoints and included local source paths; failures preserve the previous import. Regenerate and re-import the entire graph when a cited source changes, disappears or is excluded. Graphify is optional and its provenance/accuracy limits remain visible.

## Sources

- src/codebase/queries.ts
- src/codebase/extract.ts
- src/codebase/references.ts
- src/codebase/import.ts
- src/codebase/config.ts
- src/analysis/engine.ts
- tests/integration/codebase.test.ts
- tests/integration/references.test.ts

