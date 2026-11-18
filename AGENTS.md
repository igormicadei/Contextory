# Working on Contextory

For codebase questions and related changes, read [the codebase skill](skills/contextory-codebase/SKILL.md). For authorized implementation, also read [the workflow skill](skills/contextory-workflow/SKILL.md), recover existing tracked work, and follow its evidence/completion requirements. Read-only questions need no new request.

Use the tools advertised by this session. Older MCP connections may lack new codebase tools; use the packaged CLI (`node dist/contextory.mjs help`) or native `rg`/file reads and describe material coverage gaps. Inspect current cited source and re-query after relevant saves. Saved changes refresh the graph automatically; imported Graphify data must be regenerated/re-imported when stale. Detailed routing and freshness guidance lives in the codebase skill's reference.

Repository map:

Maintain the project catalog through advertised catalog tools: file responsibilities, rules/features with tests or explicit gaps, and UI location/element/trigger/behavior/states. Preserve original definitions and propose replacements/retirements for human Knowledge review. Include catalog coverage in outcomes. Use the portable `skills/contextory-migrate/SKILL.md` agent for existing-project baselines. Documentation can page all stored datasets through `contextory_project_export`; preserve provenance, current versus historical state and source freshness.

- `src/codebase`: persistent source projection, extractors, freshness and queries.
- `src/service`, `src/contracts`, `src/core`, `src/storage`: application/tool contracts, tracked work and authoritative ledger.
- `src/knowledge`, `src/analysis`, `src/editor`: project memory, source flow and editor integration.
- `src/releases`: project-wide Git observation, release plans, version adapters and recoverable tag publication. Versions are independent of requests; implementation does not authorize releasing this workspace.
- `src/providers/clients.ts`: host capability/discovery differences. Keep shared behavior independent of any host.
- `src/agents/instructions.ts`: shared runtime retrieval/workflow instructions for native/headless MCP, briefs and hook reminders.
- `src/webview`, `media`, `tests`: UI, assets and core/integration/analysis/UI/host validation.

Edit canonical portable skills in `skills/`. Run `npm run skills:sync` to regenerate their bundle and synchronize managed resources for Codex, Claude, Bob and generic clients without changing MCP/hooks. Do not edit `src/providers/skill-content.ts` or client skill copies independently. `npm run skills:check` checks bundle drift; `npm run skills:workspace-check` checks installed workspace copies. Client configuration is workspace-local and ownership-aware.

Use focused checks appropriate to the change; `npm run check` covers bundle drift, typecheck, build, backend and UI tests. Changes to tool transport or registration should include headless/service/registration integration checks. Validate revised skills with the skill-creator validator when available. Refresh the local VSIX/checksum when changing delivered resources; publishing or installing into a live editor is a separate action.

See [development](docs/DEVELOPMENT.md), [code intelligence](docs/CODEBASE-INTELLIGENCE.md) and [native-agent architecture](docs/NATIVE-AGENT-ARCHITECTURE.md) for deeper details. Preserve unrelated uncommitted work and existing client configuration.
