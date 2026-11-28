import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { startService } from "../../src/service/server";
import { rpc } from "../../src/service/rpc";
import type { Entity } from "../../src/contracts/model";
import { application, claimed, fixture, human, operationId } from "../helpers";
import { reviewMessages } from "../../src/core/conversations";
import { conversationRecovery } from "../../src/providers/conversations";
import { waitForReview } from "../../src/hooks/review-wait";
import { approvalGate } from "../../src/hooks/approval";

const content = {
  category: "feature",
  title: "Greeting",
  description: "Return the configured greeting.",
  sources: [{ path: "main.ts" }],
  tests: [],
  testGap: "Fixture has no separate behavior test.",
};
const explanation = {
  change: "Change the greeting from 42 to 43.",
  approvalReason: "The returned result is an established contract.",
  behavior: "Callers receive 43 instead of 42.",
};

test("automatic snapshot bookkeeping does not invalidate an otherwise unchanged proposal target", async (t) => {
  const f = await application(t),
    w = await claimed(f.call);
  const lease = { specId: w.spec.id, leaseId: w.leaseId };
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "create",
    content,
    reason: "Baseline",
  })) as Entity;
  const proposal = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "revise",
    id: entry.id,
    expectedRevision: 1,
    content,
    explanation,
    reason: "Review",
  })) as Entity;
  await writeFile(join(f.root, "main.ts"), "export const value = 43;\n");
  const page = (await f.call("contextory_catalog_get", {})) as {
    proposals: (Entity & { reviewBlocker?: string })[];
  };
  assert.equal(f.ledger.get(entry.id).revision, 2);
  assert.equal(page.proposals[0].reviewBlocker, undefined);
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: proposal.id,
      expectedRevision: 2,
      action: "approve",
      reason: "",
    },
    human,
  );
  assert.equal(f.ledger.get(entry.id).state, "approved");
});

test("readable review snapshots refresh automatically without approval, comments or lost history", async (t) => {
  const f = await application(t),
    w = await claimed(f.call);
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    specId: w.spec.id,
    leaseId: w.leaseId,
    action: "create",
    content,
    reason: "Record source behavior",
  })) as Entity;
  await writeFile(join(f.root, "main.ts"), "export const value = 43;\n");
  const page = (await f.call("contextory_catalog_get", {
    pendingOnly: true,
  })) as { records: (Entity & { freshness: { state: string } })[] };
  const refreshed = page.records[0];
  assert.equal(refreshed.revision, 2);
  assert.equal(refreshed.state, "observed");
  assert.equal(refreshed.freshness.state, "current");
  assert.deepEqual(refreshed.data.content, entry.data.content);
  assert.deepEqual(
    f.ledger.get(entry.id, 1).data.fingerprints,
    entry.data.fingerprints,
  );
  assert.equal(refreshed.data.review, undefined);
  await f.call("contextory_catalog_get", {});
  assert.equal(f.ledger.get(entry.id).revision, 2);
  const approved = (await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: entry.id,
      expectedRevision: 2,
      action: "approve",
    },
    human,
  )) as Entity;
  assert.equal(approved.state, "approved");
});

test("automatic refresh preserves race, missing-source and native-review protections", async (t) => {
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
  await writeFile(join(f.root, "main.ts"), "export const value = 99;\n");
  await assert.rejects(
    f.call(
      "contextory_catalog_review",
      {
        operationId: operationId(),
        id: entry.id,
        expectedRevision: 1,
        action: "approve",
      },
      human,
    ),
    { code: "STALE_CATALOG" },
  );
  assert.equal(f.ledger.get(entry.id).revision, 2);
  await unlink(join(f.root, "main.ts"));
  await assert.rejects(
    f.call(
      "contextory_catalog_review",
      {
        operationId: operationId(),
        id: entry.id,
        expectedRevision: 2,
        action: "approve",
      },
      human,
    ),
    { code: "STALE_CATALOG" },
  );
  await assert.rejects(
    f.call("contextory_catalog_review", {
      operationId: operationId(),
      id: entry.id,
      expectedRevision: 2,
      action: "approve",
    }),
    { code: "FORBIDDEN" },
  );
});

test("feedback gates implementation, permits audited proposal updates and routes only to its exact conversation", async (t) => {
  const f = await application(t),
    w = await claimed(f.call);
  const lease = { specId: w.spec.id, leaseId: w.leaseId };
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "create",
    content,
    reason: "Baseline",
  })) as Entity;
  const proposal = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "revise",
    id: entry.id,
    expectedRevision: 1,
    content: { ...content, description: "Return 43." },
    explanation,
    impact: "outcome",
    reason: "Changes output",
  })) as Entity;
  assert.equal(
    (proposal.data.origin as { nativeSessionId: string }).nativeSessionId,
    "native-session",
  );
  await assert.rejects(
    f.call(
      "contextory_catalog_review",
      {
        operationId: operationId(),
        id: proposal.id,
        expectedRevision: 1,
        action: "feedback",
      },
      human,
    ),
    { code: "INVALID_ARGUMENT" },
  );
  const response = {
    operationId: operationId(),
    id: proposal.id,
    expectedRevision: 1,
    action: "feedback",
    reason: "Keep 42 as the default; make 43 opt-in.",
  };
  const feedback = (await f.call(
    "contextory_catalog_review",
    response,
    human,
  )) as Entity;
  assert.deepEqual(
    await f.call("contextory_catalog_review", response, human),
    feedback,
  );
  assert.equal(feedback.state, "changes_requested");
  assert.deepEqual(f.ledger.get(proposal.id, 1).data.explanation, explanation);
  assert.equal(f.app.catalog.pending().length, 1);
  assert.equal(
    approvalGate(f.app.catalog.pending(), "PreToolUse", "Edit").blocked,
    true,
  );
  assert.equal(reviewMessages(f.ledger, "codex", "other-session").length, 0);
  assert.equal(reviewMessages(f.ledger, "claude", "native-session").length, 0);
  const raw = {
    id: operationId(),
    nativeSession: "native-session",
    cwd: f.root,
    event: "PreToolUse",
    tool: "Read",
  };
  const hook = await f.app.hook("codex", raw);
  assert.equal(hook.reviewMessages[0].instruction, response.reason);
  await f.app.hook("codex", {
    ...raw,
    nativeSession: "other-session",
    reviewAck: [response.operationId],
  });
  assert.equal(reviewMessages(f.ledger, "codex", "native-session").length, 1);
  await f.app.hook("codex", { ...raw, reviewAck: [response.operationId] });
  assert.equal(reviewMessages(f.ledger, "codex", "native-session").length, 0);
  const revised = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    ...lease,
    action: "revise",
    id: proposal.id,
    expectedRevision: 2,
    content,
    explanation: {
      ...explanation,
      behavior: "42 remains the default; 43 is opt-in.",
    },
    reason: "Address user feedback",
    autoApprove: true,
    impact: "implementation",
    compatibility: "preserved",
  })) as Entity;
  assert.equal(revised.state, "pending");
  assert.equal(f.ledger.get(entry.id).revision, 1);
  const result = (await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: proposal.id,
      expectedRevision: 3,
      action: "reject",
    },
    human,
  )) as { proposal: Entity };
  assert.equal(result.proposal.state, "rejected");
  assert.equal(f.app.catalog.pending().length, 0);
  assert.equal(
    reviewMessages(f.ledger, "codex", "native-session")[0].action,
    "reject",
  );
});

test("waiting hooks wake for responses and expiration never permits a blocked operation", async () => {
  const blocked = {
    approvalGate: { blocked: true, pending: 1, items: [], reason: "Wait" },
  };
  let polls = 0;
  const resumed = await waitForReview(
    blocked,
    async () => {
      polls++;
      return {
        approvalGate: { ...blocked.approvalGate, blocked: false, pending: 0 },
      };
    },
    async () => {},
    3,
  );
  assert.equal(polls, 1);
  assert.equal(resumed.approvalGate?.blocked, false);
  const expired = await waitForReview(
    blocked,
    async () => blocked,
    async () => {},
    2,
  );
  assert.equal(expired.approvalGate?.blocked, true);
});

test("conversation recovery is exact, project-bound and never interpolates shell instructions", () => {
  const origin = {
    projectId: "p",
    provider: "codex" as const,
    sessionId: "s",
    specId: "spec",
    nativeSessionId: "019a-1234",
  };
  assert.deepEqual(conversationRecovery(origin, "p"), {
    kind: "terminal",
    command: "codex resume 019a-1234",
    sessionId: "019a-1234",
  });
  assert.equal(conversationRecovery(origin, "other").kind, "unavailable");
  assert.equal(
    conversationRecovery({ ...origin, nativeSessionId: "x; echo unsafe" }, "p")
      .kind,
    "unavailable",
  );
  assert.equal(
    conversationRecovery({ ...origin, provider: "claude" }, "p").kind,
    "command",
  );
  assert.equal(
    conversationRecovery({ ...origin, provider: "bob" }, "p").kind,
    "manual",
  );
});

for (const action of ["approve", "reject", "feedback"] as const)
  test(`a live waiting native hook receives ${action} on the originating conversation`, async (t) => {
    const f = await fixture(t),
      service = await startService(f);
    f.cleanups.push(() => service.close());
    const call = (name: string, args: object) =>
      service.app.call(name, args, {
        id: "codex",
        provider: "codex",
        human: false,
      });
    const w = await claimed(call),
      lease = { specId: w.spec.id, leaseId: w.leaseId };
    const entry = (await call("contextory_catalog_change", {
      operationId: operationId(),
      ...lease,
      action: "create",
      content,
      reason: "Baseline",
    })) as Entity;
    const proposal = (await call("contextory_catalog_change", {
      operationId: operationId(),
      ...lease,
      action: "revise",
      id: entry.id,
      expectedRevision: 1,
      content,
      explanation,
      reason: "Review",
    })) as Entity;
    await assert.rejects(
      rpc(join(f.storage, "codex.json"), "conversation.get", {
        id: proposal.id,
      }),
      { code: "FORBIDDEN" },
    );
    const recovery = await rpc<{
      origin: { nativeSessionId: string };
      projectId: string;
    }>(join(f.storage, "ui.json"), "conversation.get", { id: proposal.id });
    assert.equal(recovery.origin.nativeSessionId, "native-session");
    assert.equal(recovery.projectId, service.app.ledger.projectId);
    const child = spawn(
      process.execPath,
      [
        resolve("dist/contextory-hook.mjs"),
        join(f.storage, "codex-hook.json"),
        "codex",
      ],
      {
        windowsHide: true,
        env: { ...process.env, CONTEXTORY_REVIEW_WAIT_MS: "5000" },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    t.after(() => {
      if (child.exitCode === null) child.kill();
    });
    let out = "",
      err = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    const completion = new Promise<number | null>((resolveResult, reject) => {
      child.once("error", reject);
      child.once("close", resolveResult);
    });
    child.stdin.end(
      JSON.stringify({
        hook_event_name: "PreToolUse",
        session_id: "native-session",
        cwd: f.root,
        tool_name: "Edit",
      }),
    );
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
    assert.equal(child.exitCode, null);
    assert.equal(out, "");
    await service.app.call(
      "contextory_catalog_review",
      {
        operationId: operationId(),
        id: proposal.id,
        expectedRevision: 1,
        action,
        reason: action === "feedback" ? "Keep the existing behavior." : "",
      },
      human,
    );
    const code = await completion;
    assert.equal(code, action === "approve" ? 0 : 2, err);
    assert.match(out, new RegExp(`Contextory human response.*${action}`));
    assert.equal(
      reviewMessages(service.app.ledger, "codex", "native-session").length,
      0,
    );
    assert.equal(
      service.app.catalog.pending().length,
      action === "feedback" ? 1 : 0,
    );
  });
