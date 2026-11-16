import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startService } from "../../src/service/server";
import { rpc } from "../../src/service/rpc";
import { fixture, operationId, claimed, waitJob } from "../helpers";
import type { Entity } from "../../src/contracts/model";
import { toolDefinitions } from "../../src/contracts/tools";
import {
  agentInstructions,
  completionNote,
  retrievalGuidance,
  retrievalReminder,
  workflowGuidance,
} from "../../src/agents/instructions";

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
    for (const event of ["SessionStart", "UserPromptSubmit", "PostCompact"]) {
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
