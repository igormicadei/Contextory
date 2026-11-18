import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { setImmediate as nextTurn } from "node:timers/promises";
import {
  WorkspaceReadiness,
  backgroundReadinessMs,
  foregroundReadinessMs,
} from "../../src/mcp/readiness";

async function advance(t: TestContext, milliseconds: number) {
  for (let elapsed = 0; elapsed < milliseconds; elapsed += 100) {
    t.mock.timers.tick(Math.min(100, milliseconds - elapsed));
    await nextTurn();
  }
}

test("background readiness survives a foreground timeout and recovers without another request", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  let available = false,
    observed = false,
    foregroundFailed = false,
    probes = 0;
  const readiness = new WorkspaceReadiness(async () => {
    probes++;
    if (!available) throw new Error("Service starting");
  }, new AbortController().signal);
  const observation = readiness.observe().then(() => {
    observed = true;
  });
  const foreground = readiness.wait().catch(() => {
    foregroundFailed = true;
  });
  await nextTurn();
  await advance(t, foregroundReadinessMs);
  await foreground;
  assert.equal(foregroundFailed, true);
  assert.equal(observed, false);
  available = true;
  await advance(t, 1000);
  await observation;
  assert.equal(observed, true);
  const completedProbes = probes;
  await advance(t, 3000);
  assert.equal(probes, completedProbes, "success stops background polling");
  // A later call must validate the current service, even after prior success.
  available = false;
  const later = readiness.wait();
  const rejected = assert.rejects(later, /Service starting/);
  await nextTurn();
  await advance(t, foregroundReadinessMs);
  await rejected;
});

test("background readiness stops after five minutes and a later retry starts a new window", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  let probes = 0;
  const readiness = new WorkspaceReadiness(async () => {
    probes++;
    throw new Error("Unavailable");
  }, new AbortController().signal);
  const first = readiness.observe();
  assert.equal(
    readiness.observe(),
    first,
    "concurrent observers share a window",
  );
  const rejected = assert.rejects(first, /Unavailable/);
  await nextTurn();
  await advance(t, backgroundReadinessMs - 100);
  const beforeDeadline = probes;
  await advance(t, 100);
  await rejected;
  const stoppedProbes = probes;
  assert.ok(stoppedProbes > beforeDeadline);
  await advance(t, foregroundReadinessMs);
  assert.equal(
    probes,
    stoppedProbes,
    "no polling beyond the five-minute window",
  );
  const retried = assert.rejects(readiness.wait(), /Unavailable/);
  await nextTurn();
  await advance(t, foregroundReadinessMs);
  await retried;
  assert.ok(probes > stoppedProbes);
});

test("native shutdown cancels the background wait and incompatible contracts stop immediately", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  const shutdown = new AbortController();
  let probes = 0;
  const readiness = new WorkspaceReadiness(async () => {
    probes++;
    throw new Error("Starting");
  }, shutdown.signal);
  const rejected = assert.rejects(readiness.observe(), { name: "AbortError" });
  await nextTurn();
  shutdown.abort();
  await rejected;
  await advance(t, foregroundReadinessMs);
  assert.equal(probes, 1);
  const incompatible = new WorkspaceReadiness(async () => {
    probes++;
    throw Object.assign(new Error("Reload required"), {
      code: "SERVICE_RESTART_REQUIRED",
    });
  }, new AbortController().signal);
  await assert.rejects(incompatible.observe(), {
    code: "SERVICE_RESTART_REQUIRED",
  });
  assert.equal(probes, 2);
});
