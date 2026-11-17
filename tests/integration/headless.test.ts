import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fixture } from "../helpers";
import { toolDefinitions } from "../../src/contracts/tools";
import { startService } from "../../src/service/server";
import {
  agentInstructions,
  retrievalGuidance,
  workflowGuidance,
} from "../../src/agents/instructions";

const exec = promisify(execFile),
  cli = resolve("dist/contextory.mjs");
test("headless CLI persists source knowledge and exposes impact, paths and architecture", async (t) => {
  const f = await fixture(t);
  const run = async (...args: string[]) =>
    JSON.parse(
      (
        await exec(
          process.execPath,
          [cli, ...args, "--root", f.root, "--storage", f.storage],
          { timeout: 30000, windowsHide: true },
        )
      ).stdout,
    );
  const first = await run("index");
  assert.equal(first.state, "ready");
  const context = await run("context", "hello", "--budget", "512");
  assert.equal(context.symbols[0].name, "hello");
  assert.ok(Buffer.byteLength(JSON.stringify(context)) <= 1536);
  const impact = await run("impact", "source:main.ts#hello");
  assert.ok(impact.subject.title.includes("hello"));
  const path = await run("path", "main.ts", "source:main.ts#hello");
  assert.equal(path.found, true);
  const architecture = await run("architecture");
  assert.equal(architecture.entryPoints[0].path, "main.ts");
  assert.equal(architecture.status.snapshotId, first.snapshotId);
  const referenceRoot = join(f.directory, "legacy-cli");
  await mkdir(referenceRoot);
  await writeFile(
    join(referenceRoot, "main.ts"),
    "export function legacyEntry(){}",
  );
  const ref = await run("reference-add", referenceRoot, "--name", "CLI legacy");
  assert.equal((await run("references")).references[0].id, ref.id);
  assert.equal(
    (await run("context", "legacyEntry", "--codebase", ref.id)).codebase.root,
    referenceRoot,
  );
  assert.equal(
    (await run("architecture", "--codebase", ref.id)).entryPoints[0].path,
    "main.ts",
  );
  await run("reference-remove", ref.id);
  assert.equal((await run("references")).references.length, 0);
  await assert.rejects(access(join(f.storage, "service.lock")));
});

test("standalone stdio MCP runs without editor clients and releases its service on EOF", async (t) => {
  const f = await fixture(t);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, "mcp", "--root", f.root, "--storage", f.storage],
    stderr: "pipe",
  });
  const client = new Client({ name: "generic-no-hooks", version: "1.0.0" });
  f.cleanups.push(() => client.close());
  await client.connect(transport);
  assert.equal(client.getInstructions(), agentInstructions);
  assert.deepEqual((await client.listTools()).tools, toolDefinitions());
  const briefResult = await client.callTool({
    name: "contextory_context_get",
    arguments: {},
  });
  assert.ok(!briefResult.isError, JSON.stringify(briefResult));
  const brief = JSON.parse((briefResult.content as { text: string }[])[0].text);
  assert.deepEqual(brief.retrieval, retrievalGuidance);
  assert.deepEqual(brief.workflow, workflowGuidance);
  const result = await client.callTool({
    name: "contextory_code_context_get",
    arguments: { query: "hello", budgetTokens: 512 },
  });
  assert.ok(!result.isError, JSON.stringify(result));
  const context = JSON.parse((result.content as { text: string }[])[0].text);
  assert.equal(context.symbols[0].name, "hello");
  const referenceRoot = join(f.directory, "reference");
  await mkdir(referenceRoot);
  await writeFile(
    join(referenceRoot, "main.ts"),
    "export function legacyEntry(){return 1}",
  );
  const added = await client.callTool({
    name: "contextory_codebase_change",
    arguments: {
      action: "add",
      root: referenceRoot,
      name: "Legacy",
      operationId: "headless-reference-add",
    },
  });
  assert.ok(!added.isError, JSON.stringify(added));
  const reference = JSON.parse((added.content as { text: string }[])[0].text);
  const scoped = await client.callTool({
    name: "contextory_code_context_get",
    arguments: { query: "legacyEntry", codebaseId: reference.id },
  });
  assert.ok(!scoped.isError, JSON.stringify(scoped));
  const referenceContext = JSON.parse(
    (scoped.content as { text: string }[])[0].text,
  );
  assert.equal(referenceContext.codebase.root, referenceRoot);
  assert.equal(referenceContext.symbols[0].name, "legacyEntry");
  await client.close();
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (
      await access(join(f.storage, "service.lock")).then(
        () => false,
        () => true,
      )
    )
      return;
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.fail("Headless service lock survived stdio EOF");
});

test("CLI attaches to a running service through its generic descriptor without stopping it", async (t) => {
  const f = await fixture(t),
    service = await startService({ ...f, headless: true });
  f.cleanups.push(() => service.close());
  const output = await exec(
    process.execPath,
    [
      cli,
      "context",
      "hello",
      "--root",
      f.root,
      "--descriptor",
      join(f.storage, "generic.json"),
    ],
    { timeout: 30000, windowsHide: true },
  );
  assert.equal(JSON.parse(output.stdout).symbols[0].name, "hello");
  assert.equal(service.app.dashboard().codebase?.state, "ready");
  await access(join(f.storage, "service.lock"));
});
