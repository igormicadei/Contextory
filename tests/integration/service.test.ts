import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, unlink, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startService } from "../../src/service/server";
import { rpc } from "../../src/service/rpc";
import { ServiceClient } from "../../src/service/client";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "node:http";
import { fixture, operationId, claimed, waitJob } from "../helpers";
import type { Entity } from "../../src/contracts/model";
import { toolDefinitions } from "../../src/contracts/tools";

test("MCP hook rebuild restores the launcher, retains operation results and cannot impersonate hook trust", async (t) => {
  const f = await fixture(t);
  let service = await startService({ ...f, headless: true });
  f.cleanups.push(() => service.close());
  const call = (args: object, role = "codex") =>
    rpc<any>(join(f.storage, `${role}.json`), "tools/call", {
      name: "contextory_hooks_rebuild",
      arguments: args,
    });
  const input = { operationId: operationId(), provider: "codex" };
  const result = await call(input);
  assert.equal(result.status, "rebuilt");
  assert.equal(result.trust, "client-owned");
  assert.deepEqual(result.changedFiles, [".codex/hooks.json"]);
  assert.deepEqual(result.observations, { mcp: true, hooks: false });
  assert.equal(JSON.stringify(result).includes(f.storage), false);
  const launcher = join(f.storage, "runtime/contextory-hook.mjs");
  assert.deepEqual(
    await readFile(launcher),
    await readFile(resolve("dist/contextory-hook.mjs")),
  );
  await assert.rejects(readFile(join(f.root, ".codex/config.toml")), {
    code: "ENOENT",
  });
  await writeFile(join(f.root, ".codex/hooks.json"), "{}");
  assert.deepEqual(await call(input), result);
  assert.equal(await readFile(join(f.root, ".codex/hooks.json"), "utf8"), "{}");
  await assert.rejects(call({ ...input, provider: "bob" }), {
    code: "OPERATION_CONFLICT",
  });
  await assert.rejects(call(input, "codex-hook"), { code: "FORBIDDEN" });
  await assert.rejects(
    call({ operationId: operationId(), provider: "generic" }),
    { code: "INVALID_ARGUMENT" },
  );
  await assert.rejects(
    call({
      operationId: operationId(),
      provider: "codex",
      codebaseId: "reference",
    }),
    { code: "INVALID_ARGUMENT" },
  );
  await call({ ...input, operationId: operationId() });
  await unlink(launcher);
  const restored = await call({ ...input, operationId: operationId() });
  assert.equal(restored.launcherChanged, true);
  assert.deepEqual(restored.changedFiles, []);
  const unchanged = await call({ ...input, operationId: operationId() });
  assert.equal(unchanged.status, "unchanged");
  await service.close();
  service = await startService({ ...f, headless: true });
  assert.deepEqual(await call(input), result);
});

test("hook rebuild preserves linked runtime directories without writing external launchers or project hooks", async (t) => {
  const f = await fixture(t);
  const service = await startService({ ...f, headless: true });
  f.cleanups.push(() => service.close());
  const outside = join(f.directory, "external-runtime");
  await mkdir(outside);
  const launcher = join(outside, "contextory-hook.mjs");
  await writeFile(launcher, "user-owned");
  await symlink(
    outside,
    join(f.storage, "runtime"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    rpc(join(f.storage, "codex.json"), "tools/call", {
      name: "contextory_hooks_rebuild",
      arguments: { provider: "codex", operationId: operationId() },
    }),
    { code: "LINKED_CONFIG" },
  );
  assert.equal(await readFile(launcher, "utf8"), "user-owned");
  await assert.rejects(readFile(join(f.root, ".codex/hooks.json")), {
    code: "ENOENT",
  });
});
import {
  agentInstructions,
  completionNote,
  retrievalGuidance,
  retrievalReminder,
  workflowGuidance,
} from "../../src/agents/instructions";

test("service scopes reference source resolution and rejects reference mutations through hook credentials", async (t) => {
  const f = await fixture(t),
    service = await startService({ ...f, headless: true });
  f.cleanups.push(() => service.close());
  const root = join(f.directory, "reference");
  await mkdir(root);
  await writeFile(join(root, "main.ts"), "export function referenceOnly(){}");
  const args = {
    name: "contextory_codebase_change",
    arguments: { action: "add", root, operationId: operationId() },
  };
  await assert.rejects(
    rpc(join(f.storage, "codex-hook.json"), "tools/call", args),
    { code: "FORBIDDEN" },
  );
  await assert.rejects(
    rpc(join(f.storage, "codex-hook.json"), "tools/call", {
      name: "contextory_release_prepare",
      arguments: { operationId: operationId() },
    }),
    { code: "FORBIDDEN" },
  );
  const versions = (await rpc(join(f.storage, "generic.json"), "tools/call", {
    name: "contextory_version_get",
    arguments: {},
  })) as { available: boolean };
  assert.equal(versions.available, false);
  const ref = (await rpc(
    join(f.storage, "generic.json"),
    "tools/call",
    args,
  )) as { id: string };
  const ui = join(f.storage, "ui.json");
  assert.equal(
    await rpc(ui, "source.resolve", { path: "main.ts", codebaseId: ref.id }),
    join(root, "main.ts"),
  );
  assert.equal(
    await rpc(ui, "source.resolve", { path: "main.ts" }),
    join(f.root, "main.ts"),
  );
  await assert.rejects(
    rpc(ui, "source.resolve", {
      path: "../project/main.ts",
      codebaseId: ref.id,
    }),
    { code: "INVALID_PATH" },
  );
  await assert.rejects(
    rpc(ui, "source.resolve", { path: "main.ts", codebaseId: "missing" }),
    { code: "NOT_FOUND" },
  );
});

test("catalog review is restricted by authenticated service role and survives restart with immutable history", async (t) => {
  const f = await fixture(t);
  let service = await startService({ ...f, headless: true });
  f.cleanups.push(() => service.close());
  const call = (name: string, args: object) =>
    rpc(join(f.storage, "generic.json"), "tools/call", {
      name,
      arguments: args,
    });
  const work = await claimed(call);
  const entry = (await call("contextory_catalog_change", {
    operationId: operationId(),
    action: "create",
    specId: work.spec.id,
    leaseId: work.leaseId,
    content: {
      category: "file",
      title: "Main",
      description: "Greeting entry point",
      sources: [{ path: "main.ts" }],
    },
    reason: "Baseline",
  })) as Entity;
  const review = {
    name: "contextory_catalog_review",
    arguments: {
      operationId: operationId(),
      id: entry.id,
      expectedRevision: 1,
      action: "approve",
      reason: "Reviewed in UI",
    },
  };
  const refresh = {
    ...review,
    arguments: {
      ...review.arguments,
      operationId: operationId(),
      action: "refresh",
    },
  };
  await assert.rejects(
    rpc(join(f.storage, "generic.json"), "tools/call", refresh),
    { code: "FORBIDDEN" },
  );
  await assert.rejects(
    rpc(join(f.storage, "codex-hook.json"), "tools/call", refresh),
    { code: "FORBIDDEN" },
  );
  await assert.rejects(
    rpc(join(f.storage, "codex-hook.json"), "tools/call", review),
    { code: "FORBIDDEN" },
  );
  await assert.rejects(
    rpc(join(f.storage, "generic.json"), "tools/call", review),
    { code: "FORBIDDEN" },
  );
  assert.equal(
    ((await rpc(join(f.storage, "ui.json"), "tools/call", review)) as Entity)
      .state,
    "approved",
  );
  await service.close();
  service = await startService({ ...f, headless: true });
  const history = (await call("contextory_project_export", {
    section: "revisions",
    entityId: entry.id,
  })) as { items: { record: Entity }[] };
  assert.deepEqual(
    history.items.map((i) => i.record.state),
    ["observed", "approved"],
  );
});

test("native MCP discovery survives the editor service starting later without restarting the native connection", async (t) => {
  const f = await fixture(t);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("dist/mcp-proxy.mjs"), join(f.storage, "codex.json")],
    stderr: "pipe",
  });
  const client = new Client({ name: "early-native-client", version: "1.0.0" });
  f.cleanups.push(() => client.close());
  await client.connect(transport);
  assert.equal(client.getInstructions(), agentInstructions);
  const tools = await client.listTools();
  assert.deepEqual(tools.tools, toolDefinitions());
  assert.equal(tools.tools.length, toolDefinitions().length);
  assert.ok(tools.tools.some((tool) => tool.name === "contextory_spec_change"));
  // The native client already cached the tool list before any descriptor exists.
  const pending = client.callTool({
    name: "contextory_request_change",
    arguments: {
      operationId: operationId(),
      action: "create",
      title: "Early native request",
      description: "Service readiness must not require a native restart",
    },
  });
  const service = await startService(f);
  f.cleanups.push(() => service.close());
  const result = await pending;
  assert.ok(!result.isError);
  const entity = JSON.parse(
    (result.content as { text: string }[])[0].text,
  ) as Entity;
  assert.equal(entity.title, "Early native request");
  assert.equal(service.app.ledger.all("request").length, 1);
  const context = await client.callTool({
    name: "contextory_context_get",
    arguments: {},
  });
  assert.ok(!context.isError, JSON.stringify(context));
  const brief = JSON.parse((context.content as { text: string }[])[0].text);
  assert.deepEqual(brief.retrieval, retrievalGuidance);
  assert.deepEqual(brief.workflow, workflowGuidance);
  assert.ok(
    service.app
      .dashboard()
      .connections.find((connection) => connection.provider === "codex")
      ?.mcpSeen,
  );
  assert.equal(
    (await client.listTools()).tools.length,
    toolDefinitions().length,
  );
});

test("native discovery observes a service starting after 15 seconds without another native request", async (t) => {
  const f = await fixture(t);
  const client = new Client({ name: "slow-startup", version: "1" });
  f.cleanups.push(() => client.close());
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("dist/mcp-proxy.mjs"), join(f.storage, "codex.json")],
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  await client.connect(transport);
  assert.deepEqual((await client.listTools()).tools, toolDefinitions());
  await delay(16000);
  const service = await startService(f);
  f.cleanups.push(() => service.close());
  const deadline = Date.now() + 5000;
  const connection = () =>
    service.app.dashboard().connections.find((c) => c.provider === "codex");
  while (!connection()?.mcpCurrent && Date.now() < deadline) await delay(100);
  assert.equal(connection()?.mcpCurrent, true, stderr);
  assert.equal(connection()?.hookCurrent, false);
  assert.equal(service.app.ledger.all("request").length, 0);
  assert.doesNotMatch(stderr, /still starting|not ready after five minutes/);
  const result = await client.callTool({
    name: "contextory_context_get",
    arguments: {},
  });
  assert.ok(!result.isError, JSON.stringify(result));
});

test("a reused native connection waits across delayed workspace reopen and sends the first mutation once", async (t) => {
  const f = await fixture(t);
  let service = await startService(f);
  f.cleanups.push(() => service.close());
  const client = new Client({ name: "resumed-chat", version: "1" });
  f.cleanups.push(() => client.close());
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [resolve("dist/mcp-proxy.mjs"), join(f.storage, "codex.json")],
      stderr: "pipe",
    }),
  );
  assert.ok(
    !(await client.callTool({ name: "contextory_context_get", arguments: {} }))
      .isError,
  );
  assert.equal(
    service.app.dashboard().connections.find((c) => c.provider === "codex")
      ?.mcpCurrent,
    true,
  );
  service.app.seen("hook:codex");
  const projectId = service.app.ledger.projectId;
  await service.close();
  const pending = client.callTool({
    name: "contextory_request_change",
    arguments: {
      operationId: operationId(),
      action: "create",
      title: "First call after reopen",
      description: "Must wait and run once",
    },
  });
  await delay(400);
  service = await startService(f);
  const fresh = service.app
    .dashboard()
    .connections.find((c) => c.provider === "codex")!;
  assert.ok(fresh.mcpSeen && fresh.hookSeen);
  assert.equal(fresh.mcpCurrent, false);
  assert.equal(fresh.hookCurrent, false);
  const result = await pending;
  assert.ok(!result.isError, JSON.stringify(result));
  assert.equal(service.app.ledger.projectId, projectId);
  assert.equal(service.app.ledger.all("request").length, 1);
  assert.equal(
    service.app.dashboard().connections.find((c) => c.provider === "codex")
      ?.mcpCurrent,
    true,
  );
  assert.equal(
    service.app.dashboard().connections.find((c) => c.provider === "codex")
      ?.hookCurrent,
    false,
  );
});

test("proxy never replays a dispatched mutation after response loss and rejects an incompatible service contract", async (t) => {
  const f = await fixture(t);
  let calls = 0,
    mismatch = false;
  const http = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const packet = JSON.parse(body);
    if (packet.method === "tools/list") {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          result: { tools: mismatch ? [] : toolDefinitions() },
        }),
      );
    } else {
      calls++;
      response.destroy(); // The mutation may have committed before its response was lost.
    }
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  f.cleanups.push(async () => {
    http.closeAllConnections();
    await new Promise<void>((resolve) => http.close(() => resolve()));
  });
  const address = http.address() as { port: number };
  const descriptor = join(f.storage, "codex.json");
  await writeFile(
    descriptor,
    JSON.stringify({
      schema: 1,
      url: `http://127.0.0.1:${address.port}/rpc`,
      token: "a".repeat(64),
      root: f.root,
    }),
  );
  const client = new Client({ name: "lost-response", version: "1" });
  f.cleanups.push(() => client.close());
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [resolve("dist/mcp-proxy.mjs"), descriptor],
      stderr: "pipe",
    }),
  );
  const lost = await client.callTool({
    name: "contextory_request_change",
    arguments: {
      operationId: operationId(),
      action: "create",
      title: "Run once",
      description: "Unknown response",
    },
  });
  assert.equal(lost.isError, true);
  assert.equal(calls, 1);
  mismatch = true;
  const stale = await client.callTool({
    name: "contextory_context_get",
    arguments: {},
  });
  assert.equal(stale.isError, true);
  assert.equal(
    JSON.parse((stale.content as { text: string }[])[0].text).code,
    "SERVICE_RESTART_REQUIRED",
  );
  assert.equal(calls, 1);
});

test("editor service client reuses unchanged bridge files and detects a same-version stale tool contract", async (t) => {
  const f = await fixture(t),
    service = await startService(f);
  f.cleanups.push(() => service.close());
  const make = () =>
    new ServiceClient(
      f.root,
      f.storage,
      resolve("."),
      process.execPath,
      f.embeddingDirectory,
      () => {},
      () => {},
    );
  const first = make();
  f.cleanups.push(() => first.close());
  await first.start();
  assert.equal(first.bridgeChanged, true);
  await first.close();
  const reopened = make();
  f.cleanups.push(() => reopened.close());
  await reopened.start();
  assert.equal(reopened.bridgeChanged, false);
  assert.equal(reopened.bridgeFingerprint, first.bridgeFingerprint);
  await reopened.close();
  const stale = make(),
    actual = stale.call.bind(stale);
  stale.call = async <T>(
    method: string,
    params: unknown = {},
    timeout?: number,
  ): Promise<T> =>
    method === "tools/list"
      ? ({ tools: [] } as T)
      : actual<T>(method, params, timeout);
  await assert.rejects(stale.start(), { code: "SERVICE_RESTART_REQUIRED" });
  await stale.close();
});

test("real stdio MCP proxy, role isolation, advisory hooks and descriptor rotation", async (t) => {
  const f = await fixture(t);
  let service = await startService(f);
  f.cleanups.push(async () => service.close());
  const ui = join(f.storage, "ui.json");
  const codex = join(f.storage, "codex.json");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("dist/mcp-proxy.mjs"), codex],
    stderr: "pipe",
  });
  const client = new Client({
    name: "contextory-integration-test",
    version: "1.0.0",
  });
  f.cleanups.push(() => client.close());
  await client.connect(transport);
  const list = await client.listTools();
  assert.ok(
    list.tools.some((tool) => tool.name === "contextory_outcome_submit"),
  );
  assert.deepEqual(list.tools, toolDefinitions());
  for (const name of [
    "contextory_request_change",
    "contextory_spec_change",
    "contextory_spec_lease",
    "contextory_history_get",
    "contextory_search",
    "contextory_flow_trace",
    "contextory_usage_get",
    "contextory_code_context_get",
    "contextory_code_architecture_get",
    "contextory_code_path_get",
    "contextory_code_index_refresh",
  ])
    assert.ok(list.tools.some((t) => t.name === name));
  const created = await client.callTool({
    name: "contextory_request_change",
    arguments: {
      operationId: operationId(),
      action: "create",
      title: "Native request",
      description: "Via MCP",
      human: true,
    },
  });
  const entity = JSON.parse(
    (created.content as { text: string }[])[0].text,
  ) as Entity;
  assert.equal(entity.data.provenance, "agent-reported user intent");
  await assert.rejects(rpc(codex, "configure", { recipes: [] }), {
    code: "FORBIDDEN",
  });
  await assert.rejects(rpc(join(f.storage, "bob-hook.json"), "tools/list"), {
    code: "FORBIDDEN",
  });
  for (const provider of ["codex", "claude", "bob"])
    for (const event of [
      "SessionStart",
      "UserPromptSubmit",
      "PostCompact",
      "PreToolUse",
    ]) {
      const hook = spawn(
        process.execPath,
        [
          resolve("dist/contextory-hook.mjs"),
          join(f.storage, `${provider}-hook.json`),
          provider,
        ],
        { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
      );
      let output = "",
        diagnostics = "";
      hook.stdout.on("data", (chunk) => {
        output += chunk;
      });
      hook.stderr.on("data", (chunk) => {
        diagnostics += chunk;
      });
      hook.stdin.end(
        JSON.stringify({
          hook_event_name: event,
          session_id: `${provider}-session`,
          cwd: f.root,
          prompt: "DO_NOT_STORE_THIS_PROMPT",
          transcript_path: "DO_NOT_READ",
        }),
      );
      await new Promise<void>((resolve, reject) => {
        hook.on("error", reject);
        hook.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`hook ${code}`)),
        );
      });
      assert.match(
        output,
        /Contextory companion/,
        `${provider} ${event}: ${diagnostics}`,
      );
      const reminder =
        provider === "bob"
          ? output
          : JSON.parse(output).hookSpecificOutput.additionalContext;
      assert.ok(reminder.includes(retrievalReminder));
      assert.ok(reminder.includes(completionNote));
      assert.ok(reminder.includes(`nativeSessionId="${provider}-session"`));
      if (provider !== "bob")
        assert.equal(
          JSON.parse(output).hookSpecificOutput.hookEventName,
          event,
        );
    }
  assert.equal(
    service.app.dashboard().connections.filter((c) => c.hookSeen).length,
    3,
  );
  assert.ok(
    !JSON.stringify(service.app.ledger.events()).includes("DO_NOT_STORE"),
  );
  await assert.rejects(
    rpc(join(f.storage, "codex-hook.json"), "hook", {
      id: "outside",
      event: "Stop",
      nativeSession: "x",
      cwd: f.directory,
    }),
    { code: "WRONG_WORKSPACE" },
  );
  const d = service.descriptors.get("codex")!;
  assert.equal(
    (
      await fetch(d.url, {
        method: "POST",
        headers: { authorization: "Bearer invalid" },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(d.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${d.token}`,
          origin: "https://example.com",
        },
      })
    ).status,
    403,
  );
  // Oversize native output becomes retrievable pages, never an unreadable handle.
  let largeRequest: Entity | undefined;
  for (let i = 0; i < 5; i++)
    largeRequest = await rpc<Entity>(codex, "tools/call", {
      name: "contextory_request_change",
      arguments: {
        operationId: operationId(),
        action: "create",
        title: `Large ${i}`,
        description: "context ".repeat(1400),
      },
    });
  const report = await rpc<{ artifactId: string }>(codex, "tools/call", {
    name: "contextory_report_export",
    arguments: { format: "json", requestId: largeRequest!.id },
  });
  assert.match(report.artifactId, /^ART-/);
  const page = await rpc<{ content: string; nextOffset: number }>(
    codex,
    "tools/call",
    {
      name: "contextory_entity_get",
      arguments: { id: report.artifactId, limit: 10 },
    },
  );
  assert.equal(page.content.length, 4000);
  assert.equal(page.nextOffset, 10);
  const oldInstance = (await rpc<{ instance: string }>(ui, "health")).instance;
  await service.close();
  service = await startService(f);
  assert.notEqual(
    (await rpc<{ instance: string }>(ui, "health")).instance,
    oldInstance,
  );
  const context = await client.callTool({
    name: "contextory_context_get",
    arguments: {},
  });
  assert.equal(context.isError, undefined);
  const health = await rpc<{ projectId: string }>(ui, "health");
  assert.equal(health.projectId, service.app.ledger.projectId);
  const flow = await rpc<{ nodes: { label: string }[] }>(ui, "tools/call", {
    name: "contextory_flow_trace",
    arguments: { root: { path: "main.ts", symbol: "hello" }, view: "flow" },
  });
  assert.ok(flow.nodes.some((node) => node.label === "hello"));
  // Complete through the actual MCP stdio transport, with no UI status mutation.
  const nativeCall = async (name: string, args: object) => {
    const result = await client.callTool({ name, arguments: { ...args } });
    assert.ok(!result.isError, JSON.stringify(result.content));
    return JSON.parse((result.content as { text: string }[])[0].text);
  };
  const work = await claimed(nativeCall);
  await rpc(ui, "configure", {
    recipes: [
      {
        id: "unit",
        name: "Contract test",
        executable: process.execPath,
        args: ["-e", "console.log('contract verified')"],
      },
    ],
  });
  const job = await nativeCall("contextory_check_run", {
    operationId: operationId(),
    specId: work.spec.id,
    leaseId: work.leaseId,
    recipeId: "unit",
    criteria: ["AC-1"],
  });
  const checked = await waitJob(nativeCall, job.jobId);
  const submitted = await nativeCall("contextory_outcome_submit", {
    operationId: operationId(),
    specId: work.spec.id,
    leaseId: work.leaseId,
    expectedRevision: work.spec.revision,
    summary: "Contract implemented",
    issuesSummary: "No issues found",
    decisionsSummary: "No new decisions",
    limitations: "Fixture contract",
    report: "Verified end to end through MCP",
    changelog: "Implement contract",
    criteria: [{ criterionId: "AC-1", evidenceIds: [checked.data.evidenceId] }],
  });
  assert.equal(submitted.state, "submitted");
  assert.equal(submitted.nextAction.tool, "contextory_spec_change");
  const completed = await nativeCall(submitted.nextAction.tool, {
    ...submitted.nextAction.arguments,
    operationId: operationId(),
  });
  assert.equal(completed.state, "completed");
  assert.equal(
    (await nativeCall("contextory_entity_get", { id: work.milestone.id }))
      .entity.state,
    "completed",
  );
  assert.equal(
    (await nativeCall("contextory_entity_get", { id: work.request.id })).entity
      .state,
    "completed",
  );
  const exported = await nativeCall("contextory_report_export", {
    format: "report",
    requestId: work.request.id,
  });
  assert.match(exported.content, /Contract implemented/);
  assert.match(exported.content, /Contract test/);
  assert.ok(!exported.content.includes("Native request"));
  await nativeCall("contextory_spec_change", {
    operationId: operationId(),
    action: "milestone",
    parentId: work.request.id,
    title: "Next planned milestone",
  });
  assert.equal(
    (await nativeCall("contextory_entity_get", { id: work.request.id })).entity
      .state,
    "active",
  );
  await nativeCall("contextory_spec_change", {
    operationId: operationId(),
    action: "reopen",
    id: completed.id,
    expectedRevision: completed.revision,
    reason: "Authorized follow-up work",
  });
  assert.equal(
    (await nativeCall("contextory_entity_get", { id: work.milestone.id }))
      .entity.state,
    "active",
  );
});

test("startup failures release the service lock and restart marks jobs interrupted", async (t) => {
  const f = await fixture(t);
  const service = await startService(f);
  await assert.rejects(startService(f), { code: "SERVICE_BUSY" });
  service.app.ledger.db
    .prepare("INSERT INTO jobs VALUES (?,?,?)")
    .run("JOB-interrupted", "running", "{}");
  await service.close();
  const again = await startService(f);
  assert.equal(again.app.checks.job("JOB-interrupted").state, "interrupted");
  await again.close();
  const other = await fixture(t);
  await writeFile(
    join(other.storage, "service.lock"),
    JSON.stringify({ pid: 2147483646 }),
  );
  const recovered = await startService(other);
  await recovered.close();
});

test("source fingerprints include dirty/untracked contents without staging", async (t) => {
  const { root } = await fixture(t);
  const exec = promisify(execFile);
  const { sourceSnapshot } = await import("../../src/verification/workspace");
  await exec("git", ["init", root], { windowsHide: true });
  await exec("git", ["-C", root, "add", "main.ts"], { windowsHide: true });
  const first = await sourceSnapshot(root);
  await writeFile(join(root, "main.ts"), "changed");
  const dirty = await sourceSnapshot(root);
  assert.notEqual(first.hash, dirty.hash);
  await writeFile(join(root, "untracked.ts"), "new source");
  const untracked = await sourceSnapshot(root);
  assert.notEqual(dirty.hash, untracked.hash);
  const index = await exec("git", ["-C", root, "show", ":main.ts"], {
    windowsHide: true,
  });
  assert.match(index.stdout, /return 42/);
  assert.equal(
    await readFile(join(root, "untracked.ts"), "utf8"),
    "new source",
  );
});
