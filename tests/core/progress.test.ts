import { test } from "node:test";
import assert from "node:assert/strict";
import { specProgress } from "../../src/webview/progress";
import type { Entity } from "../../src/contracts/model";

test("a newer failed or stale run removes older passing progress for the same recipe", () => {
  const base = {
    title: "Check",
    revision: 1,
    createdAt: "2026-11-23T09:00:00Z",
    updatedAt: "2026-11-23T09:00:00Z",
  };
  const spec: Entity = {
    ...base,
    id: "SPEC",
    kind: "spec",
    state: "implementing",
    data: {
      contract: "v1",
      generation: 1,
      criteria: [{ id: "AC-1", text: "Works" }],
    },
  };
  const pass: Entity = {
    ...base,
    id: "pass",
    parentId: "SPEC",
    kind: "evidence",
    state: "passed",
    data: {
      origin: "contextory-runner",
      recipeId: "regression",
      contract: "v1",
      generation: 1,
      criteria: ["AC-1"],
    },
  };
  for (const state of ["failed", "stale", "interrupted"]) {
    const later: Entity = {
      ...pass,
      id: state,
      state,
      createdAt: "2026-11-23T10:00:00Z",
    };
    assert.equal(specProgress(spec, [pass, later]).covered, 0);
    const recovered = {
      ...pass,
      id: "recovered",
      createdAt: "2026-11-23T11:00:00Z",
    };
    assert.equal(specProgress(spec, [pass, later, recovered]).covered, 1);
  }
});

test("work progress separates independent, reported, stale and missing criterion evidence", () => {
  const base = {
    title: "Work",
    revision: 1,
    createdAt: "2026-11-23T09:00:00Z",
    updatedAt: "2026-11-23T10:00:00Z",
  };
  const spec = {
    ...base,
    id: "SPEC",
    kind: "spec",
    state: "implementing",
    data: {
      contract: "v2",
      generation: 2,
      criteria: ["A", "B", "C", "D"].map((id) => ({ id, text: id })),
    },
  } as Entity;
  const evidence = (
    id: string,
    criteria: string[],
    data: object = {},
    state = "passed",
  ) =>
    ({
      ...base,
      id,
      kind: "evidence",
      parentId: "SPEC",
      state,
      updatedAt: "2026-11-23T10:00:00Z",
      data: {
        contract: "v2",
        generation: 2,
        origin: "contextory-runner",
        criteria,
        ...data,
      },
    }) as Entity;
  const records = [
    evidence("current", ["A"]),
    evidence("reported", ["B"], { origin: "agent-reported" }),
    evidence("old-attempt", ["C"], { generation: 1 }),
    evidence("old-contract", ["C"], { contract: "v1" }),
    evidence("failed", ["D"], {}, "failed"),
  ];
  const progress = specProgress(spec, records, [
    { id: "job", specId: "SPEC", state: "running", name: "Real check" },
  ]);
  assert.deepEqual(
    progress.criteria.map((c) => c.status),
    ["check", "reported", "pending", "pending"],
  );
  assert.equal(progress.covered, 1);
  assert.equal(progress.phase, "Running checks");
  assert.equal(progress.running[0].name, "Real check");
  assert.equal(
    specProgress(spec, [
      ...records,
      {
        ...base,
        id: "issue",
        kind: "finding",
        parentId: "SPEC",
        state: "open",
        data: { blocking: true },
        updatedAt: "2026-11-23T11:00:00Z",
      } as Entity,
    ]).phase,
    "Blocked",
  );
});
