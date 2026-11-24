import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { application, fixture, claimed, human, operationId } from "../helpers";
import { startService } from "../../src/service/server";
import { rpc } from "../../src/service/rpc";
import type { Entity } from "../../src/contracts/model";
import { renderReport } from "../../src/core/report";
import { approvalSafeTool } from "../../src/hooks/approval";

const content = {
  category: "feature",
  title: "Greeting",
  description: "Returns 42.",
  sources: [{ path: "main.ts", symbol: "hello" }],
  tests: [],
  testGap: "API governance fixture; behavioral checks are recorded separately.",
};

test("compatible refactors refresh approved source links without another human review and retain searchable history", async (t) => {
  const f = await application(t),
    w = await claimed(f.call);
  const create = {
    operationId: operationId(),
    specId: w.spec.id,
    leaseId: w.leaseId,
    action: "create",
    content,
    reason: "Observed source",
  };
  const e = (await f.call("contextory_catalog_change", create)) as Entity;
  assert.equal(
    (
      await f.app.hook("codex", {
        id: operationId(),
        event: "PreToolUse",
        nativeSession: "native-session",
        cwd: f.root,
        tool: "Edit",
      })
    ).approvalGate.blocked,
    false,
  );
  const approved = (await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: e.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Established result",
    },
    human,
  )) as Entity;
  assert.equal(
    (
      await import(pathToFileURL(join(f.root, "main.ts")).href + "?before")
    ).hello(),
    42,
  );
  await writeFile(
    join(f.root, "helper.ts"),
    "export const answer = () => 42;\n",
  );
  await writeFile(
    join(f.root, "main.ts"),
    "export { answer as hello } from './helper.ts';\n",
  );
  assert.equal(
    (
      await import(pathToFileURL(join(f.root, "main.ts")).href + "?after")
    ).hello(),
    42,
  );
  const args = {
    ...create,
    operationId: operationId(),
    action: "revise",
    id: e.id,
    expectedRevision: 2,
    content: {
      ...content,
      sources: [
        { path: "main.ts", symbol: "hello" },
        { path: "helper.ts", symbol: "answer" },
      ],
    },
    compatibility: "preserved",
    impact: "implementation",
    autoApprove: true,
    reason:
      "Function replacement preserves 42; source links updated; independent validation required before completion.",
  };
  const change = (await f.call("contextory_catalog_change", args)) as Entity;
  assert.equal(change.state, "auto_approved");
  assert.deepEqual(change.data.before, approved.data.content);
  assert.deepEqual(change.data.beforeFingerprints, approved.data.fingerprints);
  const current = f.ledger.get(e.id);
  assert.equal(current.state, "approved");
  assert.equal(current.revision, 3);
  assert.deepEqual(current.data.review, approved.data.review);
  assert.equal(
    (current.data.maintenanceReview as { mode: string }).mode,
    "agent-auto",
  );
  assert.equal((await f.app.catalog.freshness(current)).state, "current");
  await f.app.catalog.verify(w.spec.id, {
    recordIds: [e.id],
    explanation: "Behavior preserved; maintenance reviewed by agent.",
  });
  const report = renderReport(f.ledger, "markdown", w.request.id);
  assert.match(report, /agent-auto/);
  assert.match(report, /helper.ts/);
  assert.match(report, /Original source fingerprints/);
  const search = (await f.call("contextory_search", {
    query: "replacement",
    mode: "lexical",
    limit: 20,
  })) as { hits: { id: string }[] };
  assert.ok(
    search.hits.some((hit) => hit.id === change.id),
    "auto-approved changes remain indexed for regression recovery",
  );
  assert.ok(
    f.ledger
      .events()
      .some(
        (event) =>
          event.entityId === e.id && event.type === "catalog.maintained",
      ),
  );
  // Exact retries recover the original result even if the new source disappeared.
  await writeFile(
    join(f.root, "helper.ts"),
    "export const answer = () => 43;\n",
  );
  assert.deepEqual(await f.call("contextory_catalog_change", args), change);
  await assert.rejects(
    f.app.catalog.verify(w.spec.id, {
      recordIds: [e.id],
      explanation: "Later source changed",
    }),
    { code: "STALE_CATALOG" },
  );
});

test("agent can auto-approve implementation conflicts but process/outcome conflicts and retirements wait", async (t) => {
  for (const scenario of [
    "implementation",
    "process",
    "outcome",
    "unknown",
    "rule",
    "changed-behavior",
    "retire",
  ]) {
    const f = await application(t),
      w = await claimed(f.call);
    const c = {
      ...content,
      category: scenario === "rule" ? "rule" : "feature",
    };
    const e = (await f.call("contextory_catalog_change", {
      operationId: operationId(),
      specId: w.spec.id,
      leaseId: w.leaseId,
      action: "create",
      content: c,
      reason: "Baseline",
    })) as Entity;
    await f.call(
      "contextory_catalog_review",
      {
        operationId: operationId(),
        id: e.id,
        expectedRevision: 1,
        action: "approve",
        reason: "Established contract",
      },
      human,
    );
    const result = (await f.call("contextory_catalog_change", {
      operationId: operationId(),
      specId: w.spec.id,
      leaseId: w.leaseId,
      action: scenario === "retire" ? "retire" : "revise",
      id: e.id,
      expectedRevision: 2,
      content:
        scenario === "changed-behavior"
          ? { ...c, description: "Returns 43." }
          : c,
      compatibility: "conflicting",
      impact: ["process", "outcome", "unknown"].includes(scenario)
        ? scenario
        : "implementation",
      autoApprove: true,
      reason:
        "Conflict assessment and validation rationale retained in the audit.",
    })) as Entity;
    assert.equal(
      result.state,
      scenario === "implementation" ? "auto_approved" : "pending",
      scenario,
    );
    if (result.state === "pending") {
      assert.equal(f.ledger.get(e.id).revision, 2);
      await assert.rejects(
        f.call("contextory_catalog_change", {
          operationId: operationId(),
          specId: w.spec.id,
          leaseId: w.leaseId,
          action: "revise",
          id: e.id,
          expectedRevision: 2,
          content: c,
          compatibility: "preserved",
          autoApprove: true,
          reason: "Cannot evade a pending proposal",
        }),
        { code: "CATALOG_APPROVAL_PENDING" },
      );
      await assert.rejects(
        f.call("contextory_decision_record", {
          operationId: operationId(),
          specId: w.spec.id,
          leaseId: w.leaseId,
          title: "Bypass",
          choice: "Proceed",
          rationale: "Try MCP directly",
          consequences: "Would bypass waiting",
        }),
        { code: "APPROVAL_REQUIRED" },
      );
    }
  }
});

function launch(descriptor: string, provider: string, raw: unknown) {
  return new Promise<{ code: number | null; out: string; err: string }>(
    (resolveResult, reject) => {
      const child = spawn(
        process.execPath,
        [resolve("dist/contextory-hook.mjs"), descriptor, provider],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      );
      let out = "",
        err = "";
      child.stdout.on("data", (part) => (out += part));
      child.stderr.on("data", (part) => (err += part));
      child.on("error", reject);
      child.on("close", (code) => resolveResult({ code, out, err }));
      child.stdin.end(typeof raw === "string" ? raw : JSON.stringify(raw));
    },
  );
}

test("real native launchers block implementation and Stop until review, survive service restart and fail closed on outage", async (t) => {
  const f = await fixture(t);
  let service = await startService(f);
  f.cleanups.push(() => service.close());
  const call = (name: string, args: object) =>
    service.app.call(name, args, {
      id: "codex",
      provider: "codex",
      human: false,
    });
  const w = await claimed(call);
  const e = (await call("contextory_catalog_change", {
    operationId: operationId(),
    specId: w.spec.id,
    leaseId: w.leaseId,
    action: "create",
    content,
    reason: "Observation needs no blocking approval",
  })) as Entity;
  const p = (await call("contextory_catalog_change", {
    operationId: operationId(),
    specId: w.spec.id,
    leaseId: w.leaseId,
    action: "revise",
    id: e.id,
    expectedRevision: 1,
    content: { ...content, description: "Returns 43." },
    impact: "outcome",
    compatibility: "conflicting",
    reason: "Changing the output needs review BEFORE editing",
  })) as Entity;
  await service.close();
  service = await startService(f);
  for (const provider of ["codex", "claude", "bob"]) {
    const descriptor = join(f.storage, `${provider}-hook.json`);
    for (const event of ["PreToolUse", "Stop"]) {
      const result = await launch(descriptor, provider, {
        hook_event_name: event,
        session_id: `${provider}-session`,
        cwd: f.root,
        tool_name: "Edit",
        tool_input: { secret: "DO_NOT_STORE_TOOL_INPUT" },
      });
      assert.equal(result.code, 2, `${provider} ${event}: ${result.err}`);
      assert.match(result.err, /Wait for the human decision/);
      if (provider !== "bob") {
        const output = JSON.parse(result.out);
        assert.equal(
          event === "Stop"
            ? output.decision
            : output.hookSpecificOutput.permissionDecision,
          event === "Stop" ? "block" : "deny",
        );
      }
    }
    const allowed = await launch(descriptor, provider, {
      hook_event_name: "PreToolUse",
      session_id: "another-session",
      cwd: f.root,
      tool_name: "Read",
    });
    assert.equal(allowed.code, 0, allowed.err);
  }
  assert.ok(
    !JSON.stringify(service.app.ledger.events()).includes(
      "DO_NOT_STORE_TOOL_INPUT",
    ),
  );
  await rpc(join(f.storage, "ui.json"), "tools/call", {
    name: "contextory_catalog_review",
    arguments: {
      operationId: operationId(),
      id: p.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Explicit exact decision",
    },
  });
  const descriptor = join(f.storage, "codex-hook.json");
  const raw = {
    hook_event_name: "PreToolUse",
    session_id: "s",
    cwd: f.root,
    tool_name: "Edit",
  };
  assert.equal((await launch(descriptor, "codex", raw)).code, 0);
  await service.close();
  assert.equal((await launch(descriptor, "codex", raw)).code, 2);
  assert.equal(
    (await launch(descriptor, "codex", { ...raw, tool_name: "Read" })).code,
    0,
  );
  assert.equal(
    (await launch(descriptor, "codex", { ...raw, hook_event_name: "Stop" }))
      .code,
    2,
  );
  assert.equal((await launch(descriptor, "codex", "invalid JSON")).code, 2);
  assert.equal(
    await readFile(join(f.root, "main.ts"), "utf8"),
    "export function hello() { return 42; }\n",
  );
});

test("recovery allowlist does not trust wrappers, substrings or arbitrary shells", () => {
  for (const tool of [
    "Read",
    "mcp__contextory__contextory_catalog_get",
    "contextory_check_run",
    "wait",
  ])
    assert.equal(approvalSafeTool(tool), true, tool);
  for (const tool of [
    "Bash",
    "exec_command",
    "functions.exec",
    "pretend_contextory_context_get",
    "contextory_release_change",
    "mcp__x__contextory_docs_run",
  ])
    assert.equal(approvalSafeTool(tool), false, tool);
});

test("observed behavioral changes cannot masquerade as maintenance; file observations retain historical approval separately", async (t) => {
  const f = await application(t),
    w = await claimed(f.call);
  const base = {
    specId: w.spec.id,
    leaseId: w.leaseId,
    reason: "Source-backed assessment",
  };
  const file = (await f.call("contextory_catalog_change", {
    ...base,
    operationId: operationId(),
    action: "create",
    content: { ...content, category: "file" },
  })) as Entity;
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: file.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Reviewed original file purpose",
    },
    human,
  );
  const fileChange = (await f.call("contextory_catalog_change", {
    ...base,
    operationId: operationId(),
    action: "revise",
    id: file.id,
    expectedRevision: 2,
    content: {
      ...content,
      category: "file",
      description: "Delegates to the compatible helper.",
    },
    autoApprove: true,
    compatibility: "conflicting",
    impact: "implementation",
  })) as Entity;
  assert.equal(fileChange.state, "auto_approved");
  assert.equal(f.ledger.get(file.id).state, "observed");
  assert.equal(f.ledger.get(file.id).data.approvalBaselineRevision, 2);
  assert.equal(f.ledger.get(file.id, 2).state, "approved");
  const rule = (await f.call("contextory_catalog_change", {
    ...base,
    operationId: operationId(),
    action: "create",
    content: { ...content, category: "rule" },
  })) as Entity;
  const ruleChange = (await f.call("contextory_catalog_change", {
    ...base,
    operationId: operationId(),
    action: "revise",
    id: rule.id,
    expectedRevision: 1,
    content: {
      ...content,
      category: "rule",
      description: "Changes the processing rule and output.",
    },
    autoApprove: true,
    compatibility: "preserved",
    impact: "implementation",
  })) as Entity;
  assert.equal(ruleChange.state, "pending");
  assert.equal(f.ledger.get(rule.id).revision, 1);
});

test("decision history allows implementation conflicts while process or outcome supersession needs an exact human-approved proposal", async (t) => {
  const f = await application(t),
    w = await claimed(f.call);
  const args = {
    specId: w.spec.id,
    leaseId: w.leaseId,
    title: "Internal strategy",
    choice: "Use helper A",
    rationale: "Implementation choice",
    consequences: "Same result",
    sources: [{ path: "main.ts" }],
    impact: "implementation",
  };
  const first = (await f.call("contextory_decision_record", {
    ...args,
    operationId: operationId(),
  })) as Entity;
  const second = (await f.call("contextory_decision_record", {
    ...args,
    operationId: operationId(),
    choice: "Use helper B",
    supersedes: first.id,
  })) as Entity;
  assert.equal(
    (second.data.conflictReview as { mode: string }).mode,
    "agent-auto",
  );
  const process = (await f.call("contextory_decision_record", {
    ...args,
    operationId: operationId(),
    title: "Process rule",
    choice: "Validate before completion",
    impact: "process",
  })) as Entity;
  const replacement = {
    ...args,
    operationId: operationId(),
    choice: "Validate before and after updates",
    supersedes: process.id,
    impact: "process",
  };
  await assert.rejects(f.call("contextory_decision_record", replacement), {
    code: "DECISION_APPROVAL_REQUIRED",
  });
  const entry = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    specId: w.spec.id,
    leaseId: w.leaseId,
    action: "create",
    content: { ...content, category: "rule", description: process.data.choice },
    reason: "Observed prior process rule",
  })) as Entity;
  const proposal = (await f.call("contextory_catalog_change", {
    operationId: operationId(),
    specId: w.spec.id,
    leaseId: w.leaseId,
    action: "revise",
    id: entry.id,
    expectedRevision: 1,
    content: { ...content, category: "rule", description: replacement.choice },
    decisionIds: [process.id],
    compatibility: "conflicting",
    impact: "process",
    autoApprove: true,
    reason: "A process conflict must wait despite auto-approval request",
  })) as Entity;
  assert.equal(proposal.state, "pending");
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: proposal.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Human process decision",
    },
    human,
  );
  await assert.rejects(
    f.call("contextory_decision_record", {
      ...replacement,
      operationId: operationId(),
      choice: "Skip validation",
      approvalId: proposal.id,
    }),
    { code: "DECISION_APPROVAL_REQUIRED" },
  );
  const reviewed = (await f.call("contextory_decision_record", {
    ...replacement,
    operationId: operationId(),
    approvalId: proposal.id,
  })) as Entity;
  assert.equal(
    (reviewed.data.conflictReview as { mode: string }).mode,
    "human-approved-proposal",
  );
  assert.equal(
    f.ledger.get(process.id).data.choice,
    "Validate before completion",
  );
  assert.match(
    renderReport(f.ledger, "markdown", w.request.id),
    /human-approved-proposal/,
  );
});

test("a later human decision replaces current maintenance attribution without erasing the auto-review history", async (t) => {
  const f = await application(t),
    w = await claimed(f.call);
  const base = {
    specId: w.spec.id,
    leaseId: w.leaseId,
    reason: "Tracked change",
  };
  const entry = (await f.call("contextory_catalog_change", {
    ...base,
    operationId: operationId(),
    action: "create",
    content,
  })) as Entity;
  const automatic = (await f.call("contextory_catalog_change", {
    ...base,
    operationId: operationId(),
    action: "revise",
    id: entry.id,
    expectedRevision: 1,
    content,
    compatibility: "preserved",
    impact: "implementation",
    autoApprove: true,
  })) as Entity;
  const proposal = (await f.call("contextory_catalog_change", {
    ...base,
    operationId: operationId(),
    action: "revise",
    id: entry.id,
    expectedRevision: 2,
    content: { ...content, description: "Returns the new approved result." },
    impact: "outcome",
  })) as Entity;
  await f.call(
    "contextory_catalog_review",
    {
      operationId: operationId(),
      id: proposal.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Human approved the new result",
    },
    human,
  );
  const current = f.ledger.get(entry.id);
  assert.equal(current.data.maintenanceReview, undefined);
  assert.equal(current.data.lastChangeId, proposal.id);
  assert.equal(current.data.approvalBaselineRevision, 3);
  assert.equal(f.ledger.get(automatic.id).state, "auto_approved");
  assert.equal(
    (f.ledger.get(entry.id, 2).data.maintenanceReview as { mode: string }).mode,
    "agent-auto",
  );
});
