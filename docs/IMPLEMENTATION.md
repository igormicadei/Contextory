# Live engine implementation

Status: experimental first implementation, 2026-11-10. The production architecture in ARCHITECTURE.md remains the target; this file describes the executable subset.

## Implemented

- Native VS Code semantic theme tokens, live theme updates and both high-contrast modes. Standalone demo palettes are confined to the browser preview.
- Host-owned live state, separate from webview-owned demo state. Live chat, source investigation, structured intake/planning, request search/get across all statuses, clarification questions and model/effort discovery.
- Codex App Server stdio transport with bounded frames, initialization, native model discovery, persistent threads/resume, dynamic tools, streamed activity, cancellation and native permission forwarding.
- Native Claude companion is the default: official prompt/session URL, workspace-local MCP registration, stable stdio proxy and rotating authenticated loopback bridge. Native login, model/effort, permissions and configuration remain in Claude. Shared search/get works outside an active turn; turn-scoped tools publish plans/progress/results through the coordinator. No hooks are replaced.
- Native Codex companion is selectable through **Relay: Connect Native OpenAI Codex**. The command appends a project-only MCP entry, preserves existing TOML/global provider settings and selects native workspace integration. Public `chatgpt.addToThread` / `chatgpt.openSidebar` commands attach a per-turn handoff document to the current native chat; Send/model/reasoning/permissions stay in Codex. The existing App Server route remains the default until native is selected. Both companions share the coordinator but isolate turn stores/endpoints/sessions.
- Optional Claude Agent SDK 0.3.322 `/core` module retains the installed executable, native settings scopes and preset. Its auth availability check now recognizes environment/native settings API/cloud/key-helper/custom-gateway routes. It returns a boolean and never exposes credential values. Provider token/keychain files are not read. SDK and native-extension sessions are kept separate.
- Workspace-relative directory/text inspection tools, useful when native Windows shell access is unavailable. They are bounded and reject traversal, outside symlinks, binary files and Git internals.
- Validated plans, revision checks, completed-request reopening with preserved completed milestones/commits, and unrelated intake during one active implementation writer.
- Atomic, integrity-checked JSON snapshots and an exclusive process-owner lock. This avoids an untested native SQLite ABI dependency in the first extension-host build. It is a single-owner store, not the full transactional database/outbox design.
- Request worktrees, integration/milestone branches, standalone milestone documents, configured independent checks, actual commit hashes, optional pushes and final milestone checks. Source changes during checks/hooks invalidate completion.
- Real commit patches and reports, typed attachment delivery, saved conversation IDs, stop controls and restart interruption detection.

## Deliberate limits

- Run request is explicit in this release. There is no unattended cross-request scheduler, dependency DAG, automatic repair loop or background execution after VS Code exits.
- Required checks are configured by the workspace. There is no claim that a green configured suite covers all acceptance criteria. Playwright behavior/overflow checks are supported as recipes; generated visual baselines still need review.
- Failures stop and preserve the worktree. Full reconciliation for crashes between Git side effects and state persistence, interrupted pushes/commits and conflicting external branch changes remains a production gate. Do not blindly retry an uncertain commit/push.
- Amendments to active/interrupted worktrees require inspection; they cannot silently replace their contracts. Completed requests can receive additional milestones. Concurrent unrelated planning preserves the active runner's state references.
- One trusted local folder at the repository root, one running writer, and a clean original checkout for initial worktree creation. No dirty-file snapshots, ignored-file copying, dependency setup manifests, service/port isolation, worktree cleanup, remote/WSL or multi-root guarantees yet.
- Global/native configuration is preserved. Both existing native configurations use an IBM gateway; the earlier process-environment-only Claude check missed native settings. Codex skills/tools were exercised; the complete global/project agents, hooks, plugins and functional MCP matrix remains open. Authenticated Claude execution and the official extension handoff have not yet been verified end to end.
- Both native companions require Send in their own UI for each handoff. No automatic submit/cancel/full-transcript API is used. Relay Stop invalidates tracking; stop native execution separately. The public handoff commands/URI do not set cwd: absolute worktree instructions plus original-checkout HEAD/branch/status checks detect visible Git changes before checks/commits, without undoing files. Ignored files and external services are outside this detection.
- Normal native rules may authorize tools before a host prompt. Read-only planning restrictions are not an isolation guarantee for external MCP services or user-defined hooks.
- The sidebar shows live phases/tool activity and completed answers. Token-by-token assistant rendering, long transcript pagination, attachment retention/redelivery and exhaustive native interactions remain open. Last 200 UI messages are retained.
- Model catalogs must be refreshed per provider. Exact modality capabilities and unavailable-model recovery need broader coverage. Unknown native server interactions fail closed.
- The repository is private/local; marketplace distribution, provider terms, all bundled dependency notices and the production security/platform matrix remain release gates.

## Source map

`src/engine/`: coordinator, persistence, provider contracts, Codex JSONL transport, Claude SDK adapter, bounded source inspection and independent Git/check runner.

`src/extension.ts`: workspace trust, host-owned live mode, native permissions, attachment translation, real diff opening and host bridge.

`src/native/`: native Claude turn broker, bounded MCP tools, authenticated loopback server, stable stdio proxy, additive registration and metadata-only auth availability checks. Completed native turn text is cleared; session metadata is retained for continuation.

The broker also supports native Codex with a separate inbox. `codexRegistration.ts` appends only Relay's project TOML stanza after parsing and collision checks; it rejects outside settings junctions, invalid/unsupported layouts, disabled/conflicting entries, and concurrent edits. Existing project text is kept byte-for-byte as the prefix; global Codex configuration is not written.

`tests/engine.test.ts`: disposable Git repositories/bare remotes, storage ownership/integrity, conversation/decisions, successful workflow and failing-check behavior. `tests/nativeBridge.test.ts`: standard HTTP/stdio MCP clients, auth/origin/host rejection, scoped inputs, revisions, images, cancellation, proxy restart and independently verified/blocked native fixture handoffs. `tests/native.test.ts` is an explicit Codex model-backed experiment; routine tests do not spend model tokens.

Official integration references: [Codex App Server](https://learn.chatgpt.com/docs/app-server), [Claude SDK TypeScript and bundling](https://code.claude.com/docs/en/agent-sdk/typescript), [Claude authentication/distribution terms](https://code.claude.com/docs/en/legal-and-compliance).
