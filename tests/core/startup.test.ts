import { test } from "node:test";
import assert from "node:assert/strict";
import {
  latestNativeAgent,
  startupProviders,
  detectedProviders,
} from "../../src/providers/startup";
import type { Connection, Provider } from "../../src/contracts/model";

const at = Date.parse("2026-11-13T12:00:00Z");
const connections: Connection[] = [
  { provider: "codex", configured: true, mcpSeen: "2026-11-13T11:00:00Z" },
  { provider: "claude", configured: true, hookSeen: "2026-11-13T12:00:00Z" },
  { provider: "bob", configured: false, mcpSeen: "2026-11-13T13:00:00Z" },
];
const base = {
  enabled: true,
  detected: [] as Provider[],
  preference: "last-used" as const,
  connections,
  disabled: [] as Provider[],
};

test("detect all recognized installed agents without relying on extension activation or a previous selection", () => {
  assert.deepEqual(
    detectedProviders("Visual Studio Code", [
      "OpenAI.chatgpt",
      "Anthropic.claude-code",
    ]),
    ["codex", "claude"],
  );
  assert.deepEqual(detectedProviders("IBM Bob", []), ["bob"]);
  assert.deepEqual(detectedProviders("Code", ["IBM.bob-code"]), ["bob"]);
  assert.deepEqual(
    detectedProviders("Code", ["openai.codex-audio", "example.claude-helper"]),
    [],
  );
  assert.deepEqual(
    detectedProviders("IBM Bob", [
      "openai.chatgpt",
      "anthropic.claude-code",
      "ibm.bob-code",
    ]),
    ["codex", "claude", "bob"],
  );
});

test("automatic discovery selects all detected providers, respects workspace opt-outs and pauses without switching to a remembered agent", () => {
  const options = {
    ...base,
    preference: "auto" as const,
    detected: ["codex", "claude"] as Provider[],
  };
  assert.deepEqual(startupProviders(options), ["codex", "claude"]);
  assert.deepEqual(startupProviders({ ...options, disabled: ["codex"] }), [
    "claude",
  ]);
  assert.deepEqual(startupProviders({ ...options, enabled: false }), []);
  assert.deepEqual(
    startupProviders({
      ...options,
      detected: [],
      global: { provider: "bob", at },
    }),
    [],
  );
  assert.deepEqual(
    startupProviders({ ...base, preference: "bob", enabled: false }),
    [],
  );
});

test("startup recovers actual last native use, ignores disconnected agents and respects a later manual choice", () => {
  assert.deepEqual(latestNativeAgent(connections), { provider: "claude", at });
  assert.deepEqual(startupProviders(base), ["claude"]);
  assert.deepEqual(
    startupProviders({ ...base, workspace: { provider: "codex", at: at - 1 } }),
    ["claude"],
  );
  assert.deepEqual(
    startupProviders({ ...base, workspace: { provider: "codex", at: at + 1 } }),
    ["codex"],
  );
});

test("a fresh workspace uses the last global agent; local history takes precedence and first use selects none", () => {
  const global = { provider: "bob" as const, at: at + 1000 };
  assert.deepEqual(startupProviders({ ...base, connections: [], global }), [
    "bob",
  ]);
  assert.deepEqual(startupProviders({ ...base, global }), ["claude"]);
  assert.deepEqual(startupProviders({ ...base, connections: [] }), []);
  assert.deepEqual(
    latestNativeAgent([
      { provider: "codex", configured: true, mcpSeen: "invalid" },
    ]),
    undefined,
  );
});

test("explicit startup preference overrides history and none preserves manual control", () => {
  for (const preference of ["codex", "claude", "bob"] as const)
    assert.deepEqual(startupProviders({ ...base, preference }), [preference]);
  assert.deepEqual(startupProviders({ ...base, preference: "none" }), []);
});

test("an explicit workspace disconnect is never undone by remembered or configured startup preferences", () => {
  const disabled: Provider[] = ["claude"];
  assert.deepEqual(startupProviders({ ...base, disabled }), []);
  assert.deepEqual(
    startupProviders({ ...base, disabled, preference: "claude" }),
    [],
  );
  assert.deepEqual(startupProviders({ ...base, disabled, preference: "bob" }), [
    "bob",
  ]);
  assert.deepEqual(
    startupProviders({ ...base, disabled: [], preference: "claude" }),
    ["claude"],
  );
});
