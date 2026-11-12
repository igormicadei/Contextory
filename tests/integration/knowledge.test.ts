import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { application, operationId, claimed } from "../helpers";
import type { Entity, RelationshipGraph } from "../../src/contracts/model";
test("lexical retrieval cites revisions and omits changed source; graph traversal terminates cycles", async (t) => {
  const { call, app, root } = await application(t);
  const record = (await call("contextory_request_change", {
    operationId: operationId(),
    action: "create",
    title: "Retry backoff",
    description: "Retry temporary network failures",
  })) as Entity;
  await writeFile(join(root, "main.ts"), "function uniqueRetryMarker() {}");
  await app.indexSources();
  const first = (await call("contextory_search", {
    query: "uniqueRetryMarker",
    mode: "lexical",
  })) as { hits: { source: unknown }[] };
  assert.equal(first.hits.length, 1);
  assert.ok(first.hits[0].source);
  await writeFile(join(root, "main.ts"), "function changed() {}");
  const stale = (await call("contextory_search", {
    query: "uniqueRetryMarker",
    mode: "lexical",
  })) as { hits: unknown[]; staleOmitted: number };
  assert.equal(stale.hits.length, 0);
  assert.equal(stale.staleOmitted, 1);
  const second = (await call("contextory_request_change", {
    operationId: operationId(),
    action: "create",
    title: "Circuit breaker",
    description: "Network protection",
  })) as Entity;
  for (const [from, to] of [
    [record.id, second.id],
    [second.id, record.id],
  ])
    await call("contextory_relationship_change", {
      operationId: operationId(),
      from,
      to,
      kind: "related_to",
      rationale: "Network reliability",
    });
  const impact = (await call("contextory_impact_get", {
    id: record.id,
    direction: "both",
  })) as { nodes: unknown[] };
  assert.equal(impact.nodes.length, 1);
});
test("relationship exploration returns readable records, source references and deduplicated bounded connections", async (t) => {
  const { call } = await application(t);
  const work = await claimed(call);
  await call("contextory_decision_record", {
    operationId: operationId(),
    specId: work.spec.id,
    leaseId: work.leaseId,
    title: "Preserve the public API",
    choice: "Keep the function signature stable",
    rationale: "Existing callers need the contract",
    consequences: "Changes stay inside the implementation",
  });
  await call("contextory_relationship_change", {
    operationId: operationId(),
    from: work.spec.id,
    source: { path: "main.ts", symbol: "hello" },
    kind: "implements",
    rationale: "The function implements this specification",
  });
  const graph = (await call("contextory_impact_get", {
    id: work.spec.id,
    direction: "both",
    depth: 5,
    limit: 50,
  })) as RelationshipGraph;
  assert.equal(graph.subject.title, "Implementation");
  assert.ok(graph.subject.sources.some((s) => s.path === "main.ts"));
  assert.ok(
    graph.nodes.some(
      (n) =>
        n.id === work.request.id &&
        n.title === "Feature" &&
        n.description === "Authorized feature",
    ),
  );
  assert.ok(
    graph.nodes.some(
      (n) =>
        n.title === "Preserve the public API" &&
        n.description.includes("Existing callers"),
    ),
  );
  assert.ok(
    graph.nodes.some(
      (n) =>
        n.kind === "source" &&
        n.title === "hello in main.ts" &&
        n.sources[0].symbol === "hello",
    ),
  );
  assert.equal(new Set(graph.edges.map((e) => e.id)).size, graph.edges.length);
  const bounded = (await call("contextory_impact_get", {
    id: work.spec.id,
    direction: "both",
    depth: 1,
    limit: 1,
  })) as RelationshipGraph;
  assert.equal(bounded.nodes.length, 1);
  assert.ok(bounded.partial);
  const ids = new Set([bounded.origin, ...bounded.nodes.map((n) => n.id)]);
  assert.ok(bounded.edges.every((e) => ids.has(e.source) && ids.has(e.target)));
});
test(
  "real local embeddings support semantic/hybrid retrieval and reject stale vectors",
  {
    skip: !existsSync(resolve(".contextory-local/embeddings/profile.json")),
    timeout: 60000,
  },
  async (t) => {
    const { call, app } = await application(t);
    const relevant = (await call("contextory_request_change", {
      operationId: operationId(),
      action: "create",
      title: "Credential renewal",
      description:
        "Refresh expired authentication tokens so signed-in users can continue their sessions",
    })) as Entity;
    await call("contextory_request_change", {
      operationId: operationId(),
      action: "create",
      title: "Color palette",
      description: "Choose blue and orange colors for the navigation sidebar",
    });
    const indexed = await app.knowledge.indexVectors();
    assert.equal(indexed.indexed, 2);
    const results = (await call("contextory_search", {
      query: "renew login credentials after expiry",
      mode: "semantic",
    })) as { hits: { id: string; via: string[] }[] };
    assert.equal(results.hits[0].id, relevant.id);
    assert.ok(results.hits[0].via.includes("semantic"));
    await call("contextory_request_change", {
      operationId: operationId(),
      action: "revise",
      id: relevant.id,
      expectedRevision: relevant.revision,
      title: "Credential renewal",
      description: "Changed contract",
      reason: "New request detail",
    });
    const stale = (await call("contextory_search", {
      query: "login credentials",
      mode: "semantic",
    })) as { hits: { id: string }[] };
    assert.ok(!stale.hits.some((hit) => hit.id === relevant.id));
  },
);
