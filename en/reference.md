# Settings, commands and storage

## Workspace settings

| Setting | Default | Behavior |
| --- | --- | --- |
| contextory.autoConnect | true | Prepare detected agent bridges; pause preserves existing connections |
| contextory.startupAgent | auto | auto, last-used, codex, claude, bob or none |
| contextory.restartAfterSetup | prompt | prompt, automatic or never after changed MCP/hooks/runtime |
| contextory.nodeExecutable | node | Machine-level Node.js 24+ executable |
| contextory.pythonExecutable | python | Machine-level Python 3.10+ executable for analysis |
| contextory.flowDepth | 5 | Call-hop depth, 0–12 |
| contextory.checks | [] | Up to 256 named executable/argument-array recipes; invalid changes retain the connection and last valid list |

## Editor commands

Use the Command Palette for connection setup/recovery, architecture, flow, indexing, semantic preparation, reports and generic MCP export. The exact command IDs/titles and configuration defaults are declared in package.json; inspect them when adapting automation to a newer version.

[Connection and check setup](quickstart.md)

[Tool signatures and input schemas](api.md)

## Storage and backups

Editor records, revisions, audit events, artifacts and service credentials live in editor-managed global storage for contextory-local.contextory-workspace, namespaced by canonical project path. Exact locations depend on the editor/profile. Moving a project changes its identity in this preview. Agent bridge configuration and portable skills live in the workspace.

Standalone mode defaults to <root>/.contextory-local/service unless --storage or a matching live editor --descriptor is provided. This is authoritative storage, not just a disposable build cache. Back it up when using headless mode.

1. Close clients for the project and let the editor service stop after its approximately 65-second grace period.
2. Copy the relevant editor-managed project storage or headless service directory as a consistent backup.
3. Retain native provider credentials separately. Do not edit SQLite or service descriptors to bypass workflow or review controls.

## Read this documentation’s coverage correctly

The bilingual corpus is the source of the human pages, Markdown and LLM exports. Its ownership roots cover the documentation build scripts; Contextory source and tests are cited as hash-bound supporting evidence. Application function/class docstrings were not rewritten. The generated source-symbol appendix therefore documents the build tooling, while the MCP API page documents the product’s public tool contracts.

The historical documentation rewrite used native inspection while Contextory was unavailable. The 0.8.0 delivery recovered the original service ledger and inspected current source and tracked work. Observed catalog definitions are not human-approved requirements. See the review record for scope and evidence limits.

## Sources

- package.json
- src/providers/clients.ts
- src/cli.ts
- src/storage/ledger.ts
- scripts/documentation/build.py
- src/agents/instructions.ts
- src/analysis/engine.ts
- src/analysis/manager.ts
- src/analysis/python-flow.py
- src/analysis/python.ts
- src/analysis/worker.ts
- src/cli.ts
- src/codebase/config.ts
- src/codebase/extract.ts
- src/codebase/import.ts
- src/codebase/index.ts
- src/codebase/model.ts
- src/codebase/python-index.py
- src/codebase/queries.ts
- src/codebase/references.ts
- src/codebase/watch.ts
- src/codebase/worker.ts
- src/contracts/model.ts
- src/contracts/tools.ts
- src/contracts/usage.ts
- src/core/history.ts
- src/core/report.ts
- src/core/usage.ts
- src/core/workflow.ts
- src/editor/calls.ts
- src/extension.ts
- src/hooks/launcher.ts
- src/hooks/observation.ts
- src/knowledge/catalog.ts
- src/knowledge/export.ts
- src/knowledge/search.ts
- src/mcp/proxy.ts
- src/mcp/readiness.ts
- src/mcp/tool-definitions.d.ts
- src/providers/clients.ts
- src/providers/recovery.ts
- src/providers/registration.ts
- src/providers/reload.ts
- src/providers/skill-content.ts
- src/providers/startup.ts
- src/releases/config.ts
- src/releases/git.ts
- src/releases/manager.ts
- src/releases/watch.ts
- src/service/application.ts
- src/service/client.ts
- src/service/main.ts
- src/service/rpc.ts
- src/service/server.ts
- src/service/workspace.ts
- src/storage/atomic.ts
- src/storage/ledger.ts
- src/verification/checks.ts
- src/verification/workspace.ts
- src/webview/architecture.ts
- src/webview/assets.d.ts
- src/webview/catalog.ts
- src/webview/document.ts
- src/webview/explorer.ts
- src/webview/flow.ts
- src/webview/html.ts
- src/webview/main.ts
- src/webview/relationships.ts
- src/webview/versions.ts
- artifacts/architecture-dark.png
- artifacts/architecture-explorer.png
- artifacts/architecture-light-320.png
- artifacts/code-map-explorer.png
- artifacts/companion-sidebar.png
- artifacts/contextory-brand.png
- artifacts/relationships.png
- artifacts/request-details.png
- artifacts/request-history.png
- artifacts/source-flow.png
- artifacts/themes.png
- media/contextory-icon.png
- media/contextory-icon.svg
- media/contextory.svg
- .documentation/redirects.json
- .documentation/aliases.json
- .documentation/markdown-targets.json
- .documentation/tool-contracts.json
- .documentation/legacy-assets.json
- scripts/docs.mjs
- scripts/licenses.mjs
- scripts/verify-release.mjs
- scripts/documentation/vendor/PROVENANCE.json
- src/service/reconnect.ts
- src/webview/progress.ts
- tests/ui/console.spec.ts
- tests/integration/recipe-configuration.test.ts
- scripts/verify-background-startup.mjs

