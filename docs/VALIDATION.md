# Relay 0.1.2 validation - 2026-11-11 (local date)

Platform: Windows, PowerShell 5.1, Node.js 24.19.0, npm 11.17.0. Goal Guardian was not invoked or adopted. This is an experimental live implementation; the complete production backlog is not finished.

## Passed checks

- `npm run check`: type checking, **41 domain/protocol/storage/MCP/Git tests**, build and **26 Chromium UI tests** passed.
- The domain suite includes atomic persistence, ownership/integrity failures, bounded source inspection (including outside junction rejection), saved decisions/conversation, separate live/demo IPC, real worktrees/commits/local-remote pushes, intake during execution, completed-request reopening with preserved commits, stale amendment rejection and independent-check failure handling.
- A milestone gate failure is distinguished from completed specs: the request remains blocked and the final gate can be retried without reimplementing already committed work.
- UI tests cover native custom color tokens, live color changes, dark/light/both high-contrast classes, chat and task controls, decisions, model selection, attachments/references, persistence, and container/control bounds at 280, 320, 360 and 480 px. Browser screenshots were visually inspected. The browser mock continues to be labeled as a preview.
- `npm run test:host`: **6 native VS Code checks** passed on the official 1.145.3 runtime: activation, commands, view creation, demo reset, bundled plan opening and the F5 development host remaining open.
- **1 real Codex App Server integration test was rerun** for this update: model discovery, project skill/tool calls, structured answer and thread resume passed using existing native authentication. The complete 2-test suite passed during the preceding implementation validation; the real implementation-flow test was not rerun here.
- The native Claude bridge passed standard MCP HTTP and bundled-stdio client tests: auth/Origin/Host rejection, queue reads, bounded source inspection, image delivery, strict plans, stale revision rejection, progress, cancellation/restart and rotating descriptors. Disposable native handoffs verify successful independent checks/commits, failed-check blocking and wrong-original-checkout detection without reverting files.
- The UI test checks native Claude delegation: model/effort remain native and Open in Claude explains pressing Send there. The host smoke includes registration of the new connection command.
- New Codex coverage verifies additive/idempotent project TOML setup, exact preservation of existing settings/comments, refusal of conflicting/disabled/malformed/inline/busy configurations and outside junctions, separate provider turn ownership/sessions, and successful/failed/wrong-checkout native fixture handoffs through the real coordinator. The UI checks native Codex controls/hand-off instructions at 280px and switching back to App Server. The host verifies the new `relay.connectNativeCodex` command is registered.
- The separate Claude SDK bundle builds/loads. The corrected auth check returns configured=true for the existing native settings without printing credentials. Both provider settings use the IBM endpoint. The earlier environment-only conclusion that Claude was unconfigured was incorrect.
- `npm audit --omit=dev`: zero known vulnerabilities. Package generation includes runtime dependency license notices and excludes native binaries, node_modules, test fixtures, logs and local profiles.

## What the native tests actually prove

Installed versions observed: Codex `0.164.0-alpha.11.1`; Claude Code `2.1.314`. The Claude adapter pins SDK `0.3.322` and uses the installed executable explicitly.

1. Codex model discovery returned a runtime/account catalog (9 entries including Relay's runtime-default choice). A real read-only turn succeeded.
2. A project-scoped fixture skill was read, Relay search/get tools were called, a structured answer was validated, and the same native thread resumed with its earlier context.
3. A real Codex/coordinator flow investigated a small JavaScript repository, planned the requested fix, edited code/tests in an owned worktree, passed an independently executed behavior check and created a full Git commit. The original checkout's HEAD and clean state were unchanged.
4. Local Git fixture tests separately verify optional push to a disposable bare remote and fast-forward integration of milestone branches.

The initial model-backed execution attempt exposed denied Windows shell inspection: the provider could finish without making the expected change. Relay's independent check correctly rejected completion. Bounded read-only source tools were added, and the native planning/implementation flow passed afterward. No native permission policy, user home, global skill configuration or credential file was replaced to obtain that result.

## Limits of this evidence

- Authenticated Claude model turns, skills/agents/MCP invocation, native prefill/Send, continuation and real implementation are **not verified end to end**. MCP tests use standard clients and simulated handoffs; they do not prove a model called tools from the official extension. Native settings were preserved and no MCP entry was registered in the user's profile during tests. Successful Codex checks do not imply Claude parity.
- The native Codex companion's public editor context attachment and actual model consumption remain **unverified end to end** in the normal profile. The real model test above covers App Server, which is a separate route. Tests wrote MCP configuration only in disposable fixtures; the user's global/project Codex configuration was not changed during validation. Official `openai.chatgpt` 26.51106.51428 command metadata was inspected; `chatgpt.addToThread` and `chatgpt.openSidebar` match the documented public commands.
- Native Claude requires manual submission per handoff and native cancellation. Relay Stop invalidates tracking/results. Its public URL cannot set cwd; instructions plus original HEAD/branch/Git-status checks detect visible checkout changes, not enforced isolation or every ignored-file/external side effect.
- Existing native Codex configuration and project skill loading were exercised. The full global/project agents, MCP functional-call, hooks/plugin, managed-policy and native-reference matrix remains open.
- Live theme updates were tested against VS Code's documented classes and tokens in the actual webview bundle. Screenshots are browser renders; native extension smoke is separate, and an exhaustive installed-theme/zoom/accessibility matrix is not claimed.
- Native model-backed checks used simple dependency-free fixtures. Full application dependency setup, databases, services, visual baselines and remote/WSL/multi-root execution remain unverified.
- Atomic snapshots are the first single-owner persistence layer. Full transactional outbox/crash-side-effect reconciliation, automatic repair, safe active-work amendments, DAG scheduling and background execution remain production work.
- Failed or interrupted worktrees are preserved. Use Open worktree to inspect uncertain commit/push outcomes before retrying.

## F5 workaround retained

Inspector attachment previously reproduced exit 134 before Relay activation, including in a clean official VS Code installation. The pinned isolated runtime launches with `noDebug: true` and stays running. This enables preview/live testing without breakpoint debugging; the underlying inspector issue is not claimed repaired. Existing user VS Code windows/profiles were not modified by the smoke test.

## Artifacts

`artifacts/relay-workspace-0.1.2.vsix` is the current package, including the separate native MCP proxy, TOML parser and runtime dependency notices. `artifacts/SHA256SUMS.txt` records its digest. Host reports, screenshots and Playwright results remain local artifacts. This workspace itself has no Git repository; all test commits/pushes used disposable fixtures.
