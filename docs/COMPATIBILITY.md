# Native provider compatibility

Reviewed 2026-11-10. [IMPLEMENTATION.md](IMPLEMENTATION.md) describes the experimental implementation; [VALIDATION.md](VALIDATION.md) separates actual tests from remaining work.

## Current integration choices

**Codex:** the installed `codex app-server` over stdio. Relay preserves native configuration, authentication, home, project trust and permissions, and adds dynamic request/source tools. Models and reasoning choices come from the runtime catalog. Tested version: `0.164.0-alpha.11.1`. Some protocol features remain experimental. Sources: [App Server](https://learn.chatgpt.com/docs/app-server), [config layers](https://learn.chatgpt.com/docs/config-file/config-basic), [skills](https://learn.chatgpt.com/docs/build-skills), [MCP](https://learn.chatgpt.com/docs/extend/mcp).

**Codex, optional native companion (0.1.2):** **Relay: Connect Native OpenAI Codex** registers the same standard MCP bridge in the trusted project's `.codex/config.toml` and selects `relay.codexIntegration: "native"` in workspace settings. Existing project text/provider settings and global config are preserved. The CLI's `mcp add` writes user configuration, so Relay appends only its own project table instead. Reload the Codex extension from its MCP settings after registration. Public `chatgpt.addToThread` adds a selected handoff document to the current native chat; `chatgpt.openSidebar` focuses it. No undocumented prompt argument or auto-submit is assumed. Press Send there; models, reasoning and permissions remain native. Separate Codex/Claude endpoints and tagged sessions prevent cross-provider completion. The configured Windows-to-WSL extension route is rejected because the proxy paths target the local host. Sources: [IDE commands](https://learn.chatgpt.com/docs/ide/commands), [project MCP configuration](https://learn.chatgpt.com/docs/extend/mcp), [IDE host setting](https://learn.chatgpt.com/docs/ide/settings).

**Claude, default native companion:** the official extension's documented `vscode://anthropic.claude-code/open?prompt=...&session=...` prefill route plus standard MCP. The user presses Send in Claude for each planning/specification handoff. Native model/effort, login, global/project instructions, skills, agents, hooks, MCPs and permissions remain managed there. Relay receives explicit MCP answers/plans/progress; it does not mirror the whole native conversation. No private command API, transcript scraping or SDK subscription credential reuse is involved. Sources: [VS Code integration and launch links](https://code.claude.com/docs/en/vs-code), [MCP](https://code.claude.com/docs/en/mcp), [hooks](https://code.claude.com/docs/en/hooks).

The bridge adds one uniquely named local-scope MCP server with `claude mcp add-json --scope local`, preserving other entries and provider settings. Registration invokes Node on a stable proxy in VS Code workspace storage. A private descriptor supplies a rotating loopback port/token; no provider credential is included in registration. The proxy resolves the descriptor on every call. Setup needs the installed CLI and Node on PATH. The isolated F5 profile lacks the official Claude extension; use the normal profile for this workflow.

**Claude, optional SDK:** `relay.claudeIntegration: "sdk"` uses Agent SDK `0.3.322` `/core` and the installed executable, explicit `settingSources: ["user", "project", "local"]` and the `claude_code` preset. Auth availability now recognizes environment/native settings API keys, key helpers, supported cloud flags and a custom gateway's URL/token. The runtime loads and uses the actual authentication. Native-extension and SDK sessions are kept separate. Sources: [SDK native features](https://code.claude.com/docs/en/agent-sdk/claude-code-features), [SDK settings](https://code.claude.com/docs/en/agent-sdk/typescript), [authentication/distribution](https://code.claude.com/docs/en/legal-and-compliance).

Both existing configurations point to `api.servicesessentials.ibm.com`. The prior claim that Claude had no configured route was based on process environment only and was incorrect: `~/.claude/settings.json` contains gateway configuration. `~/.codex/config.toml` selects the ICA provider. Inspection exposed only route/model metadata; credential values were not printed or copied into Relay. No new credentials are required for the native companion. Authenticated Claude execution against that gateway remains untested.

## Native companion contract and limits

- `relay_read_turn` returns active instructions, absolute cwd and images. Read-only source tools stay bounded to that cwd.
- `relay_search_requests` / `relay_get_request` expose the shared queue, including finished work, from native chat. Plan changes require an active Relay turn; spontaneous native chat cannot silently add work.
- `relay_publish_plan` returns a strict plan/question/answer object. The coordinator checks provider ownership, revision and active-work constraints. A tool receipt is not proof that the coordinator accepted an amendment.
- `relay_report_progress` records agent activity. `relay_finish_implementation` hands back changes for independent configured checks and Git handling. Neither can mark checks passing or complete a spec directly.
- Stop invalidates the Relay turn and rejects late results. Stop Claude separately in its native tab. Restarted pending turns are interrupted, not automatically resumed.
- The official URI has no cwd argument. Claude starts in the native workspace and is instructed to inspect/edit Relay's absolute worktree. Before native implementation, Relay requires a clean original checkout; after return it checks HEAD, branch and Git-visible status before checks/commits. Unexpected changes block the request and are preserved. This detects mistakes, not enforced isolation; ignored files, reverted transient changes and service effects are outside the check.
- No native hooks are installed or overridden. Approvals stay in Claude. Status comes from explicit MCP handoffs and actual Relay check/Git events. There is no automatic native submission, cancellation or full-transcript API used here.
- Relay's native model/effort controls identify delegation to Claude. Availability and selection remain native.

## Worktree and customization requirements

Owned runtime adapters start in the prepared worktree; native companion routing has the limit above. Preserve execution host, OS user, home/config roots and environment. Tracked instructions/settings appear in the worktree. Ignored/untracked local config and dependencies still need explicit setup; there is no automatic copying of sensitive settings. Inspect absolute MCP/hook paths and avoid sharing writable service state unintentionally. Ports, databases and services are not isolated by Git worktrees. Preserving configuration does not prove invocation of every customization.

The `@`, `$`, `/` picker discovers conventional local metadata, not exhaustive plugin/managed/native catalogs. Browser model catalogs remain samples; live Codex/optional SDK catalogs come from the runtimes.

## Evidence matrix

| Capability | Codex | Claude native companion |
| --- | --- | --- |
| Installed executable version | Observed | Observed |
| Real authenticated model turn | Passed in fixture | Not yet exercised |
| Project skill invoked/read | Passed with fixture marker | Not yet exercised |
| Structured intake / request tools | Real model + coordinator passed | Standard MCP clients + coordinator fixtures passed |
| Session continuation | Real thread resumed | Broker/URI tests; native UI continuation unverified |
| Queue reads outside active turn | No separate native companion | Standard HTTP/stdio MCP tests passed |
| Worktree / verified source / real commit | Real model + fixture passed | Simulated handoff + independent real Git/check fixtures passed |
| Failed checks / wrong-checkout changes | Independent runner tests | Independent runner tests; wrong-checkout edit blocks commit |
| Native stop | Protocol cancellation | Relay tracking only; stop native execution there |
| Full global/project agents, hooks, plugins, functional MCP matrix | Incomplete | Incomplete |

MCP fixture tests do not claim a model called these tools from the official Claude extension. That final compatibility step remains open in the normal VS Code profile.

The native Codex companion has the same end-to-end limitation. Tests cover actual standard HTTP/stdio MCP traffic, Codex provider-scoped planning/implementation handoffs through the real coordinator, independent checks/Git commits, cross-provider rejection and additive TOML registration. Public native editor context attachment and a model consuming it still need validation in the normal profile. Existing real Codex App Server tests are evidence for that separate route only.

## Validation

`npm run check` runs routine build/type/domain/MCP/Git/UI tests without model calls. `npm run test:host` checks the isolated VS Code host/F5 workaround. `npm run test:native` explicitly makes real Codex calls in disposable fixtures.

The read-only probe remains available:

```powershell
npm run probe
npm run probe -- --inspect-codex --cwd C:\Projetos\DevExtension
npm run probe -- --inspect-codex --mcp --output artifacts/probe-local.json
```

It returns whitelisted counts/names/scopes/sanitized locations, not raw configuration, provider stderr or credential files. It does not start a model thread. Goal Guardian is not invoked.

## Remaining live experiment

Use a disposable repository/worktree and harmless uniquely named fixtures. Record versions/scopes without credentials. In the actual native client, invoke a project skill/agent, read-only MCP operation and optional owned hook with independently observed markers. Exercise plan publication, manual submission, interruption, reload, continuation and one tiny implementation. Let Relay independently check/commit and compare original/worktree diffs. Test unavailable tools, stale revisions, rejected approvals and wrong cwd without disabling permissions. Clean only owned fixtures; never replace user customizations. This experiment and broader crash reconciliation remain release gates.
