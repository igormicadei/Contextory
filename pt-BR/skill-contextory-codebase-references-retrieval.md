# Referência de recuperação e cobertura

## Referência de recuperação e cobertura

Este é um recurso portátil de instruções distribuído sem alterações aos clientes suportados. O guia bilíngue vinculado explica sequência de tarefas, atualização das fontes, permissões e limites. Leia o SKILL.md instalado e suas referências ao aplicar a skill.

[Ler o guia bilíngue do fluxo](advanced.md)

Caminho do recurso canônico

```text
<!-- contextory-managed-resource -->

# Retrieval and coverage

## Hook recovery

Use `contextory_hooks_rebuild` only for an intended project's missing, stale or duplicate managed hooks: `{ "projectId": "<project>", "provider": "codex", "operationId": "<new unique ID>" }`. Supported providers are `codex`, `claude` and `bob`; Generic MCP has no hooks. The response separates changed hook files, launcher restoration and current-service MCP/hook observations. It never reads or writes native approval records, global hooks, MCP configuration or portable skills. Keep the exact operation ID/input for an interrupted retry; a later repair needs a new ID. Project/workspace scope is unchanged and reference codebases cannot be repaired through this tool.

If files are unchanged but hooks remain unobserved, review native trust and reload the affected session instead of issuing more rebuilds. The installed Codex client may distinguish `C:\\` and `c:\\` when looking up hook approval: use `/hooks` from the affected session's actual project path. When MCP is unavailable, the editor's **Contextory: Rebuild Agent Hooks** command or sidebar **Rebuild hooks** action can initiate recovery after the local service starts. Inspect service output if startup itself fails; rebuilding through MCP requires a reachable service.

## Choose the lookup

| Need                                                | Tool and useful inputs                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace contracts, active work, configured checks | `contextory_context_get`, optionally `specId`. This brief is cached orientation, not a fresh source investigation.                                                                                                                                                     |
| Locate code for a task                              | `contextory_code_context_get` with `query`, known `paths`, optional `specId` and `budgetTokens` (512–6000, default 3000). Exact definitions rank before mentions; neighborhoods and linked project records are bounded.                                                |
| Understand subsystems and entry points              | `contextory_code_architecture_get`. Default `refresh:true` verifies saved source; use `refresh:false` only when a cached overview is sufficient.                                                                                                                       |
| Find callers, dependencies, tests or linked work    | `contextory_impact_get` with `id`, `direction` (`reverse` for dependents, `forward` for dependencies, `both` for surrounding relationships), `depth` and `limit`.                                                                                                      |
| Explain how two things connect                      | `contextory_code_path_get` with `from`, `to`, optional `direction` (`forward` or `both`) and `maxDepth`. Returned edges retain their original direction.                                                                                                               |
| Inspect calls or branches                           | `contextory_flow_trace` with `root:{path,symbol}` or a zero-based position, `view: calls/flow`, `direction: outgoing/incoming`, and optional limits. Supported engines cover TS/JS and Python.                                                                         |
| Recover earlier intent and rationale                | `contextory_search` with a focused `query`, `mode` and `limit`; inspect full records with `contextory_entity_get`, including a cited `revision` when checking history. Verify current state before relying on an old decision.                                         |
| Continue a bounded result                           | `contextory_entity_get` uses `offset`/`limit` for children, job results and 400-character artifact pages. `contextory_history_get` uses the returned `nextBefore` as `before`. Flow pages/expansion use `contextory_flow_expand` with the original graph/snapshot IDs. |

For example, a task lookup can use `{"query":"How do provider connections install skills?","paths":["src/providers"],"budgetTokens":2000}`. Follow it with impact on the cited definition and inspect its current file and relevant callers. Avoid assuming this example's paths exist in another project.

Source tools accept file paths, unique names or `source:path#qualifiedName` where their schemas permit. Choose a path-qualified candidate when a name is ambiguous. A failed search or absent bounded path does not prove two components are independent. Inspect category, evidence locations and provenance for each material edge. Semantic unavailability has an explicit lexical fallback in hybrid search; semantic-only search may fail. Narrow query/path scope or page results when truncated instead of presenting a bounded slice as exhaustive.

## Freshness and coverage

Saved file create/edit/delete/rename, Git changes and configuration changes trigger debounced refresh, backed by polling. Task context, impact and path queries also verify disk content before answering. Re-query after relevant saves; do not request a full manual reindex after every edit. Source context describes saved files. Only trusted editor flow requests can carry unsaved overlays; their snapshots are separate and expire when documents change.

For an empty/stale/failed index, inspect status/errors and use `contextory_code_index_refresh` when a retry can help. For partial coverage, inspect the actual gaps: file/byte bounds may call for narrower reviewed configuration, while dynamic dispatch, callbacks and external code require native inspection. Repeated refresh does not create missing language support or execution evidence.

Native extraction covers TS/JS through its compiler and Python through isolated AST parsing. Markdown links and recognized configuration paths add explicit connections. Graphify JSON adds other language facts with supplied provenance. Changed cited source invalidates imported facts: regenerate the export and re-import using `contextory_code_index_refresh` with a workspace-relative `graphifyPath`; refresh alone cannot regenerate external analysis. Static calls, inferred message links and test references do not prove execution or coverage.

`contextory.project.json` holds reviewed configuration: schemaVersion 1, optional name, include/exclude patterns, entryPoints, conventions, maxFiles and maxBytes. Generated topology lives in rebuildable local storage; it does not approve requirements or overwrite authoritative work records. Consult user instructions and current decisions before treating a discovered convention as a constraint.

## Reference codebases

### Active workspace projects

Trusted local multi-root workspaces attach up to sixteen independent folder services. `contextory_workspace_get` lists public project IDs, names and canonical roots, plus attached workspace contexts; it never returns credential paths. All tools accept `projectId` and `workspaceId` as common scope. Selection applies only to that call. Omitting projectId/current stays on the server's project, regardless of the editor's selected project or earlier calls. Multiple attached editor contexts require workspaceId for cross-project operations. Unknown, detached or identity-changed projects fail; do not retry against a different project. Use the same projectId when reading returned record IDs, artifacts or graph pages. Keep the returned project identity with relative source paths and symbols. Read-only lookups never merge project memory.

The editor project selector scopes Requests, Knowledge, History, Versions, Architecture, checks and source navigation together; requests and specs carry project badges. Each folder retains its existing root-derived storage, ledger, graph, catalog, references, releases and checks. Removing a folder detaches its routing without deleting data. Shared/native hook observations stay with their observing project; usage is not inferred across project leases. A workspace is not a new merged project.

The CLI `projects [group-id] --descriptor <generic.json>` reads active membership or a coordinated request; `--project <id>` and `--workspace <id>` scope other CLI calls. A standalone service has only its local project until an editor attaches membership. Do not use codebaseId or a reference registration to authorize cross-project work. Coordinated requests use the workflow skill's project-owned branches.

When advertised, `contextory_codebase_list` returns the active workspace (`current`) and up to eight named local references. Register only a directory within the user's requested scope using `contextory_codebase_change` with `action:"add"`, an absolute `root`, optional `name`, and a new `operationId`. Registration resolves aliases and persists in the current service storage; it does not modify the reference. Detach using `action:"remove"`, its `codebaseId` and a new operation ID. Cached projections remain rebuildable service data.

Pass that ID as `codebaseId` on architecture, code context, search, impact, path, index/import and flow trace/expand calls. Paths, Graphify input and source IDs resolve inside that reference. References cannot use current-project `specId` or workflow mutations. Omission or `current` always means the active workspace, even after another reference query. Separate requests can analyze different references concurrently; there is no global project switch or inferred cross-repository relationship. Preserve each response's `codebase`, snapshot, coverage and citations when combining an explanation. A same-path/same-name symbol in two repositories is not the same source.

Reference context/impact/path/search and default architecture queries verify saved files on demand. References are not watched in the background. `refresh:false` explicitly uses cached architecture; use the default refresh after edits, and regenerate/re-import stale Graphify facts within the selected reference. Source files are parsed without executing them. Existing include/exclude/configuration and language coverage rules apply separately to each root. Reference search uses lexical graph matching (hybrid reports fallback); semantic-only reference search is unavailable. No active-project decisions, requirements, checks or unsaved editor overlays are imported into reference analysis.

CLI equivalents are `references`, `reference-add <folder> [--name <label>]`, `reference-remove <id>`, and source commands with `--codebase <id>`. Always keep `--root`/storage/descriptor on the current project whose reference registry you intend to use. Architecture in the editor offers **Add reference**, a **Codebase** selector and **Detach reference**; source navigation stays inside the selected root. Applying any learned behavior to the current application remains a separate user-authorized implementation task.

## Clients without a capability

Use only the tools advertised in the current session. After an extension upgrade, an existing connection may still expose older tools until the client reloads its MCP connection. Continue useful work with available search/flow tools, the packaged CLI, or native `rg`/file reads; state the missing graph coverage when it affects conclusions. Hooks are advisory and optional.

Run `node <installation>/dist/contextory.mjs help` for current CLI inputs. `context`, `impact`, `path`, `architecture` and `index` return JSON; `mcp` starts a hook-free stdio server. Supply the intended `--root` and either the existing service `--descriptor` or deliberately chosen `--storage` so the client reads the intended workspace and ledger. CLI code lookups do not replace MCP workflow mutations. Preserve the user's task and the host's permissions.

## Application definitions and documentation

Use `contextory_catalog_get` for file purposes, rules/features, UI placement/interactions, declared tests, pending proposals and source freshness. Record/proposal/inventory cursors are independent; keep paging each until exhausted. `contextory_project_export` overview enumerates stored documentation datasets; page current records, immutable revisions, history, relationships, source facts, jobs, usage metadata and artifacts with `offset`/`limit`. Keep sequence/snapshot and observed/approved/retired state. Use exact revisions for historical docs and current source for current behavior. The export grants no approval and exposes no service credentials or native conversations. Large result envelopes are read with `contextory_entity_get`.

```

## Fontes

- skills/contextory-codebase/references/retrieval.md

