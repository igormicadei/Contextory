import type { Audit, Entity, HistoryPage } from "../contracts/model";
import type { Ledger } from "../storage/ledger";

const verbs: Record<string, string> = {
  "request.created": "Created request",
  "request.revised": "Updated request contract",
  "milestone.created": "Planned milestone",
  "spec.created": "Defined specification",
  "spec.claimed": "Started implementation",
  "spec.completed": "Completed specification",
  "spec.revise": "Revised specification",
  "spec.reopen": "Reopened specification",
  "spec.block": "Blocked specification",
  "spec.cancel": "Cancelled specification",
  "outcome.created": "Recorded implementation results",
  "outcome.submitted": "Submitted results for verification",
  "finding.created": "Recorded issue",
  "finding.updated": "Updated issue resolution",
  "decision.created": "Recorded design decision",
  "evidence.created": "Recorded test evidence",
  "lease.renew": "Renewed implementation session",
  "lease.release": "Released specification",
  "session.created": "Connected native agent session",
  "relationship.added": "Linked related project records",
  "milestone.completed": "Completed milestone",
  "request.completed": "Completed request",
  "milestone.active": "Reopened milestone",
  "request.active": "Reopened request",
  "check.started": "Started independent check",
  "check.finished": "Finished independent check",
  "check.queued": "Queued independent check",
  "check.passed": "Passed independent check",
  "check.failed": "Failed independent check",
  "check.interrupted": "Interrupted independent check",
  "check.stale": "Source changed during independent check",
};
export function describeActivity(
  event: Audit,
  lookup: (id: string) => Entity | undefined,
): Audit {
  const entity = lookup(event.entityId);
  const context: NonNullable<Audit["context"]> = [];
  let current = entity;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (["request", "milestone", "spec"].includes(current.kind))
      context.unshift({
        id: current.id,
        title: current.title,
        kind: current.kind,
      });
    current = current.parentId ? lookup(current.parentId) : undefined;
  }
  const evidence =
    typeof event.data.evidenceId === "string"
      ? lookup(event.data.evidenceId)
      : undefined;
  const title = String(
    event.data.title ?? evidence?.title ?? entity?.title ?? event.entityId,
  );
  const native = event.type.startsWith("native.");
  const actions: Record<string, string> = {
    SessionStart: "started a session",
    UserPromptSubmit: "received a user request",
    PreToolUse: "started a tool",
    PostToolUse: "finished a tool",
    PreCompact: "prepared conversation context",
    PostCompact: "restored conversation context",
    Stop: "finished an agent turn",
    PostModelSwitch: "changed the active model",
  };
  return {
    ...event,
    context,
    title: native
      ? `${event.entityId === "bob" ? "IBM Bob" : event.entityId === "claude" ? "Claude Code" : "Codex"} ${actions[event.type.slice(7)] ?? "reported session activity"}${event.data.tool ? `: ${event.data.tool}` : event.data.model ? `: ${event.data.model}` : ""}`
      : `${verbs[event.type] ?? event.type.replaceAll(".", " ")}: ${title}`,
  };
}
export function historyPage(
  ledger: Ledger,
  limit = 40,
  before?: number,
  entityId?: string,
): HistoryPage {
  if (entityId) ledger.get(entityId);
  const cache = new Map<string, Entity | undefined>();
  const lookup = (id: string) => {
    if (!cache.has(id)) {
      try {
        cache.set(id, ledger.get(id));
      } catch {
        cache.set(id, undefined);
      }
    }
    return cache.get(id);
  };
  const rows = ledger.events(limit + 1, before, entityId);
  return {
    events: rows.slice(0, limit).map((e) => describeActivity(e, lookup)),
    nextBefore: rows.length > limit ? rows[limit - 1].sequence : null,
  };
}
