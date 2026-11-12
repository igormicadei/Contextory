import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { application, claimed, operationId, waitJob, human } from "../helpers";
import type { Entity } from "../../src/contracts/model";
import { renderReport } from "../../src/core/report";

test("idempotency, revisions, lease exclusivity and native actor ownership", async (t) => {
  const { call, ledger } = await application(t);
  const { spec, session, leaseId } = await claimed(call);
  const args = {
    operationId: operationId(),
    action: "create",
    title: "Same request",
    description: "Intent",
  };
  assert.deepEqual(
    await call("contextory_request_change", args),
    await call("contextory_request_change", args),
  );
  await assert.rejects(
    call("contextory_request_change", { ...args, title: "Changed" }),
    { code: "OPERATION_CONFLICT" },
  );
  await assert.rejects(
    call("contextory_spec_change", {
      operationId: operationId(),
      action: "revise",
      id: spec.id,
      expectedRevision: 1,
      reason: "Changed",
    }),
    { code: "REVISION_CONFLICT" },
  );
  const other = { id: "claude", provider: "claude" as const, human: false };
  await assert.rejects(
    call(
      "contextory_spec_lease",
      {
        operationId: operationId(),
        action: "renew",
        specId: spec.id,
        sessionId: session.id,
        leaseId,
      },
      other,
    ),
    { code: "WRONG_OWNER" },
  );
  const s = (await call(
    "contextory_session_attach",
    { operationId: operationId() },
    other,
  )) as Entity;
  await assert.rejects(
    call(
      "contextory_spec_lease",
      {
        operationId: operationId(),
        action: "claim",
        specId: spec.id,
        sessionId: s.id,
        expectedRevision: spec.revision,
      },
      other,
    ),
    { code: "LEASE_CONFLICT" },
  );
  const expired = ledger.get(spec.id);
  (expired.data.lease as { expiresAt: number }).expiresAt = 1;
  ledger.update(expired, expired.revision, { data: expired.data });
  await assert.rejects(
    call("contextory_decision_record", {
      operationId: operationId(),
      specId: spec.id,
      leaseId,
      title: "Choice",
      choice: "Use a queue",
      rationale: "Bound concurrency",
      consequences: "Serialized writes",
    }),
    { code: "STALE_LEASE" },
  );
});

test("dependencies reject cycles and stay aligned with relationship traversal", async (t) => {
  const { call, ledger } = await application(t);
  const { milestone, spec } = await claimed(call);
  const second = (await call("contextory_spec_change", {
    operationId: operationId(),
    action: "create",
    parentId: milestone.id,
    title: "Dependent",
    criteria: ["Works"],
    dependencies: [spec.id],
  })) as Entity;
  await assert.rejects(
    call(
      "contextory_spec_change",
      {
        operationId: operationId(),
        action: "revise",
        id: spec.id,
        expectedRevision: spec.revision,
        reason: "Cycle",
        dependencies: [second.id],
      },
      human,
    ),
    { code: "DEPENDENCY_CYCLE" },
  );
  assert.equal(ledger.get(spec.id).revision, spec.revision);
  assert.equal(ledger.get(spec.id, 1).state, "ready");
  assert.equal(ledger.get(spec.id, 1).data.generation, 0);
  await call("contextory_spec_change", {
    operationId: operationId(),
    action: "revise",
    id: second.id,
    expectedRevision: second.revision,
    reason: "Independent now",
    dependencies: [],
  });
  assert.equal(
    ledger.db
      .prepare(
        "SELECT count(*) AS n FROM edges WHERE source=? AND kind='depends_on'",
      )
      .get(second.id)!.n,
    0,
  );
});

test("completion needs independent current evidence, resolved findings and a durable outcome", async (t) => {
  const { call, app, ledger, root } = await application(t);
  const { request, spec, leaseId } = await claimed(call);
  app.checks.recipes = [
    {
      id: "unit",
      name: "Unit checks",
      executable: process.execPath,
      args: ["-e", 'console.log("all checks passed")'],
    },
  ];
  const issue = (await call("contextory_finding_record", {
    operationId: operationId(),
    specId: spec.id,
    leaseId,
    title: "Incorrect branch",
    observation: "False branch returned null",
    impact: "Missing result",
    status: "open",
  })) as Entity;
  await call("contextory_decision_record", {
    operationId: operationId(),
    specId: spec.id,
    leaseId,
    title: "Return a value",
    choice: "Handle both branches",
    rationale: "The contract requires a value",
    consequences: "All inputs have a result",
  });
  const reported = (await call("contextory_evidence_record", {
    operationId: operationId(),
    specId: spec.id,
    leaseId,
    title: "Agent test",
    detail: "Reported pass",
    criteria: ["AC-1"],
    result: "passed",
  })) as Entity;
  const submit = async (evidenceIds: string[]) =>
    call("contextory_outcome_submit", {
      operationId: operationId(),
      specId: spec.id,
      leaseId,
      expectedRevision: ledger.get(spec.id).revision,
      summary: "Both branches produce results",
      issuesSummary: "Fixed incorrect branch",
      decisionsSummary: "Explicit results",
      limitations: "Static fixture",
      report: "Implementation checked",
      changelog: "Handle both branches",
      criteria: [
        {
          criterionId: "AC-1",
          evidenceIds,
          explanation: "Verified branch behavior",
        },
      ],
    });
  const complete = () =>
    call("contextory_spec_change", {
      operationId: operationId(),
      action: "complete",
      id: spec.id,
      expectedRevision: ledger.get(spec.id).revision,
    });
  await submit([reported.id]);
  await assert.rejects(complete(), { code: "OPEN_FINDINGS" });
  await call("contextory_finding_record", {
    operationId: operationId(),
    specId: spec.id,
    leaseId,
    id: issue.id,
    expectedRevision: issue.revision,
    title: issue.title,
    observation: "False branch returned null",
    impact: "Missing result",
    status: "resolved",
    resolution: "Return the correct result in both branches",
  });
  await assert.rejects(complete(), { code: "INELIGIBLE_EVIDENCE" });
  const job = (await call("contextory_check_run", {
    operationId: operationId(),
    specId: spec.id,
    leaseId,
    recipeId: "unit",
    criteria: ["AC-1"],
  })) as { jobId: string };
  const result = await waitJob(call, job.jobId);
  assert.equal(result.state, "passed");
  await submit([result.data.evidenceId]);
  await writeFile(
    join(root, "main.ts"),
    "export function hello() { return 43; }\n",
  );
  await assert.rejects(complete(), { code: "STALE_OUTCOME" });
  const freshJob = (await call("contextory_check_run", {
    operationId: operationId(),
    specId: spec.id,
    leaseId,
    recipeId: "unit",
    criteria: ["AC-1"],
  })) as { jobId: string };
  const fresh = await waitJob(call, freshJob.jobId);
  await submit([fresh.data.evidenceId]);
  const completed = (await complete()) as Entity;
  assert.equal(completed.state, "completed");
  const report = renderReport(ledger, "report", request.id);
  assert.match(report, /Return the correct result/);
  assert.match(report, /The contract requires a value/);
  assert.match(report, /contextory-runner/);
  assert.match(renderReport(ledger, "changelog"), /Handle both branches/);
});

test("a later failure invalidates an older pass; jobs capture failed and cancelled checks", async (t) => {
  const { call, app, ledger } = await application(t);
  const { spec, leaseId } = await claimed(call);
  const args = {
    specId: spec.id,
    leaseId,
    recipeId: "unit",
    criteria: ["AC-1"],
  };
  app.checks.recipes = [
    {
      id: "unit",
      name: "Tests",
      executable: process.execPath,
      args: ["-e", "process.exit(0)"],
    },
  ];
  const pass = (await call("contextory_check_run", {
    operationId: operationId(),
    ...args,
  })) as { jobId: string };
  const passed = await waitJob(call, pass.jobId);
  app.checks.recipes[0] = {
    ...app.checks.recipes[0],
    args: ["-e", "process.exit(1)"],
  };
  const fail = (await call("contextory_check_run", {
    operationId: operationId(),
    ...args,
  })) as { jobId: string };
  assert.equal((await waitJob(call, fail.jobId)).state, "failed");
  await call("contextory_outcome_submit", {
    operationId: operationId(),
    specId: spec.id,
    leaseId,
    expectedRevision: ledger.get(spec.id).revision,
    summary: "Result",
    issuesSummary: "None",
    decisionsSummary: "None",
    limitations: "Failure remains",
    report: "Recorded",
    changelog: "Change",
    criteria: [
      {
        criterionId: "AC-1",
        evidenceIds: [passed.data.evidenceId],
        explanation: "Old pass",
      },
    ],
  });
  await assert.rejects(
    call("contextory_spec_change", {
      operationId: operationId(),
      action: "complete",
      id: spec.id,
      expectedRevision: ledger.get(spec.id).revision,
    }),
    { code: "INELIGIBLE_EVIDENCE" },
  );
  app.checks.recipes[0] = {
    ...app.checks.recipes[0],
    args: ["-e", "setTimeout(()=>{},10000)"],
  };
  const running = (await call("contextory_check_run", {
    operationId: operationId(),
    ...args,
  })) as { jobId: string };
  await new Promise((resolve) => setTimeout(resolve, 100));
  app.checks.cancel(running.jobId);
  assert.equal((await waitJob(call, running.jobId)).state, "interrupted");
});
