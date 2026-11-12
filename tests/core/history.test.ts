import { test } from "node:test";
import assert from "node:assert/strict";
import { application, claimed, agent } from "../helpers";
import type { HistoryPage } from "../../src/contracts/model";
import { renderReport } from "../../src/core/report";

test("history reads every event beyond the dashboard cap and filters descendants with hierarchy links", async (t) => {
  const { call, ledger, app } = await application(t);
  const { request, spec } = await claimed(call);
  for (let i = 0; i < 125; i++)
    ledger.audit("spec.revise", spec.id, agent, {
      title: `Retry implementation ${i}`,
    });
  const other = ledger.create("request", "Unrelated work", {
    description: "Must be isolated",
  });
  ledger.audit("request.created", other.id, agent);
  assert.equal(app.dashboard().events.length, 3);
  const events: HistoryPage["events"] = [];
  let before: number | null | undefined;
  do {
    const page = (await call("relay_history_get", {
      entityId: request.id,
      before: before ?? undefined,
      limit: 40,
    })) as HistoryPage;
    events.push(...page.events);
    before = page.nextBefore;
  } while (before);
  assert.equal(events.filter((e) => e.type === "spec.revise").length, 125);
  assert.equal(events.length, new Set(events.map((e) => e.sequence)).size);
  assert.ok(events.every((e) => e.context?.some((c) => c.id === request.id)));
  assert.ok(events[0].title?.includes("Retry implementation 124"));
  assert.ok(!events.some((e) => e.entityId === other.id));
  assert.match(
    renderReport(ledger, "report", request.id),
    /Acceptance criteria/,
  );
  assert.match(renderReport(ledger, "report", request.id), /Works correctly/);
  assert.ok(
    !renderReport(ledger, "report", request.id).includes("Unrelated work"),
  );
  assert.throws(() => renderReport(ledger, "report", spec.id), {
    code: "WRONG_KIND",
  });
});
