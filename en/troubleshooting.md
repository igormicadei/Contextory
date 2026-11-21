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

## Recover source results and completion

| Symptom | Action |
| --- | --- |
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

