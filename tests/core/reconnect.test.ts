import { test } from "node:test";
import assert from "node:assert/strict";
import { setImmediate as nextTurn } from "node:timers/promises";
import { ReconnectLoop } from "../../src/service/reconnect";

test("connection recovery backs off, recovers without user action and stops after disposal", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const waits: number[] = [];
  let calls = 0;
  const loop = new ReconnectLoop(
    async () => {
      if (++calls < 3) throw new Error("still unavailable");
    },
    (_error, next) => waits.push(next - Date.now()),
  );
  loop.request();
  loop.request();
  assert.deepEqual(waits, [1000]);
  for (const delay of [1000, 2000, 4000]) {
    t.mock.timers.tick(delay);
    await nextTurn();
  }
  assert.equal(calls, 3);
  assert.deepEqual(waits, [1000, 2000, 4000]);
  t.mock.timers.tick(60_000);
  await nextTurn();
  assert.equal(calls, 3, "success stops retries");
  loop.request();
  assert.equal(waits.at(-1), 1000, "a later outage starts with a short retry");
  loop.dispose();
  t.mock.timers.tick(60_000);
  await nextTurn();
  assert.equal(calls, 3);
  loop.request();
  assert.equal(waits.length, 4);
});

test("recovery shares an in-flight attempt and bounds the retry interval", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  let release!: () => void;
  let calls = 0;
  const waits: number[] = [];
  const loop = new ReconnectLoop(
    async () => {
      calls++;
      if (calls === 1)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      throw new Error("offline");
    },
    (_error, next) => waits.push(next - Date.now()),
  );
  loop.request();
  t.mock.timers.tick(1000);
  await nextTurn();
  loop.request();
  t.mock.timers.tick(10_000);
  await nextTurn();
  assert.equal(calls, 1);
  release();
  await nextTurn();
  for (let i = 0; i < 8; i++) {
    t.mock.timers.tick(30_000);
    await nextTurn();
  }
  assert.equal(Math.max(...waits), 30_000);
  loop.dispose();
});
