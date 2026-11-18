# Contextory user guide

Version 0.3.0 adds **Architecture**, task-context/source-impact/path tools, optional Graphify import, portable skills, **Export Generic MCP Connection** and headless CLI/MCP. Follow the [codebase intelligence guide](CODEBASE-INTELLIGENCE.md) for configuration, client paths, examples and coverage limits. Existing editor records are preserved by the additive schema 4 migration.

Contextory manages development requests and gives native agents a shared record of what was requested, what changed, and why. The developer continues talking to Codex, Claude Code, or IBM Bob in that agent's normal chat.

## Reference repositories (since 0.4.0)

In **Architecture**, use **Add reference** to register another local codebase, then choose it in **Codebase**. You and your agent can inspect its architecture and source alongside the current project, with separate indexes and source identity. **Detach reference** leaves its source untouched. Analysis alone does not apply changes to the current application. See [reference codebases](CODEBASE-INTELLIGENCE.md#analyze-reference-codebases) for agent and CLI examples, persistence and coverage.

## Requirements

| Requirement                                 | When it is needed                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Windows, one trusted local project folder   | The deployment qualified by this preview. Multi-root and remote workspaces are not qualified.                            |
| VS Code 1.96+ or IBM Bob                    | The extension host. Packaged checks ran on VS Code 1.145.3 and Bob's VS Code API 1.126.0.                                |
| Node.js 24+ with `node:sqlite`              | Runs the isolated workspace service; configured through `contextory.nodeExecutable` if Node is not on the editor's PATH. |
| Native Codex, Claude Code, or IBM Bob agent | Install and authenticate it separately to work from its native chat.                                                     |
| Python 3.10+                                | Required only for Python code-flow analysis; set `contextory.pythonExecutable` if necessary.                             |
| Optional embedding runtime/model            | Required only for semantic retrieval. Lexical search works without it.                                                   |

## Install the VSIX

1. Download `contextory-workspace-0.5.0.vsix` and its `.sha256` file from the [v0.5.0 release](https://github.com/igormicadei/Contextory/releases/tag/v0.5.0).
2. Optionally compare the checksum using PowerShell:

   ```powershell
   (Get-FileHash -Algorithm SHA256 .\contextory-workspace-0.5.0.vsix).Hash.ToLowerInvariant()
   Get-Content .\contextory-workspace-0.5.0.sha256
   ```

3. In the editor's Extensions view, use **… → Install from VSIX…** and select the package. In VS Code, `code --install-extension .\contextory-workspace-0.5.0.vsix` is an alternative.
4. Reload if prompted. Open the project as a single folder and trust it before connecting agents or running checks.
5. Select the Contextory activity-bar icon: a request card connected to context nodes.

The extension is distributed as a GitHub release asset. You do not need to clone the repository or install its development dependencies to use the package.

Version **0.5.0** adds governed knowledge, project-wide versions, documentation export and native connection recovery; it includes code intelligence and portable execution. Automatic discovery and the pause switch were introduced in 0.2.6. The [release notes](releases/v0.5.0.md) describe project knowledge, release controls, native connection recovery, installation and qualification limits. Browse the [full documentation](https://igormicadei.github.io/Contextory/) for searchable guides and references.

## Connect a native agent

Open a trusted local folder and Contextory automatically prepares every detected supported agent. It recognizes the installed Codex (`openai.chatgpt`) and Claude Code (`Anthropic.claude-code`) extensions, and IBM Bob through its editor host or built-in agent extension. Detection does not activate the native extensions or start a conversation. Agents installed later are detected when the editor reports its extensions changed.

To prepare an agent manually, click its name in the sidebar footer or use the corresponding **Contextory: Connect Native …** command. Connection writes an owned MCP server entry, lifecycle hooks, and both codebase/workflow skills into the project. It preserves unrelated configuration and leaves global provider settings and native permission policies alone.

After first installation or changes to MCP/hooks or their runtime, Contextory offers **Restart Extension Host** once for that setup. This uses the editor's public command and interrupts active extension tasks. Set `contextory.restartAfterSetup` to `automatic` to perform it without the prompt, or `never` to keep manual control. Unchanged configuration and skill-only updates do not restart the host. You can always run **Contextory: Restart Agent Extensions** manually.

Review native project/hook trust in the agent. A restart reloads extensions but does not grant trust or guarantee every already-open chat refreshes its tool inventory. In Codex, resume/reopen the chat after restart if needed; its documented MCP settings also provide **Restart extension**. Keep the project editor open so the local service remains available. See [Codex MCP setup](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

| Footer light | Meaning                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grey         | The provider is not configured, or configuration exists but no MCP traffic has been observed in this service instance. Hover for details.         |
| Green        | Configured MCP traffic has been observed in this service instance. This does not establish provider authentication or that every hook is working. |

Clicking a configured agent disconnects its owned entries. The tooltip and accessible label identify whether clicking will connect or disconnect. Multiple providers can be configured for a project; they use the same Contextory records. Spec leases prevent two sessions from implementing the same spec at the same time.

### Prepare the connection at startup

Contextory activates early and starts its local service in a trusted local folder, even with its view closed. `contextory.autoConnect` defaults to `true`, and `contextory.startupAgent` defaults to `auto`: all detected supported agents are prepared. In VS Code with both Codex and Claude Code installed, both are configured. In IBM Bob, Bob is configured too. No previous agent selection is required.

Use the footer's **Auto-connect** switch, **Contextory: Toggle Automatic Agent Connections**, or set `contextory.autoConnect` to `false` to pause automatic setup for this workspace. The service, records and existing connections remain available; pausing does not terminate native sessions. Resume with the same switch. To remove an existing bridge, disconnect that provider separately.

To always prepare Codex, for example:

```json
{
  "contextory.startupAgent": "codex"
}
```

Other values are `auto`, `claude`, `bob`, `last-used`, and `none`. `last-used` uses the workspace's latest manual connection or observed native MCP/hook activity, falling back to the last agent used elsewhere. `none` disables automatic selection. Existing configured bridges and the local service remain available. An explicit startup preference from an earlier version stays in effect; choose `auto` to enable detection of all installed agents.

Manually disconnecting a provider opts it out of startup in that workspace until you connect it again. Configuration errors appear in **Output → Contextory** without preventing access to project records or preparation of other detected agents. Paused automatic setup also skips managed configuration refreshes.

Startup prepares the project's MCP entry, hooks and workflow instructions. Native MCP discovery can list all tools while the service starts; the first call waits up to 15 seconds for readiness. Existing connections reread service descriptors so ordinary service restarts do not require recreating the bridge. Contextory also prepares connections after you grant workspace trust.

The native client still controls starting its agent session, trusting the entry and reloading MCP configuration. Its light turns green when MCP traffic is observed. Codex and Claude Code do not expose a public editor command for Contextory to force MCP reload. First-time configuration in an already-running client can therefore still need native approval and an extension/session restart; automatic preparation cannot guarantee zero reloads. Contextory does not restart the editor or send native chat prompts. See [Codex MCP setup](https://developers.openai.com/codex/mcp/), [Claude MCP trust](https://code.claude.com/docs/en/mcp), and [Bob MCP configuration](https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob).

## A normal day of work

1. **Describe an authorized change in native chat.** Ask the agent to use Contextory. Ordinary questions do not need new requests.
2. **Recover context.** The agent reads the workspace brief, searches earlier decisions, checks relationships, and traces affected source where useful.
3. **Structure the request.** A request keeps the original user intent. Milestones group deliverables. Specs describe individual changes and acceptance criteria.
4. **Implement a spec.** The agent registers its native session and claims a lease, then edits through its own native tools. It records findings, fixes, choices, alternatives, consequences, and source references as work proceeds.
5. **Verify.** Contextory runs a workspace-configured recipe independently and retains output, exit status, criterion links, and source fingerprints. Manual or external observations are stored with a separate origin.
6. **Submit and complete.** The agent submits an outcome, then uses the returned revision to request verified completion. Submission alone leaves the spec open. Milestones and requests complete when all their children complete.
7. **Review and export.** Inspect the records in Requests or History, then export the request's report or changelog.

An example native-chat prompt:

> Use Contextory for this request: improve checkout retries without creating duplicate payments. Retrieve previous payment decisions, create a milestone and specs with acceptance criteria, inspect the Python call flow, and record the fixes, decisions, and evidence. Run our configured checks and explicitly complete each verified spec.

If scope changes, revise the request/spec with a reason. Contextory preserves earlier versions and the original request. Reopening or adding planned work reopens the affected parents. An empty milestone remains open.

## Use the sidebar and workbench

The header always shows the workspace name, including in source-flow and relationship workbench views. Hover over it to see the full folder path.

To dock Contextory horizontally, right-click **Workspace Tasks** and use **Move View → Panel** (or **Move View…** and choose a Panel destination). Wide views of at least 760 pixels with a width-to-height ratio of 3:2 or greater use the horizontal layout automatically. Narrow or tall views retain the sidebar layout. Resize the Panel to give long records more room.

In the Panel, Overview places metrics, current requests and recent activity alongside each other. Requests shows the request list on the left and the selected spec on the right. History has a filter rail beside the feed; source diagrams have a bounded scroll area. Long lists scroll independently and agent controls stay at the bottom. Moving or resizing the view keeps selected details, expanded milestones and request drafts.

### Overview

The metrics show open requests, implementing specs, and completed specs. **Current work** lists every open request and its completed/total spec progress. The three most recent activities have readable titles and links; **Full history** opens the complete audit view. Agent controls stay at the bottom while the main content scrolls.

### Requests

Each request has one card. Expand a milestone and click a spec to show its detail inside that card, or in the adjacent inspector in a horizontal Panel. Detail tabs expose its contract, issues, decisions, evidence, outcome, usage, and history. The search bar filters requests and their descendant records, so an issue or design decision can reveal its owning request. **Search history** also queries the indexed project knowledge.

**Explore relationships** opens a separate workbench view with record titles, IDs, short descriptions, states, source files, link directions, and rationale. Select a record to return to its owning request/spec and explanation tab; select a file reference to navigate to source.

### History

History pages all audit events rather than the Overview's three-event excerpt. Request/milestone/spec filters include descendant activity. Linked breadcrumbs return to the corresponding records.

### Architecture

Open **Architecture** or run **Contextory: Explore Architecture** to start with a subsystem map and a repository explorer. Select a component in either place, choose a file shortcut, and inspect a symbol’s direct connections in the coordinated source inspector. Use the breadcrumbs, **Project** and **Back** to retain your bearings. File shortcuts and context results are bounded; scoped search and **Explore connections** retrieve more detail. Filter by relationship and incoming/outgoing direction; open exact source locations from the inspector. The **Matrix** view compares subsystem dependencies: rows depend on columns, intensity represents indexed link counts, and ↔ marks a reciprocal direct dependency. Select a cell to explore its source subsystem. Both maps support zoom, background drag, fit and keyboard selection. Entry points, shared symbols and conventions are available in the expandable reference section. Search for a symbol or describe a task, follow source citations and linked decisions, and refresh the code index when recovering from an indexing error. Saved changes refresh automatically. Read-only code questions need no tracked request. The [codebase intelligence guide](CODEBASE-INTELLIGENCE.md) covers configuration, Graphify imports and static-analysis limits.

### Code map

Place the cursor in a workspace source file, then trace through Code map. Sidebar tracing stays in the sidebar. The editor context menu **Contextory: Trace Flow from Here** opens a dedicated workbench panel. The last source cursor is remembered when you focus the sidebar.

Calls mode shows function relationships; flow mode also represents supported branches and continuations. Python and TypeScript/JavaScript have static analyzers. Other languages need an installed editor call-hierarchy provider and do not gain language-specific branch extraction automatically.

The step list, map and inspector share selection. Select a step to highlight its direct incoming/outgoing paths and see the source, then follow a connection or choose **Trace from this node**. Filter connection types or use **Focus selected step** to reduce clutter. Use **+**, **−**, **Fit** and **100%**, drag the canvas background to pan, or use Ctrl + wheel to zoom. Keyboard users can tab to map nodes and activate them with Enter/Space; the focused canvas also scrolls with arrow keys. Short Panels prioritize the diagram; expand the Panel or use the dedicated source-flow workbench for all exploration controls.

The default is five call hops from hop zero, with 150 nodes, 300 edges, and a two-second interactive budget. Cycles, size/depth boundaries, unresolved targets, and analysis gaps remain visible. Expand a frontier or trace from another node to continue. Source references navigate to files, and SVG/JSON exports retain the bounded graph.

Python analysis uses an isolated standard-library parser and never imports or executes the workspace source. Python scanning is limited to 500 files, 512 KiB per file, and 12 MiB in total. Dynamic dispatch, decorators, framework behavior, and other static-analysis gaps can leave paths unresolved. Diagrams describe possible source flow, not runtime coverage. Unsaved buffers can be visualized but cannot serve as independent check evidence.

### Theme behavior

The sidebar uses the active theme's sidebar colors; a horizontal Panel uses its panel/editor colors and dedicated workbench views use editor colors. Buttons, fields, progress, links, diagrams, focus rings, and the inline icon use VS Code semantic tokens. Theme changes apply immediately, including custom and both high-contrast modes, without reloading the view or discarding drafts. See the [theme previews](https://github.com/igormicadei/Contextory/blob/v0.2.3/artifacts/themes.png).

## Configure checks

Open **Preferences: Open Workspace Settings (JSON)** and add the project's existing check commands. For a repository with a Node test suite:

```json
{
  "contextory.nodeExecutable": "node",
  "contextory.pythonExecutable": "python",
  "contextory.flowDepth": 5,
  "contextory.checks": [
    {
      "id": "unit",
      "name": "Node unit tests",
      "executable": "node",
      "args": ["--test"],
      "timeoutMs": 120000
    }
  ]
}
```

For Python, an alternative recipe is:

```json
{
  "id": "python-unit",
  "name": "Python unit tests",
  "executable": "python",
  "args": ["-m", "unittest", "discover", "-s", "tests"],
  "timeoutMs": 120000
}
```

Adapt these examples to the actual project. Recipes execute with the workspace root as their working directory and use executable/argument arrays without a shell. Set an absolute executable path when the editor's PATH differs from your terminal. To run an npm script on Windows, invoke the npm JavaScript entry point through Node with the appropriate script arguments; a bare `npm.cmd` is not a portable shell-free executable. Recipe timeouts must be between 1,000 and 1,800,000 ms.

Only configured recipe IDs are exposed to native agents for check execution. A native agent can edit workspace settings through its own editing tools if authorized; it cannot send an arbitrary command through `contextory_check_run`.

Verified completion requires a current outcome, independent passing evidence for every criterion, matching source/contract/attempt, completed dependencies, and resolved blocking findings. A later failed run, pending check, source change, contract revision, or new attempt can prevent completion. External or manual evidence does not become an independent passing check just because an agent labels it passed.

If a spec remains open after the work is finished, ask the agent to read the outcome's next action and call `contextory_spec_change` with `action: "complete"` and the current revision. If rejected, resolve the reported blocker. The [MCP reference](MCP-TOOLS.md) explains the exact sequence.

## Search and shared project memory

Project records index automatically. Run **Contextory: Index Workspace Knowledge** to add supported workspace source to the search index. Indexing respects Git exclusions and applies file/size and sensitive-path filters. Changed source results are omitted as stale until refreshed. Search results cite current revisions; immutable historical revisions are available through explicit detail reads.

Lexical search works immediately. For local vector/hybrid search:

1. Run **Contextory: Prepare Local Semantic Search**. This one-time preparation needs npm and network access to download a pinned model and runtime; the measured Windows footprint is about 486 MiB.
2. Run **Contextory: Index Workspace Knowledge** to refresh records/source and their vectors.
3. Use hybrid retrieval through the agent. If the optional model is unavailable, hybrid mode reports a lexical fallback; semantic-only queries fail explicitly.

Model queries run locally after preparation and disable remote fetching. Vectors are rebuildable projections bound to content/model identity; they do not infer approval, prove complete impact, or automatically establish dependencies. This preview scans at most 10,000 vectors per query. Model relevance beyond the small validation fixture is not qualified.

## Export request reports

Use **Export request report** on a request card or **Contextory: Export Implementation Report** in the Command Palette. The report covers that request and its descendants: original/current contracts, revisions, acceptance criteria, changes, findings/fixes, decisions, evidence provenance, check commands/output, and outcomes. Unrelated requests are excluded.

The agent can use `contextory_report_export` with a request ID and `format: "report"`, `"changelog"`, or `"json"`. Changelogs include completed specs only. Exports open as editor documents; use **Save As** to retain a copy outside Contextory's managed storage. These are request deliverables, not an export of the activity feed.

## Agent models and usage (0.2.4+)

Open a specification's **Usage** tab to see its recorded models and observed token counts. Use **Refresh usage** for the latest observations. Request reports include model/usage summaries for the request and its specs; JSON exports include structured summaries. Agents can inspect the same records with `contextory_usage_get`, including project-wide observations that could not be assigned to a spec.

| Native client | What the hooks can record                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex         | Active model and `PostModelRequest` attempt metadata, including input/output, cached-input, reasoning and total tokens when the native client supplies them. Older clients may lack this event. |
| Claude Code   | Model from `SessionStart` and model changes from `PostModelSwitch` (Claude Code 2.1.251+). Standard lifecycle hooks do not expose a general token total.                                        |
| IBM Bob       | Lifecycle metadata. Bob's documented hooks currently expose neither model nor token counters, so these remain unavailable.                                                                      |

When attaching a Contextory session, the agent should pass the exact `nativeSessionId` from the hook reminder. Observations link to a spec only when that native session has one active, unexpired lease. Missing IDs, multiple concurrent leases, completed work, and subagent events carrying only the parent session stay unassigned. Planning before a lease is also unassigned. This deliberately makes request totals a record of attributed observations rather than a complete task-cost calculation.

Missing token fields remain **Unavailable**, while an observed zero remains zero. Cached input is included in input tokens, and reasoning is included in output tokens; do not add these subsets again. Failed/cancelled attempts and retries remain separate where reported. Contextory does not calculate subscription usage, account balances, Bobcoins or monetary charges.

Capture uses native hook fields only. It does not read transcripts or store prompts, tool inputs/results or raw model errors. Records stay in the local workspace ledger and survive restarts. Per-request telemetry is kept out of the recent-activity feed. On upgrade, reload the editor and native agent so the new managed hooks and MCP tool are discovered; hook trust still belongs to the native client. Existing work cannot be backfilled from this capture path.

Provider references: [official OpenAI documentation: Codex model-request hooks](https://learn.chatgpt.com/docs/hooks#premodelrequest-and-postmodelrequest), [Claude hook fields](https://code.claude.com/docs/en/hooks), [IBM Bob lifecycle hooks](https://bob.ibm.com/docs/ide/configuration/lifecycle-hooks).

## Configuration and storage

| Setting                        | Default  | Purpose                                                                     |
| ------------------------------ | -------- | --------------------------------------------------------------------------- |
| `contextory.autoConnect`       | `true`   | Pause/resume automatic agent setup; existing bridges remain available.      |
| `contextory.restartAfterSetup` | `prompt` | Restart after changed MCP/hooks/runtime: `prompt`, `automatic`, or `never`. |
| `contextory.startupAgent`      | `auto`   | All detected agents, a fixed provider, `last-used`, or `none`.              |
| `contextory.nodeExecutable`    | `node`   | Node 24+ executable for the workspace service.                              |
| `contextory.pythonExecutable`  | `python` | Python 3.10+ executable for Python source analysis.                         |
| `contextory.flowDepth`         | `5`      | Default flow call-hop depth, from 0 to 12.                                  |
| `contextory.checks`            | `[]`     | Named independent check recipes for this workspace.                         |

The Node/Python executable settings have machine scope; automatic connections, startup selection, flow depth and checks have resource scope. The footer switch writes a workspace setting. The managed provider files are:

| Agent       | MCP configuration    | Hooks                         | Workflow skill                                |
| ----------- | -------------------- | ----------------------------- | --------------------------------------------- |
| Codex       | `.codex/config.toml` | `.codex/hooks.json`           | `.agents/skills/contextory-workflow/SKILL.md` |
| Claude Code | `.mcp.json`          | `.claude/settings.local.json` | `.claude/skills/contextory-workflow/SKILL.md` |
| IBM Bob     | `.bob/mcp.json`      | `.bob/settings.json`          | `.bob/skills/contextory-workflow/SKILL.md`    |

Each provider also receives `contextory-codebase/SKILL.md` and both skills’ reference files in the same skills directory. Generic clients can use **Contextory: Export Generic MCP Connection** and copy the exported `.contextory/skills` folders into their own supported discovery location; hooks are optional. See [portable clients and standalone execution](CODEBASE-INTELLIGENCE.md#agent-portability).

The server name starts with `contextory_companion_` and has a project-specific suffix. Hook/proxy commands point to managed local runtimes and private service descriptors. Review machine-specific paths before sharing configuration with another machine. Registration rejects malformed configuration, linked directories/files, and unowned conflicts rather than overwriting them.

The SQLite ledger, audit events, check artifacts, and credentials are stored under the editor's global storage for `contextory-local.contextory-workspace`, in a canonical-project-path namespace. Optional model files have a separate managed directory. Exact storage locations depend on the editor/profile. Moving the project to a different canonical path creates a different project namespace in this preview.

Standalone CLI/MCP uses `<root>/.contextory-local/service` by default, or an explicit `--storage` directory. This is a separate authoritative ledger unless attached to a running editor service through `--descriptor`; records are not silently merged. Back up that service directory as well when using headless mode.

For an independent backup, close the editor clients, let the service stop after its roughly 65-second grace period, and copy the extension's managed storage, including its project directories. Do not delete native provider credentials or edit the ledger directly. Contextory records do not include a native conversation mirror: hooks retain normalized event/session/cwd/tool metadata, not raw prompts, transcript paths, or tool output. Check output and indexed project content are retained locally as part of their respective features.

## Resume an existing chat

A managed MCP connection waits up to 15 seconds for a reopened workspace service before dispatching each call. It rereads the service descriptor; it never automatically repeats a mutation. If startup takes longer, retry the read-only probe after startup. The stored project ledger and chat history are independent.

Run **Contextory: Check Native Connections** to open diagnostics in **Output ? Contextory**. It distinguishes MCP traffic and hooks observed in the current service from history. A waiting hook means no event has arrived yet; check native trust and trigger a supported lifecycle event before concluding it is broken. This command observes the service and does not force the native agent to call MCP.

If an old chat reports disconnection, ask it to discover its current tools and call `contextory_context_get`. If the tool is missing, restart agent extensions and reopen that chat. If the service reports a version/tool-contract mismatch, follow its restart message; a service held by another project window may require closing those editors for 65 seconds. This compares versions and tool contracts, not every byte of same-version builds.

## Upgrade, disconnect, and uninstall

- **Same Contextory identity:** install the newer VSIX, reload the editor, and reload the native MCP configuration/session. Existing records remain in the extension's storage. Managed workflow instructions refresh for configured agents.
- **A build under the previous name:** disconnect its agents while that build is still installed, uninstall it, install Contextory, and reconnect. Version 0.2.3 has a new identity and `contextory_`/`contextory.` namespaces. Previous records stay in the former storage and are not imported automatically.
- **Disconnect:** click the configured footer agent or run **Contextory: Disconnect an Agent**. Only owned configuration entries and the managed skill are removed; unrelated settings and project records remain.
- **Uninstall:** disconnect providers first so native clients do not retain entries pointing at an unavailable service, then uninstall from Extensions. Export/backup records before removing managed storage.

## Troubleshooting

| Symptom                                     | What to check                                                                                                                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Service does not start                      | Check Node 24+ in the editor environment, set `contextory.nodeExecutable` to an absolute path, and inspect **Output → Contextory**.                                                                                            |
| Sidebar refuses analysis or connection      | Open one local folder and trust it. Multi-root, virtual, and remote workspaces are not qualified.                                                                                                                              |
| Agent light stays grey                      | Hover for status. Review/trust the generated MCP/hook files, reload the native client, and ask it to call `contextory_context_get`. Configuration alone does not count as observed traffic.                                    |
| Agent cannot see tools                      | Keep the project editor open, verify the project-specific MCP entry, and reload the native session. Native clients control their own MCP trust and discovery.                                                                  |
| Automatic setup does not prepare an agent   | Enable **Auto-connect**, choose `contextory.startupAgent: "auto"`, and check the supported agent extension is enabled. Reconnect any manually disconnected agent. Inspect **Output → Contextory** for configuration conflicts. |
| Python trace fails                          | Install Python 3.10+, verify `contextory.pythonExecutable`, and try an absolute path. The workspace module is parsed rather than imported.                                                                                     |
| Tracing starts from an unexpected point     | Focus the intended source symbol before entering the sidebar, or use the editor's **Trace Flow from Here** command.                                                                                                            |
| Spec remains submitted/open                 | Submit an outcome and then explicitly request completion with its returned revision. Resolve missing recipes, stale/missing evidence, dependencies, or blocking findings.                                                      |
| Search misses changed source                | Refresh workspace knowledge. Check whether a size/exclusion limit or stale-content notice applies.                                                                                                                             |
| Semantic search is unavailable              | Prepare the optional runtime and re-index. Lexical search remains available.                                                                                                                                                   |
| Configuration conflict                      | Fix malformed files or resolve an unowned conflicting entry; Contextory preserves it. Linked provider paths must be replaced with regular workspace paths before registration.                                                 |
| Earlier service still running after upgrade | Close editors for that project for 65 seconds, then reopen as instructed by the error.                                                                                                                                         |

For a bug report, include the Contextory version, editor/version, Node/Python versions, relevant error text, and reproducible steps in the [issue tracker](https://github.com/igormicadei/Contextory/issues). Omit credentials and private service descriptors. See [validation](VALIDATION.md) for the current qualification boundaries.
