import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { application, claimed, human, operationId, waitJob } from "../helpers";
import type { Entity } from "../../src/contracts/model";
import { renderReport } from "../../src/core/report";

const content = {
  category: "feature",
  title: "Greeting",
  description: "Returns the configured greeting.",
  sources: [{ path: "main.ts", symbol: "hello" }],
  tests: [],
  testGap: "No behavioral test exists yet.",
};

test("legacy explicit snapshot refresh remains human-only and needs no comment", async (t) => {
  const f = await application(t),
    w = await claimed(f.call);
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    specId: w.spec.id,
    leaseId: w.leaseId,
    action: "create",
    content,
    reason: "Baseline",
  })) as Entity;
  const input = {
    operationId: operationId(),
    id: entry.id,
    expectedRevision: 1,
    action: "refresh",
  };
  await assert.rejects(f.call("contextory_catalog_review", input), {
    code: "FORBIDDEN",
  });
  const refreshed = (await f.call(
    "contextory_catalog_review",
    input,
    human,
  )) as Entity;
  assert.equal(refreshed.state, "observed");
  assert.deepEqual(refreshed.data.content, entry.data.content);
  assert.deepEqual(
    await f.call("contextory_catalog_review", input, human),
    refreshed,
  );
});

test("refresh cannot silently accept missing files or rebase a competing proposal", async (t) => {
  const f = await application(t),
    work = await claimed(f.call);
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    specId: work.spec.id,
    leaseId: work.leaseId,
    action: "create",
    content,
    reason: "Observed baseline",
  })) as Entity;
  const proposal = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    specId: work.spec.id,
    leaseId: work.leaseId,
    action: "revise",
    id: entry.id,
    expectedRevision: 1,
    content: { ...content, description: "Updated greeting" },
    reason: "Proposed update",
  })) as Entity;
  await writeFile(
    join(f.root, "main.ts"),
    "export function hello(){return 45;}\n",
  );
  const refresh = {
    operationId: operationId(),
    id: proposal.id,
    expectedRevision: 1,
    action: "refresh",
    reason: "Checked implementation",
  };
  const refreshed = (await f.call(
    "contextory_catalog_review",
    refresh,
    human,
  )) as Entity;
  assert.equal(refreshed.state, "pending");
  assert.deepEqual(refreshed.data.before, proposal.data.before);
  assert.deepEqual(refreshed.data.content, proposal.data.content);
  assert.equal(f.ledger.get(entry.id).revision, 1);
  await unlink(join(f.root, "main.ts"));
  await assert.rejects(
    f.call(
      "contextory_catalog_review",
      { ...refresh, operationId: operationId(), id: entry.id },
      human,
    ),
  );
  assert.equal(f.ledger.get(entry.id).revision, 1);
  await writeFile(
    join(f.root, "main.ts"),
    "export function hello(){return 45;}\n",
  );
  await f.call(
    "contextory_catalog_review",
    { ...refresh, operationId: operationId(), id: entry.id },
    human,
  );
  const page = (await f.call("contextory_catalog_get", {})) as {
    proposals: { reviewBlocker?: string }[];
  };
  assert.match(page.proposals[0].reviewBlocker!, /definition changed/);
  await assert.rejects(
    f.call(
      "contextory_catalog_review",
      { ...refresh, operationId: operationId(), expectedRevision: 2 },
      human,
    ),
    { code: "REVISION_CONFLICT" },
  );
  const rejected = (await f.call(
    "contextory_catalog_review",
    {
      ...refresh,
      operationId: operationId(),
      expectedRevision: 2,
      action: "reject",
    },
    human,
  )) as { proposal: Entity };
  assert.equal(rejected.proposal.state, "rejected");
});

test("pending baselines and proposal targets sort ahead of reviewed entries before filtering/pagination", async (t) => {
  const f = await application(t),
    work = await claimed(f.call);
  const create = (title: string) =>
    f.call("contextory_catalog_change", {
      operationId: operationId(),
      specId: work.spec.id,
      leaseId: work.leaseId,
      action: "create",
      content: { ...content, title },
      reason: "Baseline",
    }) as Promise<Entity>;
  const reviewed: Entity[] = [];
  for (let i = 0; i < 5; i++) {
    const entry = await create(`Shared greeting ${i}`);
    reviewed.push(
      (await f.call(
        "contextory_catalog_review",
        {
          operationId: operationId(),
          id: entry.id,
          expectedRevision: 1,
          action: i === 4 ? "reject" : "approve",
          reason: "Checked",
        },
        human,
      )) as Entity,
    );
  }
  const pending = await create("Shared latest observation");
  const proposal = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    specId: work.spec.id,
    leaseId: work.leaseId,
    action: "revise",
    id: reviewed[2].id,
    expectedRevision: reviewed[2].revision,
    content,
    reason: "Pending replacement",
  })) as Entity;
  type Page = {
    records: Entity[];
    proposals: Entity[];
    nextOffset: number | null;
  };
  const first = (await f.call("contextory_catalog_get", {
    query: "Shared",
    limit: 2,
  })) as Page;
  assert.deepEqual(
    new Set(first.records.map((r) => r.id)),
    new Set([pending.id, reviewed[2].id]),
  );
  assert.equal(first.proposals[0].id, proposal.id);
  const approvals = (await f.call("contextory_catalog_get", {
    pendingOnly: true,
    limit: 2,
  })) as Page;
  assert.deepEqual(
    approvals.records.map((r) => r.id),
    [pending.id],
  );
  assert.equal(approvals.proposals[0].id, proposal.id);
  assert.equal(approvals.nextOffset, null);
  const emptyFiltered = (await f.call("contextory_catalog_get", {
    pendingOnly: true,
    query: "Shared greeting 0",
  })) as Page;
  assert.equal(emptyFiltered.records.length, 0);
  assert.equal(emptyFiltered.proposals.length, 0);
  const second = (await f.call("contextory_catalog_get", {
    query: "Shared",
    limit: 2,
    offset: 2,
  })) as Page;
  assert.ok(second.records.every((r) => r.state === "approved"));
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: pending.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Verified",
    },
    human,
  );
  const after = (await f.call("contextory_catalog_get", {
    category: "feature",
    limit: 10,
  })) as Page;
  assert.equal(after.records[0].id, reviewed[2].id);
  assert.equal(after.records.at(-1)!.state, "retired");
});

test("outcomes require catalog accounting and completion detects definition revisions after submission", async (t) => {
  const f = await application(t),
    work = await claimed(f.call),
    lease = { specId: work.spec.id, leaseId: work.leaseId };
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "create",
    content,
    reason: "Baseline",
  })) as Entity;
  f.app.checks.recipes = [
    {
      id: "fixture",
      name: "Passing fixture check",
      executable: process.execPath,
      args: ["-e", "process.exit(0)"],
    },
  ];
  const job = (await f.call("contextory_check_run", {
    operationId: operationId(),
    ...lease,
    recipeId: "fixture",
    criteria: ["AC-1"],
  })) as { jobId: string };
  const finished = await waitJob(f.call, job.jobId);
  const outcome = {
    operationId: operationId(),
    ...lease,
    expectedRevision: work.spec.revision,
    summary: "Documented",
    issuesSummary: "None",
    decisionsSummary: "None",
    limitations: "Observed baseline",
    report: "Reviewed source-backed catalog",
    changelog: "Recorded greeting",
    criteria: [
      { criterionId: "AC-1", evidenceIds: [finished.data.evidenceId] },
    ],
  };
  await assert.rejects(f.call("contextory_outcome_submit", outcome), {
    code: "CATALOG_REVIEW_REQUIRED",
  });
  const submitted = (await f.call("contextory_outcome_submit", {
    ...outcome,
    operationId: operationId(),
    catalog: {
      recordIds: [entry.id],
      explanation: "Observed greeting and recorded the test gap",
    },
  })) as Entity;
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: entry.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Verified",
    },
    human,
  );
  await assert.rejects(
    f.call("contextory_spec_change", {
      operationId: operationId(),
      action: "complete",
      id: work.spec.id,
      expectedRevision: submitted.revision,
    }),
    { code: "STALE_OUTCOME" },
  );
});

test("catalog protects approved definitions, preserves exact revisions and exports semantic history", async (t) => {
  const f = await application(t),
    work = await claimed(f.call);
  const lease = { specId: work.spec.id, leaseId: work.leaseId };
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "create",
    content,
    reason: "Reconstruct current behavior",
  })) as Entity;
  assert.equal(entry.state, "observed");
  assert.equal(
    f.app.knowledge.impact(entry.id, "forward", 1, 10).subject.description,
    content.description,
  );
  await assert.rejects(
    f.call("contextory_catalog_review", {
      operationId: operationId(),
      id: entry.id,
      expectedRevision: 1,
      action: "approve",
      reason: "I approve",
    }),
    { code: "FORBIDDEN" },
  );
  const approved = (await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: entry.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Confirmed behavior",
    },
    human,
  )) as Entity;
  assert.equal(approved.state, "approved");
  const proposal = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "revise",
    id: entry.id,
    expectedRevision: approved.revision,
    content: { ...content, description: "Returns a localized greeting." },
    reason: "Support localization",
  })) as Entity;
  assert.equal(
    f.ledger.get(entry.id).data.content &&
      (f.ledger.get(entry.id).data.content as typeof content).description,
    content.description,
  );
  await assert.rejects(
    f.app.catalog.verify(work.spec.id, {
      recordIds: [entry.id],
      explanation: "Updated",
    }),
    { code: "CATALOG_APPROVAL_PENDING" },
  );
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: proposal.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Accept localization",
    },
    human,
  );
  assert.equal(f.ledger.get(entry.id).revision, 3);
  assert.deepEqual(f.ledger.get(entry.id, 1).data.content, content);
  assert.equal(f.ledger.get(proposal.id).state, "approved");
  assert.equal(
    (f.ledger.get(proposal.id).data.review as { actor: string }).actor,
    "ui",
  );
  const changelog = renderReport(f.ledger, "changelog", work.request.id);
  assert.ok(changelog.includes("Support localization"));
  assert.ok(changelog.includes("catalog.revised"));
  const report = renderReport(f.ledger, "report", work.request.id);
  assert.ok(report.includes("Returns a localized greeting."));
  assert.ok(report.includes("Returns the configured greeting."));
  await assert.rejects(
    f.call("contextory_catalog_change", {
      operationId: operationId(),
      ...lease,
      action: "revise",
      id: entry.id,
      expectedRevision: 2,
      content,
      reason: "Old proposal",
    }),
    { code: "REVISION_CONFLICT" },
  );
});

test("catalog exposes test/source freshness and requires refreshed approval or traceable retirement", async (t) => {
  const f = await application(t),
    work = await claimed(f.call);
  const lease = { specId: work.spec.id, leaseId: work.leaseId };
  await writeFile(join(f.root, "main.test.ts"), "// test fixture\n");
  const linked = {
    ...content,
    tests: [{ path: "main.test.ts", symbol: "greeting" }],
  };
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "create",
    content: linked,
    reason: "Record test mapping",
  })) as Entity;
  await writeFile(join(f.root, "main.test.ts"), "// changed test fixture\n");
  await assert.rejects(
    f.call(
      "contextory_catalog_review",
      {
        operationId: operationId(),
        id: entry.id,
        expectedRevision: 1,
        action: "approve",
        reason: "Stale",
      },
      human,
    ),
    { code: "STALE_CATALOG" },
  );
  const proposal = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "revise",
    id: entry.id,
    expectedRevision: 2,
    content: linked,
    reason: "Refresh source/test references",
  })) as Entity;
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: proposal.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Reviewed current test",
    },
    human,
  );
  await f.app.catalog.verify(work.spec.id, {
    recordIds: [entry.id],
    explanation: "Current references",
  });
  await writeFile(join(f.root, "main.ts"), "export const changed = true;\n");
  await assert.rejects(
    f.app.catalog.verify(work.spec.id, {
      recordIds: [],
      explanation: "No change",
    }),
    { code: "STALE_CATALOG" },
  );
  const page = (await f.call("contextory_catalog_get", {
    path: "main.test.ts",
  })) as { records: { freshness: { state: string } }[] };
  assert.equal(page.records[0].freshness.state, "stale");
  await unlink(join(f.root, "main.ts"));
  const retired = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "retire",
    id: entry.id,
    expectedRevision: 3,
    reason: "Greeting removed intentionally",
  })) as Entity;
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: retired.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Approve removal",
    },
    human,
  );
  assert.equal(f.ledger.get(entry.id).state, "retired");
  assert.equal(f.ledger.get(entry.id, 3).state, "approved");
});

test("catalog proposals handle competing revisions and rejected changes without losing the baseline", async (t) => {
  const f = await application(t),
    work = await claimed(f.call),
    lease = { specId: work.spec.id, leaseId: work.leaseId };
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "create",
    content,
    reason: "Baseline",
  })) as Entity;
  const make = () =>
    f.call("contextory_catalog_change", {
      operationId: operationId(),
      ...lease,
      action: "revise",
      id: entry.id,
      expectedRevision: 1,
      content,
      reason: "Competing correction",
    }) as Promise<Entity>;
  const a = await make(),
    b = await make();
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: a.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Accept A",
    },
    human,
  );
  await assert.rejects(
    f.call(
      "contextory_catalog_review",
      {
        operationId: operationId(),
        id: b.id,
        expectedRevision: 1,
        action: "approve",
        reason: "Accept B",
      },
      human,
    ),
    { code: "REVISION_CONFLICT" },
  );
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: b.id,
      expectedRevision: 1,
      action: "reject",
      reason: "Superseded by A",
    },
    human,
  );
  assert.equal(f.ledger.get(entry.id).revision, 2);
  assert.equal(f.ledger.get(b.id).state, "rejected");
});

test("catalog requires honest test gaps, structured UI interactions and authorized source references", async (t) => {
  const f = await application(t),
    work = await claimed(f.call),
    lease = { specId: work.spec.id, leaseId: work.leaseId };
  const create = (c: object) =>
    f.call("contextory_catalog_change", {
      operationId: operationId(),
      ...lease,
      action: "create",
      content: c,
      reason: "Baseline",
    });
  await assert.rejects(create({ ...content, testGap: undefined }), {
    code: "INVALID_ARGUMENT",
  });
  await assert.rejects(create({ ...content, category: "ui" }), {
    code: "INVALID_ARGUMENT",
  });
  await assert.rejects(
    create({ ...content, sources: [{ path: "../outside.ts" }] }),
    { code: "INVALID_PATH" },
  );
  await assert.rejects(
    create({ ...content, tests: [{ path: "missing.test.ts" }] }),
  );
  const ui = (await create({
    ...content,
    category: "ui",
    ui: {
      location: "Sidebar footer",
      element: "Refresh button",
      trigger: "Click or keyboard activate",
      behavior: "Refresh the current workspace",
      states: "Disabled while loading; errors shown as status",
    },
  })) as Entity;
  assert.equal(ui.state, "observed");
  await assert.rejects(f.app.catalog.verify(work.spec.id), {
    code: "CATALOG_REVIEW_REQUIRED",
  });
  await assert.rejects(
    f.call("contextory_catalog_change", {
      operationId: operationId(),
      specId: work.spec.id,
      leaseId: "wrong",
      action: "create",
      content,
      reason: "Invalid owner",
    }),
    { code: "STALE_LEASE" },
  );
});

test("migration batches resume durably, retry idempotently and expose missing and new file coverage", async (t) => {
  const f = await application(t),
    work = await claimed(f.call),
    lease = { specId: work.spec.id, leaseId: work.leaseId };
  await writeFile(join(f.root, "second.ts"), "export const other = 1;\n");
  const input = { operationId: operationId(), ...lease, limit: 1 };
  const first = (await f.call("contextory_catalog_migrate", input)) as {
    migration: Entity;
    next: { migrationId: string };
    createdIds: string[];
    scanned: number;
  };
  assert.equal(first.scanned, 1);
  assert.equal(first.migration.state, "running");
  assert.deepEqual(await f.call("contextory_catalog_migrate", input), first);
  await unlink(join(f.root, "second.ts"));
  const second = (await f.call("contextory_catalog_migrate", {
    operationId: operationId(),
    ...lease,
    migrationId: first.migration.id,
    limit: 1,
  })) as { migration: Entity; next: null };
  assert.equal(second.next, null);
  assert.equal(second.migration.state, "scanned");
  assert.equal((second.migration.data.gaps as unknown[]).length, 1);
  assert.equal(f.ledger.get(first.migration.id, 2).state, "running");
  assert.equal(f.ledger.all("knowledge").length, 1);
  assert.equal(f.ledger.all("knowledge")[0].state, "observed");
  await writeFile(join(f.root, "new.ts"), "export const added = 2;\n");
  const page = (await f.call("contextory_catalog_get", {
    inventory: true,
    limit: 1,
    offset: 1,
  })) as {
    inventory: {
      nextOffset: number | null;
      total: number;
      files: { path: string; described: boolean }[];
    };
  };
  assert.equal(page.inventory.total, 2);
  assert.deepEqual(page.inventory.files, [
    { path: "new.ts", described: false },
  ]);
  await f.call("contextory_catalog_migrate", {
    operationId: operationId(),
    ...lease,
    limit: 50,
  });
  assert.equal(f.ledger.all("knowledge").length, 2);
});

test("documentation export pages all datasets and artifacts without exposing service credentials", async (t) => {
  const f = await application(t),
    work = await claimed(f.call),
    lease = { specId: work.spec.id, leaseId: work.leaseId };
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "create",
    content,
    reason: "Document the baseline",
  })) as Entity;
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: entry.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Reviewed",
    },
    human,
  );
  await f.app.codebase.fresh();
  await mkdir(join(f.storage, "artifacts"), { recursive: true });
  await writeFile(join(f.storage, "artifacts", "check.log"), "x".repeat(1000));
  await writeFile(
    join(f.storage, "generic.json"),
    '{"token":"never-export-this"}',
  );
  const overview = (await f.call("contextory_project_export", {})) as {
    datasets: { section: string; count: number }[];
  };
  assert.ok(
    overview.datasets.find((d) => d.section === "revisions")!.count > 1,
  );
  for (const { section, count } of overview.datasets) {
    let offset: number | null = 0,
      seen = 0;
    do {
      const page = (await f.call("contextory_project_export", {
        section,
        limit: 1,
        offset,
      })) as { items: unknown[]; nextOffset: number | null };
      assert.ok(!JSON.stringify(page).includes("never-export-this"));
      seen += page.items.length;
      offset = page.nextOffset;
    } while (offset !== null);
    assert.equal(seen, count, section);
  }
  const revisions = (await f.call("contextory_project_export", {
    section: "revisions",
    entityId: entry.id,
  })) as { items: { record: Entity }[] };
  assert.deepEqual(
    revisions.items.map((i) => i.record.state),
    ["observed", "approved"],
  );
  const artifact = (await f.call("contextory_project_export", {
    section: "artifacts",
    artifact: "check.log",
    offset: 1,
    limit: 1,
  })) as { content: string; nextOffset: number };
  assert.equal(artifact.content.length, 400);
  assert.equal(artifact.nextOffset, 2);
  await assert.rejects(
    f.call("contextory_project_export", {
      section: "artifacts",
      artifact: "../generic.json",
    }),
    { code: "INVALID_PATH" },
  );
  await assert.rejects(
    f.call("contextory_project_export", {
      section: "records",
      codebaseId: "reference",
    }),
    { code: "INVALID_ARGUMENT" },
  );
});
