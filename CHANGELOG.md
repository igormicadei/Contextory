# Changelog

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
