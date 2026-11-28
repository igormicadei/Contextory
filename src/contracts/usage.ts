import { z } from "zod";

const counter = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
  .optional();
export const tokenUsage = z.object({
  inputTokens: counter,
  outputTokens: counter,
  cachedInputTokens: counter,
  reasoningTokens: counter,
  totalTokens: counter,
});
export type TokenUsage = z.infer<typeof tokenUsage>;
export const hookObservation = z.object({
  id: z.string().min(1).max(200),
  event: z.string().min(1).max(100),
  nativeSession: z.string().min(1).max(200),
  cwd: z.string().max(4000),
  tool: z.string().max(200).optional(),
  model: z.string().min(1).max(200).optional(),
  turnId: z.string().max(200).optional(),
  agentId: z.string().max(200).optional(),
  status: z.enum(["completed", "failed", "cancelled"]).optional(),
  usage: tokenUsage.optional(),
  reviewAck: z.array(z.string().min(1).max(200)).max(50).optional(),
});
export type HookObservation = z.infer<typeof hookObservation>;
export interface UsageGroup {
  provider: string;
  model: string | null;
  attempts: number;
  measuredAttempts: number;
  tokens: { [K in keyof TokenUsage]: number | null };
  firstSeen: string;
  lastSeen: string;
}
export interface UsageRecord {
  id: string;
  provider: string;
  nativeSession: string;
  event: string;
  model: string | null;
  turnId: string | null;
  agentId: string | null;
  status: string | null;
  specId: string | null;
  time: string;
  tokens: TokenUsage | null;
}
export interface UsageSummary {
  origin: "native-hook";
  availability: "unavailable" | "partial" | "observed";
  attempts: number;
  measuredAttempts: number;
  unassignedAttempts: number;
  groups: UsageGroup[];
  groupsTruncated: boolean;
  records: UsageRecord[];
  totalRecords: number;
  nextOffset: number | null;
  note: string;
}
