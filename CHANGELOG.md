# Changelog

## 0.4.0 — 2026-11-17

- Add persistent named local reference codebases with isolated source indexes and concurrent architecture/context/impact/path/search/flow analysis. Keep current-project defaults, work records and source files separate.
- Add Architecture reference selection, folder registration, detachment and scoped source/flow navigation; ignore responses from previous repository selections.
- Expose reference registration/listing and explicit source-tool selection through native/headless MCP and the CLI; update portable agent skills and user/developer guidance.

## 0.3.1 — 2026-11-16

- Publish ASCII-safe generated documentation JavaScript and pin the Pages deployment action to its release commit.
- Derive documentation source-link tags and live release-page verification from the package version.
- Refresh current installation links, site navigation and release documentation; repackage the extension as 0.3.1 with matching VSIX/checksum assets.

## 0.3.0 — 2026-11-16

- Add a persistent, rebuildable TS/JS and Python source graph with stable symbols, imports/calls/references/inheritance, test/document/config links, inferred literal message contracts and source provenance. Add validated `contextory.project.json` coverage and entry-point settings.
- Keep graph snapshots current through content/config hashes, AST reuse, background filesystem/Git refresh, deletion/rename cleanup and transactional Graphify import with source-hash invalidation.
- Retrieve ranked task context with project memory and explicit byte budgets. Add source/record impact, bounded relationship paths, architecture summaries and cached workspace orientation.
- Add a visual Architecture workbench with subsystem maps, scoped file/symbol navigation, breadcrumbs and Back, typed/directional neighborhoods, a coordinated inspector and a dependency matrix. Preserve cited source/record navigation and freshness/coverage notices.
- Improve Code map with a stable layered canvas, synchronized step list and inspector, direct connection highlighting, relationship filters, focused neighborhoods, zoom/pan/fit and keyboard navigation.
- Package canonical Agent Skills and references through capability-based Codex/Claude/Bob/generic adapters. Add generic MCP export and standalone CLI/stdio MCP without editor heartbeat or hook requirements.
- Synchronize agent guidance for task lookup, relationship navigation, source verification, graph freshness and missing capabilities. Share runtime instructions across native/headless MCP, workspace briefs and hook reminders; add project entry instructions and ownership-safe skill-only workspace sync with drift checks.
- Restore post-compaction agent reminders by returning the cached brief for that lifecycle event; verify session, prompt and post-compaction outputs across native adapters.
- Add retrieval/graph/freshness/import/migration/headless/client/UI regression coverage and a repeatable checkout evaluation. Preserve existing project records with additive schema 4.

- Publish the 0.3.0 VSIX and SHA-256 release assets. Update installation and upgrade guidance and provide the full searchable documentation on GitHub Pages from an orphan `gh-pages` branch, with reproducible builds and automatic deployment.

## 0.2.6 — 2026-11-13

- Detect installed Codex and Claude Code extensions and recognize the IBM Bob host. Prepare all detected agents at early startup, without opening Contextory, choosing a default, or starting a native session first; rescan when installed extensions change.
- Add a footer **Auto-connect** switch, command and `contextory.autoConnect` setting to pause automatic setup without removing existing bridges or project records. Default `contextory.startupAgent` to `auto`, retaining fixed/last-used modes and explicit workspace disconnects.
- Serialize provider configuration and isolate each provider's errors, so one conflicting configuration does not prevent another detected agent from being prepared.
- Advertise the complete MCP tool catalog before the workspace service is ready. Wait up to 15 seconds for service readiness through a read-only handshake, then execute the requested tool once; retain descriptor rotation support for existing native connections.
- Preserve native trust and session ownership. Codex and Claude expose no public command for Contextory to force MCP reload, so first-time setup or an already-running native session can still require approval or a native extension/session restart.

## 0.2.5 — 2026-11-13

- Adapt the movable Contextory view to a wide Panel: compact header/navigation, request grid and recent-activity columns, request list beside a spec inspector, bounded history and source-diagram scrolling, and pinned agent controls.
- Preserve selected specs, detail tabs, expanded milestones, drafts and independent scroll positions while resizing or switching layouts. Keep narrow views in the sidebar layout and follow the active theme.
- Display the workspace name in every view's header, with the full path on hover and ellipsis for long names.
- Prepare MCP/hooks at startup using the last agent used in the workspace, falling back to the last agent used elsewhere. Add `contextory.startupAgent` for a fixed provider or no automatic selection; preserve explicit workspace disconnects and start after workspace trust is granted.

## 0.2.4 — 2026-11-12

- Record native agent model metadata and Codex per-request token usage through hooks, with timestamps, session/turn IDs, request status, and optional spec attribution.
- Add a specification Usage tab, request/spec report summaries, and the read-only `contextory_usage_get` MCP tool.
- Keep missing counters unavailable, preserve retries and model changes, and leave ambiguous or unmatched sessions unassigned. Cached and reasoning counters remain subsets, and no billing or quota is inferred.
- Keep capture local and bounded, without reading transcripts, prompts, tool inputs, or tool results. Claude model-switch hooks require Claude Code 2.1.251+; Bob's documented hooks expose neither model nor token counts.

## 0.2.3 — 2026-11-12

- Rename the extension to **Contextory**, including its commands, settings, MCP tools, hooks, workflow skills, reports, documentation, and package identity.
- Add a request-card/context-network icon for the activity bar, sidebar header, and extension listing.
- Follow active VS Code themes immediately across sidebar, code-flow, and relationship views, including custom themes and both high-contrast modes. Keep request navigation and drafts intact during theme changes.
- Add public installation, daily workflow, agent-tool, troubleshooting, development, and release documentation, with repository metadata and downloadable VSIX/checksum assets.

The new identity is `contextory-local.contextory-workspace`. Disconnect builds installed under the former name before replacement. Their project data remains in the former storage and is not imported automatically.

## 0.2.2 — 2026-11-12

- Add spec progress bars to all open requests in Overview and remove its introductory heading.
- Pin compact native-agent controls to the sidebar footer.
- Open readable relationships in a dedicated workbench view, with titles, summaries, IDs, source references, directions, and rationale.
- Link related records back to their owning request/spec and explanation tab.

## 0.2.1 — 2026-11-12

- Add all open requests, three readable recent activities, full linked history, inline milestone/spec details, and descendant-aware request search.
- Export request-scoped implementation reports and completed-work changelogs.
- Add isolated Python AST calls and flow analysis, remembered source cursors, incoming calls, bounded expansion, and unsaved overlays.
- Return explicit completion instructions after an agent submits an outcome; roll completion/reopen state up through milestones and requests.

## 0.2.0 — 2026-11-12

- Replace the extension-owned chat/router with native Codex, Claude Code, and IBM Bob integration through MCP and advisory hooks.
- Introduce an isolated Node 24+ workspace service with SQLite records, immutable revisions, leases, dependencies, findings, decisions, evidence, outcomes, and independent checks.
- Add lexical and optional local vector/hybrid retrieval, explicit relationships, and bounded TypeScript/JavaScript source analysis.
- Remove obsolete routing/chat code, fixtures, and documentation. Git history retains the previous implementation.
