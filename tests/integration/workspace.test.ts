import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { startService } from "../../src/service/server";
import { rpc } from "../../src/service/rpc";
import { toolDefinitions } from "../../src/contracts/tools";
import type { WorkspaceRequestStatus } from "../../src/contracts/model";
import { fixture, operationId, waitJob } from "../helpers";

async function workspace(t: TestContext) {
  const a = await fixture(t),
    b = await fixture(t);
  await writeFile(
    join(a.root, "main.ts"),
    'export function sameName() { return "alpha"; }',
  );
  await writeFile(
    join(b.root, "main.ts"),
    'export function sameName() { return "beta"; }',
  );
  const first = await startService({ ...a, headless: true });
  let second = await startService({ ...b, headless: true });
  a.cleanups.push(() => first.close());
  b.cleanups.push(() => second.close());
  const projects = [
    {
      id: first.app.ledger.projectId,
      name: "Alpha",
      root: a.root,
      storage: a.storage,
    },
    {
      id: second.app.ledger.projectId,
      name: "Beta",
      root: b.root,
      storage: b.storage,
    },
  ];
  const workspaceId = "workspace:test";
  const configure = async () => {
    for (const [i, f] of [a, b].entries()) {
      const descriptor = join(f.storage, "ui.json");
      await rpc(descriptor, "client.attach", { id: `editor-${i}` });
      await rpc(descriptor, "workspace.configure", {
        clientId: `editor-${i}`,
        workspaceId,
        projects,
      });
    }
  };
  await configure();
  const call = (name: string, args: object = {}) =>
    rpc<any>(join(a.storage, "codex.json"), "tools/call", {
      name,
      arguments: args,
    });
  const restartSecond = async () => {
    second = await startService({ ...b, headless: true });
    await configure();
  };
  return {
    a,
    b,
    first,
    second: () => second,
    projects,
    workspaceId,
    configure,
    call,
    restartSecond,
  };
}

test("hook recovery routes only to the explicitly selected workspace project", async (t) => {
  const f = await workspace(t);
  const result = (await f.call("contextory_hooks_rebuild", {
    projectId: f.projects[1].id,
    workspaceId: f.workspaceId,
    operationId: operationId(),
    provider: "codex",
  })) as { project: { id: string } };
  assert.equal(result.project.id, f.projects[1].id);
  await readFile(join(f.b.root, ".codex/hooks.json"));
  await assert.rejects(readFile(join(f.a.root, ".codex/hooks.json")), {
    code: "ENOENT",
  });
  await assert.rejects(
    f.call("contextory_hooks_rebuild", {
      projectId: "missing",
      operationId: operationId(),
      provider: "codex",
    }),
    { code: "UNKNOWN_PROJECT" },
  );
});

test("workspace calls isolate records, symbols and project IDs while preserving native roles", async (t) => {
  const f = await workspace(t);
  const [a, b] = f.projects;
  const info = await f.call("contextory_workspace_get");
  assert.deepEqual(
    info.projects.map((p: { id: string }) => p.id),
    [a.id, b.id],
  );
  assert.ok(
    !JSON.stringify(info).includes(f.b.storage),
    "native discovery exposes no credential paths",
  );
  const local = await f.call("contextory_request_change", {
    action: "create",
    operationId: operationId(),
    title: "Only alpha",
    description: "A local request",
  });
  const foreign = await f.call("contextory_request_change", {
    projectId: b.id,
    action: "create",
    operationId: operationId(),
    title: "Only beta",
    description: "Explicit beta request",
  });
  assert.equal(foreign.project.id, b.id);
  assert.equal(f.first.app.ledger.all("request").length, 1);
  assert.equal(f.second().app.ledger.all("request").length, 1);
  await assert.rejects(f.call("contextory_entity_get", { id: foreign.id }), {
    code: "NOT_FOUND",
  });
  await assert.rejects(
    f.call("contextory_entity_get", { projectId: b.id, id: local.id }),
    { code: "NOT_FOUND" },
  );
  const alpha = await f.call("contextory_code_context_get", {
    query: "sameName",
    paths: ["main.ts"],
    budgetTokens: 1500,
  });
  const beta = await f.call("contextory_code_context_get", {
    projectId: b.id,
    query: "sameName",
    paths: ["main.ts"],
    budgetTokens: 1500,
  });
  assert.match(JSON.stringify(alpha.symbols), /alpha/);
  assert.doesNotMatch(JSON.stringify(alpha.symbols), /beta/);
  assert.match(JSON.stringify(beta.symbols), /beta/);
  assert.equal(beta.project.id, b.id);
  assert.equal(
    (await f.call("contextory_context_get")).projectId,
    a.id,
    "foreign routing never changes the default",
  );
  await assert.rejects(
    f.call("contextory_request_change", {
      projectId: "unknown",
      operationId: operationId(),
      action: "create",
      title: "Wrong",
      description: "Must not fall back",
    }),
    { code: "UNKNOWN_PROJECT" },
  );
  await assert.rejects(
    f.first.app.call(
      "contextory_context_get",
      { projectId: b.id },
      { id: "codex", provider: "codex", human: false },
    ),
    { code: "WRONG_PROJECT" },
  );
  await assert.rejects(
    rpc(join(f.a.storage, "codex-hook.json"), "workspace.branch.get", {
      groupId: "anything",
      workspaceId: f.workspaceId,
    }),
    { code: "FORBIDDEN" },
  );
  await assert.rejects(
    rpc(join(f.a.storage, "codex.json"), "workspace.configure", {}),
    { code: "FORBIDDEN" },
  );
  await assert.rejects(
    f.call("contextory_catalog_review", {
      projectId: b.id,
      operationId: operationId(),
      id: "not-approved",
      action: "approve",
      expectedRevision: 1,
      reason: "No escalation",
    }),
    { code: "FORBIDDEN" },
  );
  for (const tool of toolDefinitions()) {
    assert.ok(tool.inputSchema.properties.projectId);
    assert.ok(tool.inputSchema.properties.workspaceId);
  }
});

async function completeBranch(
  call: (name: string, args: object) => Promise<any>,
  requestId: string,
) {
  const milestone = await call("contextory_spec_change", {
    action: "milestone",
    operationId: operationId(),
    parentId: requestId,
    title: "Local delivery",
  });
  let spec = await call("contextory_spec_change", {
    action: "create",
    operationId: operationId(),
    parentId: milestone.id,
    title: "Project-owned spec",
    criteria: ["The local check passes"],
    paths: ["main.ts"],
  });
  const session = await call("contextory_session_attach", {
    operationId: operationId(),
  });
  spec = await call("contextory_spec_lease", {
    action: "claim",
    operationId: operationId(),
    specId: spec.id,
    sessionId: session.id,
    expectedRevision: spec.revision,
  });
  const leaseId = spec.data.lease.id;
  const job = await call("contextory_check_run", {
    operationId: operationId(),
    specId: spec.id,
    leaseId,
    recipeId: "local",
    criteria: ["AC-1"],
  });
  const checked = await waitJob(call, job.jobId);
  assert.equal(checked.state, "passed");
  const outcome = await call("contextory_outcome_submit", {
    operationId: operationId(),
    specId: spec.id,
    leaseId,
    expectedRevision: spec.revision,
    summary: "Local project verified",
    issuesSummary: "None",
    decisionsSummary: "Project isolation",
    limitations: "Fixture",
    report: "Local check",
    changelog: "Verified",
    commits: [],
    criteria: [{ criterionId: "AC-1", evidenceIds: [checked.data.evidenceId] }],
  });
  const completed = await call("contextory_spec_change", {
    ...outcome.nextAction.arguments,
    operationId: operationId(),
  });
  assert.equal(completed.state, "completed");
  return { spec, leaseId, session };
}

test("coordinated requests keep project-owned branches and complete only after every branch passes its own checks", async (t) => {
  const f = await workspace(t);
  const input = {
    operationId: operationId(),
    projectIds: f.projects.map((p) => p.id),
    title: "Shared interface migration",
    description: "Change both projects with separate evidence",
  };
  const group = (await f.call(
    "contextory_workspace_request_create",
    input,
  )) as WorkspaceRequestStatus;
  assert.equal(group.partial, false);
  assert.equal(group.state, "active");
  assert.equal(group.branches.length, 2);
  assert.equal(
    (await f.call("contextory_workspace_request_create", input)).id,
    group.id,
  );
  await assert.rejects(
    f.call("contextory_workspace_request_create", {
      ...input,
      title: "Changed replay",
    }),
    { code: "OPERATION_CONFLICT" },
  );
  for (const [i, item] of [f.a, f.b].entries()) {
    await rpc(join(item.storage, "ui.json"), "configure", {
      recipes: [
        {
          id: "local",
          name: "Assert project source",
          executable: process.execPath,
          args: [
            "-e",
            `require('node:assert/strict').match(require('node:fs').readFileSync('main.ts','utf8'), /${i ? "beta" : "alpha"}/)`,
          ],
        },
      ],
    });
  }
  const first = await completeBranch(f.call, group.branches[0].request!.id);
  const status = await f.call("contextory_workspace_get", {
    groupId: group.id,
  });
  assert.equal(status.state, "active");
  assert.equal(status.branches[0].request.state, "completed");
  const betaCall = (name: string, args: object) =>
    f.call(name, { ...args, projectId: f.projects[1].id });
  await assert.rejects(
    betaCall("contextory_spec_lease", {
      action: "claim",
      operationId: operationId(),
      specId: first.spec.id,
      sessionId: first.session.id,
      expectedRevision: 2,
    }),
    { code: "NOT_FOUND" },
  );
  await completeBranch(betaCall, group.branches[1].request!.id);
  const done = await f.call("contextory_workspace_get", { groupId: group.id });
  assert.equal(done.state, "completed");
  assert.equal(done.partial, false);
  await f.second().close();
  const offline = await f.call("contextory_workspace_get", {
    groupId: group.id,
  });
  assert.equal(offline.state, "incomplete");
  assert.equal(offline.partial, true);
  assert.ok(offline.branches[1].error);
  await f.restartSecond();
  assert.equal(
    (await f.call("contextory_workspace_get", { groupId: group.id })).state,
    "completed",
  );
});

test("partial cross-project creation survives restart and explicit retries without duplicate branches", async (t) => {
  const f = await workspace(t);
  await f.second().close();
  const input = {
    operationId: operationId(),
    projectIds: f.projects.map((p) => p.id),
    title: "Recoverable migration",
    description: "Create each branch once",
  };
  const partial = await f.call("contextory_workspace_request_create", input);
  assert.equal(partial.state, "incomplete");
  assert.equal(partial.partial, true);
  assert.equal(f.first.app.ledger.all("request").length, 1);
  const stored = f.first.app.ledger.all("request")[0].data.workspaceRequest as {
    creation: typeof input;
  };
  assert.equal(
    stored.creation.operationId,
    input.operationId,
    "recovery input survives in the authoritative local request",
  );
  await f.restartSecond();
  const resumed = await f.call("contextory_workspace_request_create", input);
  assert.equal(resumed.id, partial.id);
  assert.equal(resumed.partial, false);
  assert.equal(f.first.app.ledger.all("request").length, 1);
  assert.equal(f.second().app.ledger.all("request").length, 1);
  await rpc(join(f.a.storage, "ui.json"), "workspace.configure", {
    clientId: "editor-0",
    workspaceId: f.workspaceId,
    projects: [f.projects[0]],
  });
  await assert.rejects(
    f.call("contextory_context_get", { projectId: f.projects[1].id }),
    { code: "UNKNOWN_PROJECT" },
  );
  assert.equal(
    (await f.call("contextory_workspace_get", { groupId: partial.id })).state,
    "incomplete",
  );
  assert.equal(
    f.second().app.ledger.all("request").length,
    1,
    "detaching membership never deletes project records",
  );
});

test("multiple workspace contexts require explicit scope and rotated descriptors cannot change project identity", async (t) => {
  const f = await workspace(t);
  const nested = join(f.a.root, "nested-project");
  await mkdir(nested);
  await assert.rejects(
    rpc(join(f.a.storage, "ui.json"), "workspace.configure", {
      clientId: "editor-0",
      workspaceId: f.workspaceId,
      projects: [f.projects[0], { ...f.projects[1], root: nested }],
    }),
    { code: "INVALID_WORKSPACE" },
  );
  await rpc(join(f.a.storage, "ui.json"), "client.attach", {
    id: "another-editor",
  });
  await rpc(join(f.a.storage, "ui.json"), "workspace.configure", {
    clientId: "another-editor",
    workspaceId: "workspace:other",
    projects: f.projects,
  });
  assert.equal((await f.call("contextory_workspace_get")).contexts.length, 2);
  await assert.rejects(
    f.call("contextory_context_get", { projectId: f.projects[1].id }),
    { code: "WORKSPACE_SCOPE_REQUIRED" },
  );
  assert.equal(
    (
      await f.call("contextory_context_get", {
        projectId: f.projects[1].id,
        workspaceId: f.workspaceId,
      })
    ).project.id,
    f.projects[1].id,
  );
  const path = join(f.b.storage, "codex.json"),
    original = await readFile(path, "utf8");
  const descriptor = JSON.parse(original);
  await writeFile(path, JSON.stringify({ ...descriptor, root: f.a.root }));
  await assert.rejects(
    f.call("contextory_context_get", {
      projectId: f.projects[1].id,
      workspaceId: f.workspaceId,
    }),
    { code: "WRONG_PROJECT" },
  );
  await writeFile(path, original);
  await rpc(join(f.a.storage, "ui.json"), "client.detach", {
    id: "another-editor",
  });
  assert.equal((await f.call("contextory_workspace_get")).contexts.length, 1);
  await rpc(join(f.a.storage, "ui.json"), "client.detach", { id: "editor-0" });
  assert.equal((await f.call("contextory_workspace_get")).contexts.length, 0);
  await assert.rejects(
    f.call("contextory_context_get", { projectId: f.projects[1].id }),
    { code: "WORKSPACE_SCOPE_REQUIRED" },
  );
});
