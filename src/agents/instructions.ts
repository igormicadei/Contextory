// Shared by native/headless MCP and the workspace brief. Host adapters supply
// capabilities and discovery paths; retrieval and workflow stay consistent.
export const retrievalGuidance = [
  "Use advertised Contextory capabilities. For code questions and before related edits, use contextory_code_context_get with the task, known paths and optional specId; inspect cited current source before deciding or editing. Read-only exploration needs no tracked request.",
  "Use contextory_code_architecture_get for broad orientation, contextory_impact_get for callers/dependencies/tests/records, contextory_code_path_get to explain a connection, and contextory_flow_trace for detailed calls/branches. Qualify ambiguous symbols as source:path#qualifiedName where supported.",
  "For other local repositories, use advertised contextory_codebase_list/contextory_codebase_change to register authorized reference directories. Pass codebaseId explicitly on source queries and flow expansion; omission/current always means the active workspace. References have isolated graphs and no active project memory. Keep returned codebase identity/root with relative citations. Understanding a reference does not authorize applying it, changing current requirements or editing either project. Reference queries verify saved source on demand; cached architecture needs refresh=true for current coverage.",
  "Use contextory_search for prior decisions, findings and changes; read full records/revisions with contextory_entity_get and page contextory_history_get or artifacts when needed. Check record state and provenance. Generated graph facts do not become approved project requirements.",
  "Keep snapshot, citations, coverage and truncation attached to conclusions; narrow paths/query or page results instead of treating a bounded result as exhaustive. Static/inferred/test links are not runtime or execution-coverage proof.",
  "Saved edits refresh automatically; task/impact/path queries verify disk content. Re-query after relevant saved edits. Refresh an empty/stale/failed index as appropriate; partial dynamic/external coverage may need native source inspection. Unsaved flow overlays are separate. Stale Graphify facts need regeneration/re-import. If a capability is unavailable, use the packaged CLI or native source tools and state the gap.",
] as const;

export const workflowGuidance = [
  "Read contextory_context_get before authorized implementation. Create/update its request, milestones and specs; attach the native session (exact supplied nativeSessionId only) and claim/renew a spec lease. Conversation, editing and permissions stay native.",
  "Record material findings/fixes and decisions with sources. Run configured contextory_check_run recipes and poll contextory_entity_get for independent evidence; reported external results remain reported. Read contextory_usage_get for observed usage; never invent counts.",
  "If checks are missing, configure the project's existing meaningful command in workspace contextory.checks using native editing, then reread context. If no meaningful check is available, report verification pending. Finish source edits before final checks; evidence is bound to current source, contract and attempt.",
  "Submit contextory_outcome_submit with evidence for every criterion, then call contextory_spec_change action=complete with the returned revision and a new operationId; confirm state=completed. Resolve/report blockers, including missing checks. Submission alone does not close work. Parents close with their children; export contextory_report_export for the request.",
] as const;

export const agentInstructions = [
  ...retrievalGuidance,
  ...workflowGuidance,
].join("\n");
export const completionNote =
  "Keep work in the native agent. For authorized implementation, submit an outcome and explicitly complete each verified spec with the returned revision. Confirm state=completed; report unresolved blockers. Native scope and permissions still apply.";
export const retrievalReminder =
  "Use contextory_code_context_get for the task and cited source; contextory_impact_get/contextory_code_path_get for connections, contextory_search for earlier decisions. Inspect current files and coverage. Saved edits refresh the graph; re-query after related changes. Use advertised tools, the packaged CLI or native source inspection when a capability is missing. Read-only questions need no request.";
