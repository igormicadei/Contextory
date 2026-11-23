<a id="what-the-catalog-records"></a>
<a id="review-and-change-a-definition"></a>
<a id="migrate-an-existing-project"></a>
<a id="generate-application-documentation-through-mcp"></a>

<!-- Generated from .documentation/project.json; edit the bilingual corpus. -->

# Governed project knowledge

<a id="catalog-contract"></a>

## Describe intended application behavior

| Category | Required content |
| --- | --- |
| File | One source file and its responsibility |
| Rule | Invariant or condition; source and tests, or an explicit testGap |
| Feature | Observable capability; source and tests, or an explicit testGap |
| UI | Location, element, trigger, behavior and states; sources and tests or testGap |

Read contextory_catalog_get before related changes and page definitions, proposals and inventory independently. Generated entries begin as observations. A source graph describes possible relationships; it cannot approve a rule or infer intended interface behavior.

<a id="review-a-definition"></a>

## Review pending items in Approvals

A persistent review alert counts observed definitions and pending changes. The editor view also has a badge and offers Review now when exact pending record revisions change. Notifications are deduplicated per project across restarts; dismissing one leaves the review alert available.

1. Open Approvals beside Work and Requests, or use the persistent review alert. This tab contains only pending changes and observed baselines. Inspect sources, tests, state, revision and freshness. Use Tools > Knowledge separately to browse all definitions and file coverage.
2. Review baseline observations or the before/after content of a replacement or retirement. Enter a reason before approving or rejecting.
3. If Sources need review appears, open the changed files and check the definition. Enter a reason and choose Refresh source snapshot. This records current file hashes and keeps the item pending; approve or reject the refreshed revision separately. Missing files must be corrected or the outdated item rejected. A proposal against an older target revision must be rejected and replaced.

Saving, success and errors appear beside the review controls. Failed reviews keep the entered reason and do not approve anything. Controls remain disabled while a review is pending. Switching to Knowledge and back preserves the reason; Knowledge search filters do not hide the approval queue. Refreshing a snapshot never edits the definition or grants approval.

![The Approvals tab with a pending count, before/after changes and review controls.](../.documentation/assets/knowledge-preview.png)

Approvals rendered by the production webview with isolated example records; no real project approval was performed.

Approval belongs to the authenticated human Approvals tab. Agents cannot use its credentials or present observations as approved requirements. Pending proposals and stale affected approved definitions can block tracked completion.

<a id="knowledge-browser"></a>

## Browse Knowledge independently

1. Choose Tools > Knowledge to browse current and historical definitions, their source/test links and history.
2. Expand Find definitions & coverage, then filter by text, path or category. File inventory stays available in this browser.
3. Choose Approvals to review pending items. Knowledge filters and pagination do not affect that queue; reviewed items disappear from Approvals and remain discoverable in Knowledge.

![Project knowledge browsing without approval forms.](../.documentation/assets/knowledge-browser.png)

Knowledge browser using production UI and isolated fixture records.

<a id="migrate-existing-knowledge"></a>

## Bootstrap an existing project

Use the portable contextory-migrate skill within an authorized implementation request. contextory_catalog_migrate captures a bounded manifest and resumes by migrationId/cursor. Repeating the same operation/input returns the stored result. state=scanned means the file scan ended; it does not mean semantic review or approval is complete.

Inspect candidates against current source, callers, tests and historical decisions. Preserve contradictions, missing tests and unsupported runtime observations as explicit gaps. Reconcile files added after the captured manifest.

<a id="documentation-export"></a>

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
- tests/ui/catalog.spec.ts
- src/webview/main.ts
