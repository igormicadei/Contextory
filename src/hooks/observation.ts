import { createHash, randomUUID } from "node:crypto";
import type { Provider } from "../contracts/model";
import type { HookObservation, TokenUsage } from "../contracts/usage";

const text = (value: unknown, max = 200) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : undefined;
const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;

// Deliberately omit prompts, transcript paths, tool inputs/results and errors.
export function normalizeHook(
  raw: Record<string, unknown>,
  provider: Provider,
): HookObservation {
  const event = text(raw.hook_event_name, 100) ?? "unknown";
  const nativeSession = text(raw.session_id) ?? "unknown";
  const modelRequest = provider === "codex" && event === "PostModelRequest";
  let usage: TokenUsage | undefined;
  if (modelRequest && raw.token_usage && typeof raw.token_usage === "object") {
    const tokens = raw.token_usage as Record<string, unknown>;
    const parsed: TokenUsage = {
      inputTokens: count(tokens.input_tokens),
      outputTokens: count(tokens.output_tokens),
      cachedInputTokens: count(tokens.cached_input_tokens),
      reasoningTokens: count(tokens.reasoning_output_tokens),
      totalTokens: count(tokens.total_tokens),
    };
    if (Object.values(parsed).some((value) => value !== undefined))
      usage = parsed;
  }
  const observation: HookObservation = {
    id: "",
    event,
    nativeSession,
    cwd: text(raw.cwd, 4000) ?? "",
    tool: text(raw.tool_name),
    model: text(event === "PostModelSwitch" ? raw.to_model : raw.model),
    turnId: text(raw.turn_id),
    agentId: text(raw.agent_id),
    status:
      modelRequest &&
      ["completed", "failed", "cancelled"].includes(String(raw.status))
        ? (raw.status as HookObservation["status"])
        : undefined,
    usage,
  };
  // Identical usage can belong to separate attempts. Hashing the full payload
  // would silently undercount them when a client supplies no request ID.
  observation.id = modelRequest
    ? text(raw.request_id)
      ? createHash("sha256")
          .update(
            JSON.stringify([
              provider,
              nativeSession,
              raw.turn_id,
              raw.request_id,
            ]),
          )
          .digest("hex")
      : randomUUID()
    : randomUUID();
  return observation;
}
