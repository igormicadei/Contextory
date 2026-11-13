import { test } from "node:test";
import assert from "node:assert/strict";
import {
  latestNativeAgent,
  startupProvider,
} from "../../src/providers/startup";
import type { Connection, Provider } from "../../src/contracts/model";

const at = Date.parse("2026-11-13T12:00:00Z");
const connections: Connection[] = [
  { provider: "codex", configured: true, mcpSeen: "2026-11-13T11:00:00Z" },
  { provider: "claude", configured: true, hookSeen: "2026-11-13T12:00:00Z" },
  { provider: "bob", configured: false, mcpSeen: "2026-11-13T13:00:00Z" },
];
const base = {
  preference: "last-used" as const,
  connections,
  disabled: [] as Provider[],
};

test("startup recovers actual last native use, ignores disconnected agents and respects a later manual choice", () => {
  assert.deepEqual(latestNativeAgent(connections), { provider: "claude", at });
  assert.equal(startupProvider(base), "claude");
  assert.equal(
    startupProvider({ ...base, workspace: { provider: "codex", at: at - 1 } }),
    "claude",
  );
  assert.equal(
    startupProvider({ ...base, workspace: { provider: "codex", at: at + 1 } }),
    "codex",
  );
});

test("a fresh workspace uses the last global agent; local history takes precedence and first use selects none", () => {
  const global = { provider: "bob" as const, at: at + 1000 };
  assert.equal(startupProvider({ ...base, connections: [], global }), "bob");
  assert.equal(startupProvider({ ...base, global }), "claude");
  assert.equal(startupProvider({ ...base, connections: [] }), undefined);
  assert.equal(
    latestNativeAgent([
      { provider: "codex", configured: true, mcpSeen: "invalid" },
    ]),
    undefined,
  );
});

test("explicit startup preference overrides history and none preserves manual control", () => {
  for (const preference of ["codex", "claude", "bob"] as const)
    assert.equal(startupProvider({ ...base, preference }), preference);
  assert.equal(startupProvider({ ...base, preference: "none" }), undefined);
});

test("an explicit workspace disconnect is never undone by remembered or configured startup preferences", () => {
  const disabled: Provider[] = ["claude"];
  assert.equal(startupProvider({ ...base, disabled }), undefined);
  assert.equal(
    startupProvider({ ...base, disabled, preference: "claude" }),
    undefined,
  );
  assert.equal(
    startupProvider({ ...base, disabled, preference: "bob" }),
    "bob",
  );
  assert.equal(
    startupProvider({ ...base, disabled: [], preference: "claude" }),
    "claude",
  );
});
