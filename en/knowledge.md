# Governed project knowledge

## Describe intended application behavior

| Category | Required content |
| --- | --- |
| File | One source file and its responsibility |
| Rule | Invariant or condition; source and tests, or an explicit testGap |
| Feature | Observable capability; source and tests, or an explicit testGap |
| UI | Location, element, trigger, behavior and states; sources and tests or testGap |

Read contextory_catalog_get before related changes and page definitions, proposals and inventory independently. Generated entries begin as observations. A source graph describes possible relationships; it cannot approve a rule or infer intended interface behavior.

## Review an exact definition revision

A persistent review alert counts observed definitions and pending changes. The editor view also has a badge and offers Review now when exact pending record revisions change. Notifications are deduplicated per project across restarts; dismissing one leaves the review alert available.

1. Open Knowledge, choose a definition and inspect its sources, tests, state, revision and freshness.
2. Review baseline observations or the before/after content of a replacement or retirement. Enter a reason before approving or rejecting.
3. Refresh stale candidates before approval. Competing proposals must match the exact current target revision. Rejections keep the original definition and all revisions remain retained.

![Knowledge definitions and a before/after review proposal with example payment records.](../assets/knowledge-preview.png)

Production Knowledge webview rendered with isolated test-fixture records; no project approval was performed.

Approval belongs to the authenticated human Knowledge UI. Agents must not use UI credentials or present generated observations as approved requirements. Pending proposals and stale affected approved definitions can block tracked completion.

## Bootstrap an existing project

Use the portable contextory-migrate skill within an authorized implementation request. contextory_catalog_migrate captures a bounded manifest and resumes by migrationId/cursor. Repeating the same operation/input returns the stored result. state=scanned means the file scan ended; it does not mean semantic review or approval is complete.

Inspect candidates against current source, callers, tests and historical decisions. Preserve contradictions, missing tests and unsupported runtime observations as explicit gaps. Reconcile files added after the captured manifest.

## Export stored documentation datasets

Discover and page project exports

```json
{ "section": "overview", "offset": 0, "limit": 20 }
```

Call contextory_project_export with the selected projectId. Page records, revisions, history, relationships, code_files, code_nodes, code_edges, code_imports, jobs, usage and artifacts until nextOffset=null. Keep sequence/snapshot, current versus historical state, provenance and source freshness. Artifacts use 400-character units; other datasets page rows.

This export excludes credentials, native conversations and numeric embedding vectors. Large responses may return artifact handles for further paging. A read-only export needs no implementation request.

## Sources

- src/knowledge/catalog.ts
- src/knowledge/catalog.ts
- src/knowledge/export.ts
- src/webview/catalog.ts
- tests/integration/catalog.test.ts
- src/extension.ts
- src/service/reconnect.ts
- src/service/rpc.ts
- src/webview/progress.ts
- tests/ui/console.spec.ts
- tests/integration/recipe-configuration.test.ts
- scripts/verify-background-startup.mjs

