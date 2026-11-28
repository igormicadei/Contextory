import { rpc } from "../service/rpc";
import { normalizeHook } from "./observation";
import type { Provider } from "../contracts/model";
import { clients } from "../providers/clients";
import { completionNote, retrievalReminder } from "../agents/instructions";
import { contentLanguageInstruction, normalizeLanguage } from "../i18n";
import { reviewInstruction } from "../core/conversations";
import { waitForReview, type ReviewBrief } from "./review-wait";
import { approvalOutput, approvalSafeTool } from "./approval";
const provider = process.argv[3] as Provider;
let event = "unknown";
let tool: string | undefined;
function block(reason: string) {
  process.stdout.write(approvalOutput(provider, event, reason));
  process.stderr.write(reason + "\n");
  process.exitCode = 2;
}
let input = "";
for await (const part of process.stdin) {
  input += part;
  if (input.length > 1024 * 1024) {
    process.stderr.write(
      "Contextory hook payload exceeds 1 MiB; approval status could not be checked.\n",
    );
    process.exit(2);
  }
}
try {
  const raw = JSON.parse(input) as Record<string, unknown>;
  const observation = normalizeHook(raw, provider);
  event = observation.event;
  tool = observation.tool;
  const observe = () =>
    rpc<ReviewBrief>(process.argv[2], "hook", observation, 3000);
  let brief = await observe();
  if ((event === "Stop" || event === "PreToolUse") && !brief.approvalGate)
    throw new Error(
      "Approval gate contract unavailable; reload the service/runtime together.",
    );
  if (brief.approvalGate?.blocked) {
    const configured = Number(process.env.CONTEXTORY_REVIEW_WAIT_MS ?? 240000);
    const attempts = Number.isFinite(configured)
      ? Math.max(0, Math.min(240, Math.floor(configured / 1000)))
      : 240;
    brief = await waitForReview(brief, observe, undefined, attempts);
  }
  const messages = brief.reviewMessages ?? [];
  const replies = reviewInstruction(messages);
  if (
    brief.approvalGate?.blocked ||
    (messages.length &&
      (event === "Stop" ||
        (event === "PreToolUse" &&
          messages.some((m) => m.action !== "approve") &&
          !approvalSafeTool(tool))))
  ) {
    block(
      replies +
        "\n" +
        brief.approvalGate!.reason +
        "\n" +
        contentLanguageInstruction(normalizeLanguage(brief.uiLanguage)),
    );
  } else if (
    (messages.length > 0 ||
      [
        "SessionStart",
        "UserPromptSubmit",
        "PostCompact",
        "PreToolUse",
      ].includes(event)) &&
    (messages.length > 0 || !observation.tool?.includes("contextory_"))
  ) {
    const context = `${replies}\nContextory companion: ${contentLanguageInstruction(normalizeLanguage(brief.uiLanguage))} ${retrievalReminder} ${completionNote}\nCurrent tracked specs: ${JSON.stringify(
      (brief.specs ?? []).map((s: unknown) => {
        const spec = s as { id: string; title: string; state: string };
        return { id: spec.id, title: spec.title, state: spec.state };
      }),
    ).slice(
      0,
      4000,
    )}\nUse contextory_context_get for current contracts and configured checks.${observation.nativeSession !== "unknown" ? ` When attaching this session, use nativeSessionId=${JSON.stringify(observation.nativeSession)} so native model/usage observations can be correlated with leased specs.` : ""} This reminder grants no permissions.`;
    if (clients[provider].contextFormat === "plain")
      process.stdout.write(context + "\n");
    else
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: event,
            additionalContext: context,
          },
        }) + "\n",
      );
  }
  if (messages.length) {
    await rpc(
      process.argv[2],
      "hook",
      { ...observation, reviewAck: messages.map((m) => m.id) },
      3000,
    ).catch(() => {});
  }
} catch {
  if (
    event === "Stop" ||
    (event === "PreToolUse" && !approvalSafeTool(tool)) ||
    event === "unknown"
  )
    block(
      "Contextory approval status unavailable. Wait and restore the project service before implementation or completion; read-only recovery tools remain available. No approval was granted.",
    );
  else
    process.stderr.write(
      "Contextory observation unavailable. Restore the project service to check approval status before implementation.\n",
    );
}
