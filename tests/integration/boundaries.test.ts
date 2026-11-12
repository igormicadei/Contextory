import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { application, operationId } from "../helpers";
import { Embeddings, Knowledge } from "../../src/knowledge/search";
import type { Entity, FlowGraph } from "../../src/contracts/model";
test("chunking retains late explanations and historical revisions without stale search records", async (t) => {
  const { call, ledger } = await application(t);
  const request = (await call("contextory_request_change", {
    operationId: operationId(),
    action: "create",
    title: "Long record",
    description: "early ".repeat(1000) + "lateUnusualDecision",
  })) as Entity;
  const results = (await call("contextory_search", {
    query: "lateUnusualDecision",
    mode: "lexical",
  })) as { hits: { id: string; excerpt: string }[] };
  assert.equal(results.hits[0].id, request.id);
  assert.match(results.hits[0].excerpt, /lateUnusualDecision/);
  await assert.rejects(
    call("contextory_request_change", {
      operationId: operationId(),
      action: "revise",
      id: request.id,
      title: "Changed",
      description: "short",
      reason: "New scope",
    }),
    { code: "INVALID_ARGUMENT" },
  );
  await call("contextory_request_change", {
    operationId: operationId(),
    action: "revise",
    id: request.id,
    expectedRevision: request.revision,
    title: "Changed",
    description: "short",
    reason: "New scope",
  });
  assert.match(
    String(ledger.get(request.id, 1).data.description),
    /lateUnusualDecision/,
  );
  assert.equal(ledger.get(request.id).revision, 2);
});
test("unprepared semantic search degrades explicitly, with lexical records still usable", async (t) => {
  const { ledger, storage } = await application(t);
  ledger.create("request", "Offline fallback", {
    description: "Keep project records searchable",
  });
  const knowledge = new Knowledge(
    ledger,
    new Embeddings(join(storage, "not-prepared")),
  );
  assert.equal(
    (await knowledge.search("project records", "hybrid", 5)).degraded,
    true,
  );
  await assert.rejects(knowledge.search("project", "semantic", 5), {
    code: "SEMANTIC_UNAVAILABLE",
  });
});
test("worker cancellation recovers and source changes invalidate expansion handles", async (t) => {
  const { call, app, root } = await application(t);
  const input = { root: { path: "main.ts", symbol: "hello" }, view: "flow" };
  const pending = app.trace(input as Parameters<typeof app.trace>[0]);
  const rejected = assert.rejects(pending, { code: "CANCELLED" });
  await app.analysis.close();
  await rejected;
  const graph = (await call("contextory_flow_trace", input)) as FlowGraph;
  assert.ok(graph.nodes.length);
  await writeFile(join(root, "main.ts"), "export function hello(){return 44;}");
  await assert.rejects(
    call("contextory_flow_expand", {
      graphId: graph.id,
      snapshotId: graph.snapshotId,
      nodeId: graph.nodes[0].id,
    }),
    { code: "STALE_GRAPH" },
  );
});
test("native source analysis ignores injected overlays and rejects workspace escape", async (t) => {
  const { call } = await application(t);
  await assert.rejects(
    call("contextory_flow_trace", {
      root: { path: "../outside.ts", symbol: "hello" },
      view: "flow",
    }),
    { code: "INVALID_PATH" },
  );
  const graph = (await call("contextory_flow_trace", {
    root: { path: "main.ts", symbol: "hello" },
    view: "flow",
    overlays: { "main.ts": "function malicious(){}" },
  })) as FlowGraph;
  assert.equal(graph.unsaved, false);
  assert.ok(graph.nodes.some((node) => node.label === "hello"));
});
