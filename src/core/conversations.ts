import type { Entity, Provider } from "../contracts/model";
import type { Ledger } from "../storage/ledger";

export interface Conversation {
  projectId: string;
  provider: Provider;
  specId: string;
  sessionId: string;
  nativeSessionId?: string;
}
export interface ReviewMessage {
  id: string;
  recordId: string;
  action: "approve" | "reject" | "feedback";
  instruction: string;
  origin: Conversation;
}
export function conversation(
  ledger: Ledger,
  spec: Entity,
): Conversation | undefined {
  const lease = spec.data.lease as { sessionId: string } | undefined;
  if (!lease) return spec.data.conversation as Conversation | undefined;
  const session = ledger.get(lease.sessionId);
  return {
    projectId: ledger.projectId,
    specId: spec.id,
    sessionId: session.id,
    provider: session.data.provider as Provider,
    nativeSessionId:
      session.data.nativeSessionId === "unknown"
        ? undefined
        : (session.data.nativeSessionId as string | undefined),
  };
}
// Replies are durable audit events. Hook acknowledgements never rewrite the
// reviewed definition or imply the model acted on the instruction.
export function reviewMessages(
  ledger: Ledger,
  provider: Provider,
  nativeSession: string,
): ReviewMessage[] {
  if (!nativeSession || nativeSession === "unknown") return [];
  return ledger.db
    .prepare(
      `SELECT data FROM audit WHERE type='catalog.response'
    AND json_extract(data,'$.origin.projectId')=?
    AND json_extract(data,'$.origin.provider')=?
    AND json_extract(data,'$.origin.nativeSessionId')=?
    AND NOT EXISTS (SELECT 1 FROM meta WHERE key='review-delivered:' || json_extract(audit.data,'$.id'))
    ORDER BY sequence LIMIT 20`,
    )
    .all(ledger.projectId, provider, nativeSession)
    .map((row) => JSON.parse(String(row.data)) as ReviewMessage)
    .filter((message) => !ledger.meta(`review-delivered:${message.id}`))
    .slice(0, 20);
}
export function reviewDelivery(ledger: Ledger, recordId: string) {
  const row = ledger.db
    .prepare(
      "SELECT data FROM audit WHERE type='catalog.response' AND entity_id=? ORDER BY sequence DESC LIMIT 1",
    )
    .get(recordId);
  if (!row) return undefined;
  const response = JSON.parse(String(row.data)) as ReviewMessage;
  return {
    state: !response.origin?.nativeSessionId
      ? "unbound"
      : ledger.meta(`review-delivered:${response.id}`)
        ? "offered"
        : "queued",
  };
}
export function acknowledgeReviews(
  ledger: Ledger,
  provider: Provider,
  nativeSession: string,
  ids: string[] = [],
) {
  const pending = reviewMessages(ledger, provider, nativeSession);
  for (const message of pending.filter((message) => ids.includes(message.id))) {
    ledger.db
      .prepare("INSERT OR IGNORE INTO meta VALUES (?,?)")
      .run(`review-delivered:${message.id}`, new Date().toISOString());
  }
  if (pending.some((message) => ids.includes(message.id))) ledger.onChange();
}
export function reviewInstruction(messages: ReviewMessage[]) {
  return messages
    .map(
      (m) =>
        `Contextory human response ${m.id} for ${m.recordId}: ${m.action}. ${m.instruction}\n${
          m.action === "approve"
            ? "The reviewed change was approved. Re-read the current catalog and continue within the approved scope."
            : m.action === "reject"
              ? "Do not implement the rejected proposal. Preserve established behavior and adjust the plan."
              : "Revise this proposal and its natural-language explanation using contextory_catalog_change with its ID and current revision. Keep implementation waiting for a new decision."
        }`,
    )
    .join("\n");
}
