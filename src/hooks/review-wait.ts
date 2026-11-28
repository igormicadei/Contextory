import type { ApprovalGate } from "./approval";
import type { ReviewMessage } from "../core/conversations";

export interface ReviewBrief {
  specs?: unknown[];
  approvalGate?: ApprovalGate;
  uiLanguage?: string;
  reviewMessages?: ReviewMessage[];
}
// A bounded native hook can resume immediately after a decision. Expiry never
// permits the operation: the caller still emits the blocking gate result.
export async function waitForReview(
  initial: ReviewBrief,
  observe: () => Promise<ReviewBrief>,
  pause: () => Promise<void> = () =>
    new Promise((resolve) => setTimeout(resolve, 1000)),
  attempts = 240,
) {
  let brief = initial;
  const deadline = Date.now() + 240000;
  for (
    let n = 0;
    n < attempts &&
    brief.approvalGate?.blocked &&
    !brief.reviewMessages?.length;
    n++
  ) {
    await pause();
    if (Date.now() >= deadline) break;
    brief = await observe();
    if (!brief.approvalGate)
      throw new Error("Approval gate unavailable while waiting.");
  }
  return brief;
}
