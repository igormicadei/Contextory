import { test } from "node:test";
import assert from "node:assert/strict";
import { replaceFile } from "../../src/storage/atomic";

test("atomic replacement recovers transient Windows locks without deleting the destination", async () => {
  const waits: number[] = [];
  let attempts = 0;
  await replaceFile(
    "new",
    "old",
    async (from, to) => {
      assert.equal(from, "new");
      assert.equal(to, "old");
      if (++attempts < 4)
        throw Object.assign(new Error("locked"), { code: "EPERM" });
    },
    async (ms) => {
      waits.push(ms);
    },
  );
  assert.equal(attempts, 4);
  assert.deepEqual(waits, [50, 100, 200]);
});

test("atomic replacement bounds persistent locks and immediately rejects other failures", async () => {
  for (const [code, expected] of [
    ["EBUSY", 6],
    ["EACCES", 6],
    ["ENOENT", 1],
  ] as const) {
    let attempts = 0;
    const failure = Object.assign(new Error(code), { code });
    await assert.rejects(
      replaceFile(
        "new",
        "old",
        async () => {
          attempts++;
          throw failure;
        },
        async () => {},
      ),
      (error) => error === failure,
    );
    assert.equal(attempts, expected);
  }
});
