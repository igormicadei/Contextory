# Interface walkthroughs

## Work and Requests

1. Open Contextory and select the owning Project. Work shows the current specification, recorded criterion evidence, running checks, blockers and latest meaningful work. An empty project offers a new request.
2. Choose Requests and + New request. Enter Title and What should change?, select affected projects when needed, then Create request. Open one request to inspect its plan; expand its brief and actions only when needed.
3. Expand a milestone, select its spec and open Specification details for the plan, issues, decisions, evidence, outcome, usage or history. The evidence counts describe recorded verification; they do not estimate time remaining.
4. Use Tools for Knowledge, Versions, History, Code map and Architecture. Request exports and relationship links remain available in the selected request or specification.

![Request list beside the selected specification.](../assets/panel-requests.png)

Requests in a horizontal editor Panel.

While a project switches, the UI shows Switching project and ignores replies from the previous project. Switching projects clears unfinished form drafts. During an operation, a progress indicator and status notice report activity or failure.

## Inspect architecture and source flow

1. Open Tools > Architecture or run Contextory: Explore Architecture. Select a subsystem, file and symbol in the coordinated map, tree and inspector.
2. Use Explore connections and the relationship/direction filters. Matrix rows depend on columns; a reciprocal marker identifies direct dependencies in both directions.
3. For detailed flow, place the editor cursor in a source function and run Contextory: Trace Flow from Here, or use Code map. Select a step to inspect calls, branches and source.
4. Use zoom, Fit, background drag and source buttons. If no indexed connections appear, choose another scope or Refresh code index and review coverage notices.

![Subsystem map, repository explorer and source inspector.](../assets/architecture-explorer.png)

Architecture explorer captured from Contextory.

![Flow steps, directed diagram and source inspector.](../assets/code-map-explorer.png)

Bounded source-flow explorer in Contextory.

## Use Approvals, Knowledge and Versions

1. Open the Approvals tab or the review alert to review pending items. The tab shows a pending count and contains no already-reviewed definitions. Use Tools > Knowledge for definition search and source coverage.
2. For an observed baseline or pending change, read the exact proposal and enter a review reason before Approve baseline, Approve change or Reject. Only a human uses these review controls.
3. Open Tools > Versions to inspect the current version, commits and release plans. Review version, files and changelog before applying; Publish is a separately authorized release action.

![Project versions and release details in the editor Panel.](../assets/panel-versions.png)

Versions captured from the application.

[Understand definition review and source freshness](knowledge.md)

[Understand release planning and publication](releases.md)

## History, layout and keyboard use

1. Open Tools > History, or the selected request/specification history. Filter its scope and use Load older activity to page earlier events.
2. To use the horizontal layout, move Workspace Tasks to the editor Panel and resize it. Wide, short views place the request list beside the specification inspector.
3. Use Tab to reach controls, Enter or Space to activate map nodes, arrow keys on focused canvases and Ctrl+wheel to zoom. The interface follows the current editor theme and high-contrast colors.

![History filters and chronological audit events.](../assets/panel-history.png)

Project history in the editor Panel.

Resizing or docking preserves selection, drafts, expanded details and scroll within the same project. Narrow sidebars stack work and details; wide, shallow panels split them. Loading, errors and retained last-received data stay explicit. Screenshots show the production webview with isolated example records, not an authenticated native-agent chat.

## Sources

- src/webview/main.ts
- src/webview/architecture.ts
- src/webview/flow.ts
- src/webview/catalog.ts
- src/webview/versions.ts
- tests/ui/sidebar.spec.ts
- tests/ui/catalog.spec.ts
- src/extension.ts
- src/service/reconnect.ts
- src/service/rpc.ts
- src/webview/progress.ts
- tests/ui/console.spec.ts
- tests/integration/recipe-configuration.test.ts
- scripts/verify-background-startup.mjs
- src/knowledge/catalog.ts
- tests/integration/catalog.test.ts

