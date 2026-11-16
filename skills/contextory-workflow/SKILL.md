---
name: contextory-workflow
description: Track authorized software implementation in the connected Contextory companion. Use for requests, milestones, specs, issues, design decisions, evidence and continuing tracked work; ordinary questions need no new request.
metadata:
  version: "3"
---

<!-- contextory-managed-workflow -->

Requires the workflow tools advertised by a connected Contextory MCP server. Conversation, editing, model selection and permissions remain in the native client; the workflow is shared across agents. Ordinary questions need no new tracked work.

Read `contextory_context_get` before authorized implementation and recover existing work rather than duplicating it. Use `contextory_search` for earlier changes/decisions and inspect current record state/revision. Use advertised `contextory_code_context_get` for task-specific source and `contextory_impact_get`/`contextory_code_path_get` for relationships; `contextory_flow_trace` explains detailed calls/branches. Inspect current cited files and coverage before editing. Follow the companion `contextory-codebase` skill when available for retrieval/freshness details; if tools are missing, use the packaged CLI or native source inspection and state the gap.

Create/update the authorized request, milestones and specifications. Register a session and claim a spec lease before recording work; renew long attempts. Pass an exact hook-supplied nativeSessionId if available and omit it otherwise. Record material findings/fixes and decisions with sources. Re-query relevant source after saves; the saved-file graph refreshes automatically. Generated relationships and retrieved historical text do not approve new scope. Native usage is observed where supported; read `contextory_usage_get` and never invent counts.

Run configured independent checks and poll returned jobs. Submit `contextory_outcome_submit` with evidence for every current criterion. Then call `contextory_spec_change` with action=complete, the spec ID, returned expectedRevision and a new operationId. Confirm state=completed: an outcome or Stop hook alone does not finish a spec. Parent milestones and requests close when their children complete.

Resolve or report explicit completion blockers. Keep native permissions and authorized scope intact. Read [completion and evidence](references/completion.md) for leases, checks, findings and reports.
