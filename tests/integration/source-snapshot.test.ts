import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { open, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { sourceSnapshot } from "../../src/verification/workspace";
import { ContextoryError, type Entity } from "../../src/contracts/model";
import {
  application,
  claimed,
  fixture,
  operationId,
  waitJob,
} from "../helpers";

test("streamed snapshots preserve the existing path/content/HEAD digest", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.root, "empty.bin"), Buffer.alloc(0));
  await writeFile(
    join(f.root, "unicode-ação.bin"),
    Buffer.from([0, 255, 1, 128]),
  );
  const expected = createHash("sha256");
  for (const name of ["empty.bin", "main.ts", "unicode-ação.bin"]) {
    expected
      .update(name)
      .update("\0")
      .update(
        createHash("sha256")
          .update(await readFile(join(f.root, name)))
          .digest(),
      );
  }
  expected.update("no-head");
  const result = await sourceSnapshot(f.root);
  assert.equal(result.hash, expected.digest("hex"));
  assert.equal(result.files, 3);
});

test("snapshots include all bytes past the former 20 MiB limit", async (t) => {
  const f = await fixture(t);
  const original = createHash("sha256");
  const file = await open(join(f.root, "large.bin"), "w");
  const chunk = Buffer.alloc(1024 * 1024, 0x5a);
  try {
    for (let index = 0; index < 25; index++) {
      await file.writeFile(chunk);
      original.update(chunk);
    }
  } finally {
    await file.close();
  }
  const expected = createHash("sha256")
    .update("large.bin")
    .update("\0")
    .update(original.digest())
    .update("main.ts")
    .update("\0")
    .update(
      createHash("sha256")
        .update(await readFile(join(f.root, "main.ts")))
        .digest(),
    )
    .update("no-head")
    .digest("hex");
  const first = await sourceSnapshot(f.root);
  assert.equal(first.hash, expected);
  assert.equal(first.files, 2);
  const changed = await open(join(f.root, "large.bin"), "r+");
  try {
    await changed.write(Buffer.from([0x41]), 0, 1, 24 * 1024 * 1024);
  } finally {
    await changed.close();
  }
  assert.notEqual((await sourceSnapshot(f.root)).hash, first.hash);
});

test("a file continuously modified during hashing cannot produce an accepted snapshot", async (t) => {
  const f = await fixture(t);
  const file = await open(join(f.root, "large.bin"), "w+");
  await file.truncate(64 * 1024 * 1024);
  let writing = true;
  let writes = 0;
  const writer = (async () => {
    while (writing) {
      await file.write(Buffer.from([writes++ % 256]), 0, 1, 0);
      await delay(1);
    }
  })();
  try {
    await assert.rejects(
      sourceSnapshot(f.root),
      (error: unknown) =>
        error instanceof ContextoryError && error.code === "STALE_SOURCE",
    );
    assert.ok(writes > 1);
  } finally {
    writing = false;
    await writer;
    await file.close();
  }
});

test("the independent runner and outcome accept a workspace containing a large source file", async (t) => {
  const f = await application(t);
  const large = await open(join(f.root, "large.csv"), "w");
  await large.truncate(21 * 1024 * 1024);
  await large.close();
  const work = await claimed(f.call);
  f.app.checks.recipes = [
    {
      id: "large-source",
      name: "Large source",
      executable: process.execPath,
      args: ["-e", "console.log('verified')"],
      timeoutMs: 5000,
    },
  ];
  const job = (await f.call("contextory_check_run", {
    specId: work.spec.id,
    leaseId: work.leaseId,
    recipeId: "large-source",
    criteria: ["AC-1"],
    operationId: operationId(),
  })) as { jobId: string };
  const result = await waitJob(f.call, job.jobId);
  assert.equal(result.state, "passed");
  const evidence = (await f.call("contextory_entity_get", {
    id: result.data.evidenceId,
  })) as { entity: Entity };
  assert.equal(evidence.entity.data.origin, "contextory-runner");
  const submitted = (await f.call("contextory_outcome_submit", {
    specId: work.spec.id,
    leaseId: work.leaseId,
    expectedRevision: work.spec.revision,
    operationId: operationId(),
    summary: "Large source is verified in full",
    issuesSummary: "No open issues",
    decisionsSummary: "Bounded streaming",
    limitations: "Synthetic source",
    report: "Full-file source snapshot and independent check passed",
    changelog: "Support large sources",
    commits: [],
    criteria: [{ criterionId: "AC-1", evidenceIds: [result.data.evidenceId] }],
  })) as Entity;
  assert.equal(submitted.state, "submitted");
  const completed = (await f.call("contextory_spec_change", {
    action: "complete",
    id: work.spec.id,
    expectedRevision: submitted.revision,
    operationId: operationId(),
  })) as Entity;
  assert.equal(completed.state, "completed");
});
