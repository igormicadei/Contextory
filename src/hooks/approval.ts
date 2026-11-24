import type { Entity, Provider } from "../contracts/model";

export interface ApprovalGate {
  blocked: boolean;
  pending: number;
  items: { id: string; specId?: string; title: string }[];
  reason: string;
}

// Exact tool identities only. A shell, browser or wrapper can write even when
// its name or arguments mention a read tool; unknown tools wait for review.
const recovery = new Set([
  "contextory_session_attach",
  "contextory_spec_lease",
  "contextory_finding_record",
  "contextory_evidence_record",
  "contextory_check_run",
  "contextory_hooks_rebuild",
  "contextory_catalog_change",
]);
const reads = new Set([
  "contextory_context_get",
  "contextory_workspace_get",
  "contextory_entity_get",
  "contextory_catalog_get",
  "contextory_search",
  "contextory_history_get",
  "contextory_code_context_get",
  "contextory_code_architecture_get",
  "contextory_code_path_get",
  "contextory_impact_get",
  "contextory_flow_trace",
  "contextory_flow_expand",
  "contextory_codebase_list",
  "contextory_usage_get",
  "contextory_version_get",
  "contextory_project_export",
  "contextory_report_export",
  "contextory_docs_get",
]);
export function approvalSafeTool(tool = "") {
  const name = tool.replace(/^mcp__[^\s]+__/, "");
  return (
    reads.has(name) ||
    recovery.has(name) ||
    /^(?:Read|Glob|Grep|LS|Search|View|List|read_file|list_directory|search_files|view_image|wait|sleep|request_user_input|request_user_input_async)$/.test(
      name,
    )
  );
}

export function approvalGate(
  pending: Entity[],
  event: string,
  tool?: string,
): ApprovalGate {
  const blocked =
    pending.length > 0 &&
    (event === "Stop" || (event === "PreToolUse" && !approvalSafeTool(tool)));
  return {
    blocked,
    pending: pending.length,
    items: pending
      .slice(0, 20)
      .map((p) => ({ id: p.id, specId: p.parentId, title: p.title })),
    reason: pending.length
      ? `Approval required for ${pending.length} pending change(s): ${pending
          .slice(0, 10)
          .map((p) => p.id)
          .join(
            ", ",
          )}. Wait for the human decision in Contextory > Approvals. Do not implement the proposal, use another tool to perform it, or claim completion. Read context/catalog/history to check status; independent checks and lease renewal remain available. After rejection, preserve or restore the established behavior and validate it before continuing.`
      : "No pending change requires approval.",
  };
}

// PreToolUse uses the hosts' permission-decision envelope. Exit 2 is also
// emitted by the launcher for hosts that consume blocking stderr.
export function approvalOutput(
  provider: Provider,
  event: string,
  reason: string,
) {
  if (provider === "bob") return "";
  return (
    JSON.stringify(
      event === "PreToolUse"
        ? {
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "deny",
              permissionDecisionReason: reason,
            },
          }
        : { decision: "block", reason },
    ) + "\n"
  );
}
