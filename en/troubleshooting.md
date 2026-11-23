# Troubleshooting and recovery

## Recover service and native connections

| Symptom | Action |
| --- | --- |
| Service unavailable | Keep the project editor open, check Node 24+ in its PATH, set contextory.nodeExecutable if needed and inspect Output > Contextory |
| Analysis or connection disabled | Trust a supported local workspace; avoid virtual/remote or nested project roots |
| Gray agent light | Hover for configuration/traffic state, click to retry setup, review native MCP/hook trust and make a read-only call |
| Tools missing in an old chat | Restart agent extensions, reload the native MCP connection and reopen the chat as required by that client |
| Hooks remain unobserved | Rebuild once, inspect repaired files, then check native trust and trigger a supported lifecycle event; unchanged files are not execution evidence |
| Unowned or malformed configuration | Resolve the concrete conflict; registration preserves unowned entries and refuses linked paths |
| Older service after an upgrade | Follow the mismatch message; close project editors for about 65 seconds before reopening when requested |

[Connection and hook recovery walkthrough](user-guide.md)

## Automatic recovery and request timeouts

The editor probes service health every 20 seconds with a five-second timeout. Lost streams, including clean closure, trigger reconnection after 1, 2, 4, 8, 16 and at most 30 seconds. The view labels retained data and offers Retry now. Recovery never replays failed mutations.

REQUEST_TIMEOUT means an operation exceeded its request budget; it does not establish SERVICE_UNAVAILABLE. Ordinary tools allow 120 seconds and release operations have their separate five-minute budget. For an uncertain mutation response, recover with the exact original operation ID and input.

For the former Configure at most 30 check recipes error, upgrade to 0.8.0: up to 256 recipes are supported. Fix duplicate IDs or malformed recipes through Fix check settings. Configuration errors retain the service and its last valid recipes.

Rebuild hooks writes managed files immediately. Changed repairs follow contextory.restartAfterSetup: prompt, automatic or never. The installed Codex extension exposes no public hook-refresh command; Contextory cannot grant native trust or guarantee immediate reload inside a running chat. Review /hooks in that session, keep workspace path casing consistent and reopen the chat after restarting extensions when required.

## Recover source results and completion

| Symptom | Action |
| --- | --- |
| An item remains pending in Approvals | Read the inline error. For changed sources, inspect the linked files, enter a reason, refresh the source snapshot, then approve the new revision. Missing references or an outdated proposal target require correction or rejection. Refresh does not approve. |
| Python flow fails | Check Python 3.10+ and contextory.pythonExecutable; use an absolute executable path if needed |
| Unexpected source root | Set projectId/codebaseId explicitly and focus the intended editor symbol before tracing |
| Source search seems stale | Re-query saved source; refresh an empty/failed index, inspect exclusions and regenerate/re-import stale Graphify data |
| Semantic search unavailable | Prepare the optional local runtime and index, or use lexical/hybrid fallback |
| Spec stays submitted | Poll check jobs, resolve blockers and stale evidence, submit every criterion mapping, then explicitly complete using the returned revision |
| Cross-project group incomplete | Restore missing/offline workspace members and recover missing branches on the original owner; verify each local request |

## Report a reproducible issue

Include Contextory version, editor/version, Node/Python versions, exact error text and reproduction steps. Remove credentials, private descriptors, tokens and project-private records before sharing logs. Preserve current coverage and unverified limits.

[Open the issue tracker](https://github.com/igormicadei/Contextory/issues)

## Sources

- src/mcp/readiness.ts
- src/providers/registration.ts
- src/storage/atomic.ts
- src/service/server.ts
- src/core/workflow.ts
- tests/core/readiness.test.ts
- src/extension.ts
- src/service/reconnect.ts
- src/service/rpc.ts
- src/webview/progress.ts
- tests/ui/console.spec.ts
- tests/integration/recipe-configuration.test.ts
- scripts/verify-background-startup.mjs
- src/knowledge/catalog.ts
- src/webview/catalog.ts
- tests/ui/catalog.spec.ts
- tests/integration/catalog.test.ts

