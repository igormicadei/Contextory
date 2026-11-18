import { test } from "node:test";
import assert from "node:assert/strict";
import { SetupReload, type ReloadStore } from "../../src/providers/reload";

function fixture(accept = false, fail = false) {
  const values = new Map<string, unknown>();
  const store: ReloadStore = {
    get: <T>(key: string) => structuredClone(values.get(key)) as T | undefined,
    update: async (key, value) => {
      values.set(key, structuredClone(value));
    },
  };
  let prompts = 0,
    restarts = 0;
  const make = () =>
    new SetupReload(
      store,
      async () => {
        prompts++;
        return accept;
      },
      async () => {
        restarts++;
        if (fail) throw new Error("Restart unavailable");
      },
    );
  return { make, counts: () => ({ prompts, restarts }) };
}

test("setup changes batch into one persisted offer; unchanged reactivation and declining cannot loop", async () => {
  const f = fixture(),
    reload = f.make();
  await reload.offer("prompt");
  await reload.changed("codex", "v1");
  await reload.changed("claude", "v1");
  await Promise.all([reload.offer("prompt"), reload.offer("prompt")]);
  const reopened = f.make();
  await reopened.changed("codex", "v1");
  await reopened.offer("prompt");
  assert.deepEqual(f.counts(), { prompts: 1, restarts: 0 });
  await reopened.changed("codex", "v2");
  await reopened.offer("prompt");
  assert.deepEqual(f.counts(), { prompts: 2, restarts: 0 });
});

test("accepted and automatic restarts persist before reactivation; never mode leaves manual control", async () => {
  for (const mode of ["prompt", "automatic"] as const) {
    const f = fixture(true),
      reload = f.make();
    await reload.changed("codex", "v1");
    await reload.offer("never");
    assert.deepEqual(f.counts(), { prompts: 0, restarts: 0 });
    await reload.offer(mode);
    await f.make().offer(mode);
    assert.deepEqual(f.counts(), {
      prompts: mode === "prompt" ? 1 : 0,
      restarts: 1,
    });
    // Reinstalling deleted connection files merits a new offer even if the content is identical.
    await reload.changed("codex", "v1", true);
    await reload.offer(mode);
    assert.equal(f.counts().restarts, 2);
  }
});

test("failed restart cannot create an automatic reactivation loop", async () => {
  const f = fixture(true, true),
    reload = f.make();
  await reload.changed("codex", "v1");
  await assert.rejects(reload.offer("automatic"), /Restart unavailable/);
  await f.make().offer("automatic");
  assert.deepEqual(f.counts(), { prompts: 0, restarts: 1 });
});
