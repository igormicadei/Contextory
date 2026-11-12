# Changelog

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
