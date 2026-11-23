import type { Dashboard, Entity } from "../contracts/model";

/** A recorded-evidence summary, never an estimate of time or eligibility to complete. */
export function specProgress(
  spec: Entity,
  entities: Entity[],
  checks: Dashboard["checks"] = [],
) {
  const records = entities.filter((e) => e.parentId === spec.id);
  const evidence = records.filter(
    (e) =>
      e.kind === "evidence" &&
      e.state === "passed" &&
      e.data.contract === spec.data.contract &&
      e.data.generation === spec.data.generation &&
      !records.some(
        (newer) =>
          newer.kind === "evidence" &&
          newer.state !== "passed" &&
          newer.data.origin === "contextory-runner" &&
          newer.data.recipeId !== undefined &&
          newer.data.recipeId === e.data.recipeId &&
          newer.data.generation === e.data.generation &&
          newer.createdAt >= e.createdAt,
      ),
  );
  const criteria = (
    (spec.data.criteria ?? []) as { id: string; text: string }[]
  ).map((criterion) => ({
    ...criterion,
    status: evidence.some(
      (e) =>
        e.data.origin === "contextory-runner" &&
        (e.data.criteria as string[] | undefined)?.includes(criterion.id),
    )
      ? "check"
      : evidence.some((e) =>
            (e.data.criteria as string[] | undefined)?.includes(criterion.id),
          )
        ? "reported"
        : "pending",
  }));
  const blockers = records.filter(
    (e) =>
      e.kind === "finding" && e.state === "open" && e.data.blocking === true,
  );
  const running = checks.filter(
    (check) =>
      check.specId === spec.id && ["queued", "running"].includes(check.state),
  );
  const latest = records
    .filter((e) =>
      ["finding", "decision", "evidence", "outcome"].includes(e.kind),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const phase =
    spec.state === "completed"
      ? "Completed"
      : blockers.length || spec.state === "blocked"
        ? "Blocked"
        : running.length
          ? "Running checks"
          : spec.state === "submitted"
            ? "Awaiting completion"
            : spec.state === "implementing"
              ? "Implementation in progress"
              : "Ready to start";
  return {
    criteria,
    covered: criteria.filter((c) => c.status === "check").length,
    blockers,
    running,
    latest,
    phase,
  };
}
