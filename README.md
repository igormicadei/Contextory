# Relay - Workspace Tasks

Relay is a VS Code sidebar for a shared conversation and a request > milestone > specification queue. It now includes an **experimental live engine**, plus the separate browser/demo preview. Relay is a provisional name.

The sidebar follows the selected VS Code theme, including custom colors, live theme changes, light/dark modes and both high-contrast variants. It uses native color and font tokens.

## Try it

Requires desktop VS Code 1.96+, Node.js 22+, npm, Git for execution, and an installed native agent.

```powershell
npm ci
npm run build
```

Open this folder in VS Code and press **F5**, select **Relay Preview**, then open the Relay activity-bar view. A trusted folder opens in **Live** mode with an empty queue. The **...** menu switches between live workspace data and independent demo data. The pinned F5 runtime uses `noDebug: true` to work around the previously reproduced VS Code inspector crash; breakpoint debugging remains unavailable through that configuration.

For installation in your normal VS Code profile:

```powershell
npm run package:vsix
code --install-extension artifacts/relay-workspace-0.1.2.vsix
```

The browser remains a simulated UI preview:

```powershell
npm run preview
```

Open http://127.0.0.1:4317 to inspect widths and themes. Browser actions cannot execute agents or Git.

## Live workflow

1. Discuss the project or describe a change. The selected native agent investigates source and searches the entire request history using Relay tools. Normal discussion need not create work.
2. Answer material questions through options or a custom answer. The agent produces structured, validated plans with standalone milestones and specifications.
3. Inspect the plan in **Requests**. Configure independent checks, then use **Run request** to start implementation. This first release keeps execution as an explicit action.
4. Relay creates an owned worktree, a `relay/REQ-001/integration` branch and milestone branches such as `relay/REQ-001/m1`. The original checkout stays on its existing branch.
5. Each specification runs through implementation, configured checks, a real commit and optional push to `origin`. Final checks gate milestone integration. Failed checks block completion; agent claims do not count as passing evidence.
6. Inspect linked commit patches or export the implementation report. Completed work can receive additional planned milestones while retaining its earlier commits. New unrelated requests can be planned during execution.

Chat, decisions, activity, plans, checks, full commit hashes and native conversation IDs persist in VS Code workspace storage. Atomic snapshots use an integrity hash and a single-owner lock. Interrupted runs stop for inspection after restart. The UI retains the last 200 conversation messages; provider sessions retain their own history.

### Agents and native configuration

- **Codex (default App Server):** the installed `codex app-server` with its native authentication/configuration. Native model/effort discovery is available through **Agent settings > Refresh models**. Relay request/source tools use the experimental dynamic-tool protocol, so runtime compatibility matters.
- **Codex (native extension):** **Relay: Connect Native OpenAI Codex** connects the official `openai.chatgpt` extension through project-scoped MCP and selects `relay.codexIntegration: "native"` for this workspace. Relay attaches its handoff instructions to the current native Codex chat using the documented Add to Codex Chat command. Press Send there; login, model/reasoning and permissions remain native.
- **Claude (default):** the official Claude Code extension, using its existing login, model, effort, native permissions and global/project configuration. Relay opens a prefilled Claude tab and shares its queue/context/results through an additive workspace-local MCP server. **Press Send in Claude** to start each handoff. Model selection and the full native conversation remain there; Relay shows published answers, plans and MCP progress.
- **Claude (optional SDK):** select `relay.claudeIntegration: "sdk"` for the bundled TypeScript SDK `/core` adapter. It retains the installed executable, `claude_code` preset and `user`, `project`, `local` sources. API keys, supported cloud routes, key helpers and custom-gateway settings are detected from the environment and native settings files. The runtime resolves the actual credentials. Subscription OAuth is not reused through this route.
- Relay preserves the normal home/configuration environment. It does not enable bare/safe mode, replace global agents, disable hooks or restrict the native MCP server list. Request/source tools are added alongside native capabilities.
- Tracked project configuration appears in a worktree. Ignored local settings, dependencies and local services still need worktree setup; automated setup/copy manifests are not implemented yet.
- Native permissions remain in effect. Codex/SDK permission requests use VS Code dialogs; native Claude approvals stay in Claude. A worktree is filesystem separation, not a sandbox for services or MCP side effects.

### Connect native Claude

1. Install Relay in your normal VS Code profile with the official Claude Code extension enabled. F5 uses an isolated profile that does not include Claude.
2. Open one trusted local workspace and run **Relay: Connect Native Claude Code** from the Command Palette. This adds one uniquely named local-scope MCP entry through `claude mcp add-json`; existing provider settings and other MCP entries are preserved. Node must be on PATH. The first Relay Claude turn also performs this setup.
3. Open a new Claude conversation to load the MCP server and approve its tools through native prompts. Select Claude in Relay and send your message; then press **Send in Claude**. Keep Relay open in the connected workspace.

Your existing `~/.claude/settings.json` and `~/.codex/config.toml` remain provider-owned. Both configured IBM gateways were identified without printing credentials. The earlier environment-only Claude auth check missed the settings file; the optional SDK check now includes settings scopes. No new API key is required for the native workflow.

The native URL supports prompt/session prefill, not automatic submission or a cwd switch. For implementation, Claude is instructed to inspect/edit the absolute Relay worktree. Relay requires a clean original checkout and checks its HEAD, branch and Git-visible changes before accepting the handoff. This detects mistakes; it does not enforce isolation or detect every ignored-file/service side effect. **Stop** cancels Relay tracking and rejects late results; also stop Claude in its native tab. No hooks are installed or replaced. Native MCP progress is explicit, not a full automatic transcript mirror.

The MCP proxy lives at a stable path in workspace storage and reads a rotating, authenticated loopback descriptor. Remove the workspace entry with `claude mcp remove --scope local relay_workspace_<id>` if disconnecting; its exact name is shown by `claude mcp list`. Relay's bridge is available while the extension host is running. Native extension end-to-end/model execution still needs validation in the normal profile; the bridge is covered by protocol and disposable Git fixture tests.

### Connect native OpenAI Codex

1. Install Relay in your normal VS Code profile with the official OpenAI Codex extension enabled, then open one trusted local workspace. F5's isolated profile does not include Codex.
2. Run **Relay: Connect Native OpenAI Codex**. Relay appends its uniquely named MCP table to the project's `.codex/config.toml`, preserving existing text/settings and your global `~/.codex/config.toml`. The command selects native Codex in the workspace's VS Code settings. Node must be on PATH; a separate Codex CLI is not required for this native route.
3. Trust the project in Codex and restart the Codex extension from its MCP settings to load the server. Keep Relay open in the same workspace.
4. Select Codex in Relay and send your message. Relay opens a small handoff document and attaches the selected instructions to the current native Codex chat. **Press Send in Codex** to process the attached Relay handoff; if the composer is empty, type “Continue the attached Relay turn.” Relay receives the answer/plan/progress through MCP.

Model and reasoning selection remain in Codex. Stop Codex in its own UI when stopping a native run; Relay only cancels tracking. Native edits use explicit absolute worktree instructions plus the same original-checkout checks described above. Commit your new project configuration before requesting an implementation that requires a clean Git checkout. Conflicting/disabled Relay entries or malformed project TOML are preserved and reported for inspection.

Set `relay.codexIntegration` back to `appServer` to run Codex directly inside Relay again. Removing just Relay's `mcp_servers.relay_workspace_<id>` table from the project file disconnects the native MCP registration. Codex and Claude share the queue but have separate native turn storage/endpoints; they cannot finish each other's turns. Windows-to-WSL native proxy routing is not supported in this release.

This uses the documented [Codex MCP project configuration](https://learn.chatgpt.com/docs/extend/mcp) and [IDE commands](https://learn.chatgpt.com/docs/ide/commands), with no automatic submission or private extension APIs. Native model/extension end-to-end handoffs remain unverified; routine tests exercise the standard MCP clients, provider isolation, preserved project configuration and independent Git/check runner.

The `@`, `$`, `/` picker discovers conventional local file/skill/agent metadata. Plugin/managed runtime reference catalogs are not yet complete. Image and UTF-8 text attachments can be sent through **+** or paste; binary files should be referenced with `@`. Sent attachment contents enter the selected provider's native session.

### Required checks

Configure `relay.checks` in your trusted workspace. Commands are executable/argument pairs, without shell fragments. For example, a repository using Node's built-in test runner:

```json
{
  "relay.checks": [
    {
      "name": "Unit tests",
      "executable": "node",
      "args": ["--test"],
      "kind": "unit"
    }
  ],
  "relay.push": false
}
```

Add your actual integration and Playwright recipes (`browser` or `layout`) when applicable. Relay runs configured recipes; it does not infer complete coverage or automatically install dependencies. On Windows, choose an executable rather than an `.cmd` wrapper. Check commands execute project code with your account's permissions.

Pushing is disabled initially. Enable `relay.push` only after configuring the repository's `origin`. The extension source folder itself has no Git repository or remote configured; live chat/planning still works, but execution requires a clean repository root with an initial commit. No repository was initialized here by this implementation.

## Validation and remaining work

```powershell
npm run check
npm run test:host
npm run test:native
```

`check` covers type checking, domain/transport/persistence/Git fixtures, the bundles and browser behavior/overflow tests. `test:host` uses an isolated official VS Code runtime and tests the F5 workaround. `test:native` explicitly makes real Codex model calls against disposable fixtures; it is separate from routine tests.

See [current implementation and limits](docs/IMPLEMENTATION.md), [validation evidence](docs/VALIDATION.md), [full plan](docs/PLAN.md), [architecture](docs/ARCHITECTURE.md) and [provider compatibility](docs/COMPATIBILITY.md). This is a first live implementation, not the completed production backlog. Automatic repair, full crash/side-effect reconciliation, safe active-work amendments, dependency scheduling, multi-root/remote validation and full native reference discovery remain open. Failed/interrupted worktrees are preserved; inspect them before retrying. Goal Guardian was read as reference and was not adopted or invoked.
