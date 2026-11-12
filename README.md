# Relay — Native Agent Companion

Relay keeps project specifications, issues, fixes, decisions and evidence alongside your native Codex, Claude Code or IBM Bob conversation. Native agents own their chats, models, authentication and editing. Relay supplies a shared local workflow through MCP and advisory lifecycle hooks.

Version **0.2.2** adds a compact overview with request progress, pinned footer agent controls and a readable relationship workbench view. The native-agent rebuild also provides linked history, request reports, Python source flow and explicit agent completion guidance. There is no legacy data importer or direct agent runner.

## Use it

1. Install Node.js **24+** and the Relay VSIX. Open one trusted local project folder in VS Code or IBM Bob.
2. Open the Relay activity-bar view. Run **Relay: Connect Native Codex**, **Relay: Connect Native Claude Code**, or **Relay: Connect Native IBM Bob**.
3. Review the project configuration changes and trust the hooks/MCP server through the native client. Reload its MCP configuration or restart the native extension/session as needed. Relay never changes native approval settings.
4. Keep talking to the agent in its native chat. The installed `relay-workflow` skill, MCP instructions and session/prompt reminders describe how to record the authorized request, milestones, specs and explanations.
5. Relay displays the resulting records. Agent buttons stay in the sidebar footer while the content scrolls; click the agent name to connect or disconnect. A green light means configured MCP traffic has been observed; grey means unconfigured or awaiting traffic. Tooltips retain connection details. Keep the workspace editor open for the local service.

After upgrading, reload the native client's MCP configuration/session so it reads the updated tool instructions. Relay refreshes its owned workflow skills for configured agents. If an older workspace service is still alive, Relay explains how to let it stop before reopening; it does not silently attach the new UI to an incompatible service.

The native adapters are a preview: configuration, protocol, hooks and editor hosts have automated coverage. Authenticated model conversations in each native agent extension remain an explicit qualification step; see [validation](docs/VALIDATION.md).

## What is available

- Requests → milestones → specs, with immutable record revisions, original intent, dependency checks, implementation leases and an audit trail.
- Overview starts with workspace metrics, lists every open request with a specification progress bar, and shows the three latest activities with readable titles. Requests has one expandable card per request, inline milestone/spec details and a filter that includes descendant issues and decisions. The separate History tab pages the entire audit trail and links back to requests, milestones and specs.
- Spec tabs retain findings/fixes, decisions, evidence and outcomes across native conversations and agent switches.
- Independent named check recipes, asynchronous jobs, cancellation, bounded logs and source fingerprints. Completion requires a current outcome, passing runner evidence for each criterion, completed dependencies and resolved blocking findings. Agent-reported evidence remains labeled.
- Deterministic request reports include original/current contracts, acceptance criteria, changes, issues/fixes, decisions, test commands/results, evidence origins/snapshots and outcomes. Export from a request card, the command palette, or `relay_report_export` with `requestId`. Changelogs include completed specs only.
- SQLite lexical search and a relationship graph with bounded forward/reverse impact traversal. Records index automatically; **Index Workspace Knowledge** adds selected workspace source. Search and source mapping remain first-class agent MCP tools, independent of whether the user opens their UI.
- **Explore relationships** opens a dedicated workbench tab. It shows connected requests, milestones, specs, decisions and source files with titles, IDs, short descriptions, relationship directions and link rationale. Record titles open the corresponding request/spec detail; source references open files. MCP impact results include the same readable summaries and retain explicit traversal limits.
- Optional local vector/hybrid search. **Prepare Local Semantic Search** installs a pinned model/runtime once; **Index Workspace Knowledge** builds vectors. Queries then run locally. Preparation currently occupies about **486 MiB** on Windows; none of it is bundled in the VSIX. Lexical search works without it.
- **Trace Flow from Here** in the editor context menu. Python and TypeScript/JavaScript support calls and branch flow. Python needs **Python 3.10+** (`relay.pythonExecutable`); its isolated standard-library AST engine parses source without importing or executing it and works for agents without an editor language provider. Other languages use an installed editor call-hierarchy provider. Sidebar tracing stays in the sidebar; the editor command opens a dedicated flow panel. Both remember the source cursor across sidebar focus changes and support source navigation, bounded expansion and SVG/JSON export.

Flow defaults to **five call hops**, 150 nodes, 300 edges and a two-second query budget. Recursion, limits, unresolved targets and static-analysis gaps remain visible. Diagrams describe possible source paths; they do not establish runtime coverage. Unsaved buffers are labeled and never count as check evidence.

## Configure independent checks

Add recipes to workspace settings. Commands use executable/argument arrays without a shell:

```json
{
  "relay.nodeExecutable": "node",
  "relay.pythonExecutable": "python",
  "relay.flowDepth": 5,
  "relay.checks": [
    {
      "id": "unit",
      "name": "Unit tests",
      "executable": "node",
      "args": ["--test"],
      "timeoutMs": 120000
    }
  ]
}
```

Use an absolute executable path when PATH differs between the editor and your terminal. On Windows, invoke scripts through their runtime, rather than using `npm.cmd` as an executable without a shell. Recipes run trusted workspace code with the local user's permissions.

Agents finish tracked work by running `relay_check_run`, recording criterion evidence, submitting `relay_outcome_submit`, then calling `relay_spec_change` with `action: "complete"` and the returned revision. The outcome response supplies that next action. Relay verifies completion and updates parent milestone/request status. If no recipe exists, the agent can configure the project's existing test/check command in workspace settings using its native editing tools. Missing verification or unresolved blocking findings remain explicit blockers; outcome submission alone leaves a spec open.

## Configuration and storage

| Agent       | Project MCP file     | Project hooks                 | Workflow skill                           |
| ----------- | -------------------- | ----------------------------- | ---------------------------------------- |
| Codex       | `.codex/config.toml` | `.codex/hooks.json`           | `.agents/skills/relay-workflow/SKILL.md` |
| Claude Code | `.mcp.json`          | `.claude/settings.local.json` | `.claude/skills/relay-workflow/SKILL.md` |
| IBM Bob     | `.bob/mcp.json`      | `.bob/settings.json`          | `.bob/skills/relay-workflow/SKILL.md`    |

Connection preserves unrelated configuration and refuses linked files, malformed configuration and unowned name conflicts. Disconnect removes Relay-owned entries. Global provider settings and native permission policies are untouched. Hook commands use absolute managed runtime paths; review them before committing project configuration shared with another machine.

The SQLite ledger, audit, artifacts and rotating credentials live under the extension's global storage, separated by canonical project path. The optional model has its own managed directory. No native prompt, transcript or tool-result mirror is retained. Back up the project storage while its service is stopped if retaining it independently of the editor installation.

Supported deployment in this preview: Windows, one trusted local folder, Node 24+, and all processes on the same host. Multi-root workspaces, WSL/SSH/container path bridging and additional language-specific branch extractors are not qualified.

## Develop and validate

```powershell
npm ci
npm run check
npm run benchmark
npm run test:host
npm run package:vsix
```

`npm run preview` serves a fixture-backed sidebar for UI development. F5 prepares an isolated VS Code development host. It does not install native agent extensions into that profile.

To test the Bob host:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/host-smoke.ps1 -HostName bob -Executable "C:\Users\IgorCamposMicadeiBue\AppData\Local\Programs\IBM Bob\IBM Bob.exe"
```

For the optional real embedding test, first run `npm run prepare:semantic`; without a prepared model that single test is skipped. Native model conversations can consume provider tokens and are kept separate from routine tests.

Implementation details: [architecture](docs/NATIVE-AGENT-ARCHITECTURE.md), [migration and delivery record](docs/NATIVE-AGENT-PLAN.md), [outcome template](docs/SPEC-OUTCOME-TEMPLATE.md), [validation and limits](docs/VALIDATION.md).
