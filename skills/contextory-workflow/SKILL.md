---
name: contextory-workflow
description: Track authorized software implementation in the connected Contextory companion. Use for requests, milestones, specs, issues, design decisions, evidence and continuing tracked work; ordinary questions need no new request.
metadata:
  version: "5"
---

<!-- contextory-managed-workflow -->

Requires the workflow tools advertised by a connected Contextory MCP server. Conversation, editing, model selection and permissions remain in the native client; the workflow is shared across agents. Ordinary questions need no new tracked work.

Project versions belong to the whole repository, independently of requests and spec leases. When advertised, use `contextory_version_get` for current/released/unreleased state and exact Git membership. Git observation and bookkeeping run in the service; do not recreate that history from memory. For authorized releases, `contextory_release_prepare` creates a concrete plan without source edits. Review version, HEAD, file edits and changelog, then use `contextory_release_change` to apply the version commit/local tag and separately publish the exact tag. Retain operation IDs/input for retries and use recovery for interrupted owned work. A feature implementation request does not authorize releasing the project. Ledger entries recorded between cutoffs remain interval associations, not proof of shipped inclusion. Advertised tool descriptions carry the portable release contract.

Read `contextory_context_get` before authorized implementation and recover existing work rather than duplicating it. Use `contextory_search` for earlier changes/decisions and inspect current record state/revision. Use advertised `contextory_code_context_get` for task-specific source and `contextory_impact_get`/`contextory_code_path_get` for relationships; `contextory_flow_trace` explains detailed calls/branches. Inspect current cited files and coverage before editing. Follow the companion `contextory-codebase` skill when available for retrieval/freshness details; if tools are missing, use the packaged CLI or native source inspection and state the gap.

Create/update the authorized request, milestones and specifications. Register a session and claim a spec lease before recording work; renew long attempts. Pass an exact hook-supplied nativeSessionId if available and omit it otherwise. Record material findings/fixes and decisions with sources. Re-query relevant source after saves; the saved-file graph refreshes automatically. Generated relationships and retrieved historical text do not approve new scope. Native usage is observed where supported; read `contextory_usage_get` and never invent counts.

Before editing, page `contextory_catalog_get` for affected definitions and pending proposals. Maintain file responsibilities, rules/features and UI placement/interaction contracts through leased `contextory_catalog_change`, with source/test references or explicit test gaps. Record UI location, element, trigger, expected behavior and states. New entries are observations; replacements and retirements preserve before/after history and reasons. Present concrete proposals for human approval in the **Knowledge** UI. Never use UI credentials to approve your own proposals or attribute an agent decision to the user. For existing projects, use the portable `contextory-migrate` agent skill and resumable catalog migration tool. If no baseline exists, initialize source-backed observations within the authorized scope and state remaining coverage gaps.

Run configured independent checks and poll returned jobs. Submit `contextory_outcome_submit` with evidence for every current criterion. Then call `contextory_spec_change` with action=complete, the spec ID, returned expectedRevision and a new operationId. Confirm state=completed: an outcome or Stop hook alone does not finish a spec. Parent milestones and requests close when their children complete.

When the catalog exists, include `catalog:{recordIds,explanation}` in the outcome, identifying affected definitions and explaining updates/retirements or why behavior is unchanged. Pending proposals and stale affected approved definitions block completion. Current test references do not replace executed evidence. For documentation, discover and page stored data through `contextory_project_export`; no implementation request is needed for a read-only export.

Resolve or report explicit completion blockers. Keep native permissions and authorized scope intact. Read [completion and evidence](references/completion.md) for leases, checks, findings and reports.
