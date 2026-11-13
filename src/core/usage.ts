import type { SQLInputValue } from "node:sqlite";
import {
  ContextoryError,
  type Entity,
  type Provider,
} from "../contracts/model";
import type {
  HookObservation,
  TokenUsage,
  UsageGroup,
  UsageSummary,
} from "../contracts/usage";
import type { Ledger } from "../storage/ledger";

const tokenFields = [
  "inputTokens",
  "outputTokens",
  "cachedInputTokens",
  "reasoningTokens",
  "totalTokens",
] as const;
export const usageNote =
  "Observed native metadata only; missing counts are unavailable, not zero. Cached input is a subset of input; reasoning is a subset of output. Counts cover observed Codex request attempts, including retries, not billing, subscription quota or an exhaustive task cost. Only an exact native-session match with one active spec lease is attributed; ambiguous, expired, completed and parent-only subagent work remains unassigned. No transcripts are read.";

export function recordUsage(
  ledger: Ledger,
  provider: Provider,
  event: HookObservation,
  time: string,
) {
  const previous = ledger.db
    .prepare(
      "SELECT model FROM agent_usage WHERE provider=? AND native_session=? AND agent_id IS ? ORDER BY rowid DESC LIMIT 1",
    )
    .get(provider, event.nativeSession, event.agentId ?? null);
  const attempt = provider === "codex" && event.event === "PostModelRequest";
  if (!attempt && previous && (!event.model || event.model === previous.model))
    return;
  const candidates =
    event.nativeSession === "unknown" || event.agentId
      ? []
      : ledger.db
          .prepare(
            `
    SELECT spec.id FROM entities spec JOIN entities session ON session.id=json_extract(spec.data,'$.lease.sessionId')
    WHERE spec.kind='spec' AND json_extract(spec.data,'$.lease.expiresAt')>?
      AND json_extract(session.data,'$.provider')=? AND json_extract(session.data,'$.nativeSessionId')=?
  `,
          )
          .all(Date.now(), provider, event.nativeSession);
  const specId = candidates.length === 1 ? String(candidates[0].id) : null;
  insert(ledger, {
    id: `${provider}:${event.id}`,
    provider,
    nativeSession: event.nativeSession,
    event: event.event,
    model: event.model,
    turnId: event.turnId,
    agentId: event.agentId,
    status: event.status,
    specId,
    time,
    usage: attempt ? event.usage : undefined,
  });
}

// Preserve the model observed before a claim, even when a client has no usage
// hook. This carries no token counts and never guesses a native session ID.
export function linkSessionModel(
  ledger: Ledger,
  spec: Entity,
  session: Entity,
) {
  const provider = session.data.provider as Provider;
  const nativeSession = session.data.nativeSessionId;
  if (
    !nativeSession ||
    nativeSession === "unknown" ||
    !["codex", "claude", "bob"].includes(provider)
  )
    return;
  const previous = ledger.db
    .prepare(
      "SELECT model FROM agent_usage WHERE provider=? AND native_session=? AND model IS NOT NULL AND agent_id IS NULL ORDER BY rowid DESC LIMIT 1",
    )
    .get(provider, String(nativeSession));
  if (!previous) return;
  insert(ledger, {
    id: `claim:${spec.id}:${spec.data.generation}`,
    provider,
    nativeSession: String(nativeSession),
    event: "SpecClaim",
    model: previous?.model ? String(previous.model) : undefined,
    specId: spec.id,
    time: new Date().toISOString(),
  });
}

function insert(
  ledger: Ledger,
  a: {
    id: string;
    provider: Provider;
    nativeSession: string;
    event: string;
    model?: string;
    turnId?: string;
    agentId?: string;
    status?: string;
    specId: string | null;
    time: string;
    usage?: TokenUsage;
  },
) {
  ledger.db
    .prepare("INSERT OR IGNORE INTO agent_usage VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(
      a.id,
      a.provider,
      a.nativeSession,
      a.event,
      a.model ?? null,
      a.turnId ?? null,
      a.agentId ?? null,
      a.status ?? null,
      a.specId,
      a.time,
      a.usage ? JSON.stringify(a.usage) : null,
    );
}

export function usageSummary(
  ledger: Ledger,
  options: {
    entityId?: string;
    provider?: Provider;
    nativeSessionId?: string;
    offset?: number;
    limit?: number;
  } = {},
): UsageSummary {
  const filters: string[] = [];
  const args: SQLInputValue[] = [];
  if (options.entityId) {
    const entity = ledger.get(options.entityId);
    if (!["request", "milestone", "spec"].includes(entity.kind))
      throw new ContextoryError(
        "WRONG_KIND",
        "Choose a request, milestone or spec for usage records.",
      );
    filters.push(
      "spec_id IN (WITH RECURSIVE scope(id) AS (SELECT id FROM entities WHERE id=? UNION ALL SELECT e.id FROM entities e JOIN scope s ON e.parent_id=s.id) SELECT id FROM scope)",
    );
    args.push(options.entityId);
  }
  if (options.provider) {
    filters.push("provider=?");
    args.push(options.provider);
  }
  if (options.nativeSessionId) {
    filters.push("native_session=?");
    args.push(options.nativeSessionId);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const aggregate = `COUNT(*) AS observations,
    SUM(CASE WHEN provider='codex' AND event='PostModelRequest' THEN 1 ELSE 0 END) AS attempts,
    SUM(CASE WHEN provider='codex' AND event='PostModelRequest' AND tokens IS NOT NULL THEN 1 ELSE 0 END) AS measured,
    SUM(CASE WHEN provider='codex' AND event='PostModelRequest' AND json_extract(tokens,'$.inputTokens') IS NOT NULL AND json_extract(tokens,'$.outputTokens') IS NOT NULL THEN 1 ELSE 0 END) AS complete,
    SUM(CASE WHEN provider='codex' AND event='PostModelRequest' AND spec_id IS NULL THEN 1 ELSE 0 END) AS unassigned`;
  const total = ledger.db
    .prepare(`SELECT ${aggregate} FROM agent_usage ${where}`)
    .get(...args)!;
  const groups = ledger.db
    .prepare(
      `SELECT provider,model,${aggregate},
    ${tokenFields.map((key) => `SUM(json_extract(tokens,'$.${key}')) AS ${key}`).join(",")},
    MIN(time) AS first_seen, MAX(time) AS last_seen
    FROM agent_usage ${where} GROUP BY provider,model ORDER BY provider,model LIMIT 101`,
    )
    .all(...args);
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;
  const records = ledger.db
    .prepare(
      `SELECT * FROM agent_usage ${where} ORDER BY time DESC,rowid DESC LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset);
  const attempts = Number(total.attempts ?? 0);
  const measuredAttempts = Number(total.measured ?? 0);
  const totalRecords = Number(total.observations);
  return {
    origin: "native-hook",
    availability:
      measuredAttempts === 0
        ? "unavailable"
        : Number(total.complete) < attempts
          ? "partial"
          : "observed",
    attempts,
    measuredAttempts,
    unassignedAttempts: Number(total.unassigned ?? 0),
    groups: groups.slice(0, 100).map(
      (row): UsageGroup => ({
        provider: String(row.provider),
        model: row.model === null ? null : String(row.model),
        attempts: Number(row.attempts),
        measuredAttempts: Number(row.measured),
        tokens: Object.fromEntries(
          tokenFields.map((key) => [
            key,
            row[key] === null ? null : Number(row[key]),
          ]),
        ),
        firstSeen: String(row.first_seen),
        lastSeen: String(row.last_seen),
      }),
    ),
    groupsTruncated: groups.length > 100,
    records: records.map((row) => ({
      id: String(row.id),
      provider: String(row.provider),
      nativeSession: String(row.native_session),
      event: String(row.event),
      model: row.model === null ? null : String(row.model),
      turnId: row.turn_id === null ? null : String(row.turn_id),
      agentId: row.agent_id === null ? null : String(row.agent_id),
      status: row.status === null ? null : String(row.status),
      specId: row.spec_id === null ? null : String(row.spec_id),
      time: String(row.time),
      tokens: row.tokens === null ? null : JSON.parse(String(row.tokens)),
    })),
    totalRecords,
    nextOffset:
      offset + records.length < totalRecords && limit > 0
        ? offset + records.length
        : null,
    note: usageNote,
  };
}

export function usageReport(summary: UsageSummary): string[] {
  const cell = (value: unknown) =>
    String(value ?? "Unavailable")
      .replaceAll("|", "\\|")
      .replace(/[\r\n]/g, " ");
  return [
    "**Agent models and observed usage**",
    "",
    `Observed model request attempts: ${summary.attempts}; attempts with token counts: ${summary.measuredAttempts}.`,
    "",
    ...(summary.groups.length
      ? [
          "| Agent | Model | Attempts | Input | Output | Cached input (subset) | Reasoning (subset) | Total |",
          "| --- | --- | --- | --- | --- | --- | --- | --- |",
          ...summary.groups.map(
            (group) =>
              `| ${[
                group.provider,
                group.model,
                group.attempts,
                ...tokenFields.map((key) => group.tokens[key]),
              ]
                .map(cell)
                .join(" | ")} |`,
          ),
          "",
        ]
      : [
          "No native model or usage records have been linked to this work.",
          "",
        ]),
    ...(summary.groupsTruncated
      ? [
          "Only the first 100 model groups are shown; filter with contextory_usage_get.",
          "",
        ]
      : []),
    summary.note,
    "",
  ];
}
