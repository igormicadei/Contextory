import type { Conversation } from "../core/conversations";

export function conversationRecovery(origin: Conversation, projectId: string) {
  const id = origin.nativeSessionId;
  if (
    origin.projectId !== projectId ||
    !id ||
    id === "unknown" ||
    !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(id)
  )
    return { kind: "unavailable" as const };
  if (origin.provider === "claude")
    return {
      kind: "command" as const,
      command: "claude-vscode.primaryEditor.open",
      sessionId: id,
    };
  if (origin.provider === "codex")
    return {
      kind: "terminal" as const,
      command: `codex resume ${id}`,
      sessionId: id,
    };
  return { kind: "manual" as const, sessionId: id };
}
