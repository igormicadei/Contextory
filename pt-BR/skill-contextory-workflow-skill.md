# Skill de fluxo de implementação

## Skill de fluxo de implementação

Este é um recurso portátil de instruções distribuído sem alterações aos clientes suportados. O guia bilíngue vinculado explica sequência de tarefas, atualização das fontes, permissões e limites. Leia o SKILL.md instalado e suas referências ao aplicar a skill.

[Ler o guia bilíngue do fluxo](outcomes.md)

Caminho do recurso canônico

```text
---
name: contextory-workflow
description: Track authorized software implementation in the connected Contextory companion. Use for requests, milestones, specs, issues, design decisions, evidence and continuing tracked work; ordinary questions need no new request.
metadata:
  version: "9"
---

<!-- contextory-managed-workflow -->

Requires the workflow tools advertised by a connected Contextory MCP server. Conversation, editing, model selection and permissions remain in the native client; the workflow is shared across agents. Ordinary questions need no new tracked work.

Read `uiLanguage` and `contentLanguageInstruction` from `contextory_context_get` before writing records. Write all new UI-facing prose in that VS Code language (`en` or `pt-BR`): titles, descriptions, criteria, findings/fixes, decisions/rationale, review reasons, catalog/UI contracts, outcomes and reports, even if this conversation uses another language. Preserve historical content and exact IDs, paths, symbols, code, commands and protocol keys. Keep documentation's required paired locales. Do not bulk-translate existing records; headless projects default to English unless an editor configured their language.

When managed hooks are missing, stale or duplicated, advertised `contextory_hooks_rebuild` repairs only the chosen project's native hooks and launcher. Pass explicit `projectId`, native `provider` and a new `operationId`; no spec lease is needed for this setup repair. Follow its trust/reload guidance and verify an observed hook event. Do not repeatedly rebuild an unchanged setup or edit global trust records. If MCP is unavailable, use the editor's **Contextory: Rebuild Agent Hooks** command and inspect service logs; native approval remains client-owned. See the codebase skill's recovery guidance for Codex workspace path casing.

For multiple workspace folders, read `contextory_workspace_get` and keep an explicit `projectId` on every related workflow/source call, adding `workspaceId` for ambiguous editor contexts. Each project owns its requests, records, sessions/leases, catalog, checks, evidence and releases. Never infer project identity from an ID, source path or the UI selector. For user-authorized work spanning projects, `contextory_workspace_request_create` creates linked local requests for explicit `projectIds` including this server's project. Implement each branch with its own milestones/specs, session, lease and evidence, then check the group with `contextory_workspace_get` and `groupId`. Partial/offline/missing branches remain incomplete. Retry partial creation only with the exact original operationId/input retained on the branch. Keep interface ordering explicit; there is no cross-project spec lease, atomic multi-project transaction or inferred dependency. Hook/usage attribution stays with the observing project.

Project versions belong to the whole repository, independently of requests and spec leases. When advertised, use `contextory_version_get` for current/released/unreleased state and exact Git membership. Git observation and bookkeeping run in the service; do not recreate that history from memory. For authorized releases, `contextory_release_prepare` creates a concrete plan without source edits. Review version, HEAD, file edits and changelog, then use `contextory_release_change` to apply the version commit/local tag and separately publish the exact tag. Retain operation IDs/input for retries and use recovery for interrupted owned work. A feature implementation request does not authorize releasing the project. Ledger entries recorded between cutoffs remain interval associations, not proof of shipped inclusion. Advertised tool descriptions carry the portable release contract.

Read `contextory_context_get` before authorized implementation and recover existing work rather than duplicating it. Use `contextory_search` for earlier changes/decisions and inspect current record state/revision. Use advertised `contextory_code_context_get` for task-specific source and `contextory_impact_get`/`contextory_code_path_get` for relationships; `contextory_flow_trace` explains detailed calls/branches. Inspect current cited files and coverage before editing. Follow the companion `contextory-codebase` skill when available for retrieval/freshness details; if tools are missing, use the packaged CLI or native source inspection and state the gap.

Create/update the authorized request, milestones and specifications. Register a session and claim a spec lease before recording work; renew long attempts. Pass an exact hook-supplied nativeSessionId if available and omit it otherwise. Record material findings/fixes and decisions with sources. Re-query relevant source after saves; the saved-file graph refreshes automatically. Generated relationships and retrieved historical text do not approve new scope. Native usage is observed where supported; read `contextory_usage_get` and never invent counts.

Before editing, page `contextory_catalog_get` for affected definitions, pending proposals and freshness. Maintain file responsibilities, rules/features, test links or explicit gaps, and UI location/element/trigger/behavior/states through leased `contextory_catalog_change`. New observations need no mandatory approval. Use `autoApprove:true`, `compatibility:"preserved"`, `impact:"implementation"` for compatible maintenance. Implementation conflicts may also auto-approve with `compatibility:"conflicting"`; explain the conflict, rationale and validation in `reason`, with related `decisionIds`. Keep approved behavior text/UI contracts intact. Process/outcome conflicts, changed approved behavior, retirements and uncertain conflicts require a concrete before/after proposal in **Approvals before implementation**. Wait for its decision; silence or a timeout never approves. Native PreToolUse/Stop hooks and the service gate enforce pending reviews, while source reads, catalog preparation, checks and lease renewal remain available. Do not switch tools to bypass the gate or use human UI credentials. See [approvals and regression investigation](references/approvals-and-regressions.md) for examples, decision conflicts and audit requirements. Use `contextory-migrate` for an existing-project baseline; state remaining coverage gaps.

Run configured independent checks and poll returned jobs. Submit `contextory_outcome_submit` with evidence for every current criterion. Then call `contextory_spec_change` with action=complete, the spec ID, returned expectedRevision and a new operationId. Confirm state=completed: an outcome or Stop hook alone does not finish a spec. Parent milestones and requests close when their children complete.

When the catalog exists, include `catalog:{recordIds,explanation}` in the outcome, identifying affected definitions and explaining updates/retirements or why behavior is unchanged. Pending proposals and stale affected approved definitions block completion. Current test references do not replace executed evidence. For documentation, discover and page stored data through `contextory_project_export`; no implementation request is needed for a read-only export.

Resolve or report explicit completion blockers. Keep native permissions and authorized scope intact. Read [completion and evidence](references/completion.md) for leases, checks, findings and reports.

```

## Fontes

- skills/contextory-workflow/SKILL.md

