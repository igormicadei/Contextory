import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { startService } from "../../src/service/server";
import { rpc } from "../../src/service/rpc";
import { fixture } from "../helpers";
import type { Dashboard } from "../../src/contracts/model";

test("33 recipes and the documented maximum configure without dropping service; rejected changes preserve valid recipes", async (t) => {
  const f = await fixture(t);
  const service = await startService({ ...f, headless: true });
  f.cleanups.push(() => service.close());
  const descriptor = join(f.storage, "ui.json");
  const recipes = Array.from({ length: 256 }, (_, i) => ({
    id: `check-${i}`,
    name: `Check ${i}`,
    executable: process.execPath,
    args: ["--version"],
  }));
  await rpc(descriptor, "configure", { recipes: recipes.slice(0, 33) });
  assert.equal(
    (await rpc<Dashboard>(descriptor, "dashboard")).recipes.length,
    33,
  );
  await rpc(descriptor, "configure", { recipes });
  await assert.rejects(
    rpc(descriptor, "configure", {
      recipes: [...recipes, { ...recipes[0], id: "over-limit" }],
    }),
    {
      code: "INVALID_CHECKS",
      message: "Configure at most 256 check recipes (received 257).",
    },
  );
  await assert.rejects(rpc(descriptor, "configure", { recipes: {} }), {
    code: "INVALID_CHECKS",
    message: "contextory.checks must be an array of check recipes.",
  });
  await assert.rejects(
    rpc(descriptor, "configure", { recipes: [recipes[0], recipes[0]] }),
    { code: "INVALID_CHECKS" },
  );
  assert.equal(
    (await rpc<Dashboard>(descriptor, "dashboard")).recipes.length,
    256,
  );
  assert.equal(
    (await rpc<{ root: string }>(descriptor, "health")).root,
    f.root,
  );
});
