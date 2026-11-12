import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SourceEngine } from "../../src/analysis/engine";
import { fixture } from "../helpers";
import type { FlowGraph } from "../../src/contracts/model";
const trace = (
  engine: SourceEngine,
  symbol: string,
  view: "calls" | "flow" = "calls",
) =>
  engine.trace({
    root: { path: "main.ts", symbol },
    view,
    limits: { timeoutMs: 10000 },
  });
function reachable(
  graph: FlowGraph,
  start: string,
  target: string,
  excluded: string[] = [],
) {
  const seen = new Set(excluded);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    if (current === target) return true;
    seen.add(current);
    queue.push(
      ...graph.edges.filter((e) => e.from === current).map((e) => e.to),
    );
  }
  return false;
}
test("five call hops, diamonds, recursion, many independent calls and exact size bounds", async (t) => {
  const { root } = await fixture(t);
  await writeFile(
    join(root, "main.ts"),
    `function root(){a();b();${Array.from({ length: 14 }, (_, i) => `leaf${i}();`).join("")}} function a(){c()} function b(){c()} function c(){d()} function d(){e()} function e(){f()} function f(){g()} function g(){root()} ${Array.from({ length: 14 }, (_, i) => `function leaf${i}(){}`).join("")}`,
  );
  const engine = new SourceEngine(root);
  const graph = trace(engine, "root");
  assert.equal(graph.nodes.filter((n) => n.label === "c").length, 1);
  assert.equal(
    graph.nodes.filter((n) => n.label.startsWith("leaf")).length,
    14,
  );
  assert.ok(graph.nodes.some((n) => n.label === "f"));
  assert.ok(!graph.nodes.some((n) => n.label === "g"));
  assert.ok(graph.frontier.some((f) => f.reason === "depth"));
  const recursive = engine.trace({
    root: { path: "main.ts", symbol: "g" },
    view: "calls",
    limits: { callDepth: 12, timeoutMs: 10000 },
  });
  assert.ok(recursive.edges.some((e) => e.label === "recursion"));
  const tiny = engine.trace({
    root: { path: "main.ts", symbol: "root" },
    view: "flow",
    limits: { nodes: 5, edges: 5, timeoutMs: 10000 },
  });
  assert.ok(tiny.nodes.length <= 5);
  assert.ok(tiny.edges.length <= 5);
  assert.ok(tiny.partial);
});
test("branches and returns preserve termination; finally executes on return", async (t) => {
  const { root } = await fixture(t);
  await writeFile(
    join(root, "main.ts"),
    "function start(x:boolean){if(x){return left()} right();} function left(){} function right(){} function cleanup(){} function guarded(){try{return left()}finally{cleanup()}}",
  );
  const engine = new SourceEngine(root);
  const graph = trace(engine, "start", "flow");
  const branch = graph.nodes.find((n) => n.kind === "branch")!;
  const terminal = graph.nodes.find((n) => n.kind === "return")!;
  const right = graph.nodes.find(
    (n) => n.kind === "call" && n.label === "right()",
  )!;
  assert.equal(
    graph.edges.filter((e) => e.from === branch.id && e.kind === "branch")
      .length,
    2,
  );
  assert.equal(reachable(graph, terminal.id, right.id), false);
  const guarded = trace(engine, "guarded", "flow");
  const ret = guarded.nodes.find((n) => n.kind === "return")!;
  const cleanups = guarded.nodes.filter(
    (n) => n.kind === "call" && n.label === "cleanup()",
  );
  const exit = guarded.nodes.find((n) => n.kind === "exit" && n.depth === 0)!;
  assert.ok(cleanups.some((n) => reachable(guarded, ret.id, n.id)));
  assert.equal(
    reachable(
      guarded,
      ret.id,
      exit.id,
      cleanups.map((n) => n.id),
    ),
    false,
  );
});
test("loops include initializer calls; imported aliases and unsaved overlays resolve", async (t) => {
  const { root } = await fixture(t);
  await writeFile(
    join(root, "lib.ts"),
    "export function helper(){ return 1; }",
  );
  await writeFile(
    join(root, "main.ts"),
    'import {helper as init} from "./lib"; function start(){for(let x=init(); x<2; x++){if(x)continue;}}',
  );
  const engine = new SourceEngine(root);
  const first = trace(engine, "start", "flow");
  assert.ok(first.nodes.some((n) => n.label === "helper"));
  assert.ok(first.nodes.some((n) => n.kind === "loop"));
  assert.ok(first.edges.some((e) => e.kind === "jump"));
  const overlay = engine.trace({
    root: { path: "main.ts", symbol: "start" },
    view: "flow",
    overlays: {
      "main.ts": "function changed(){} function start(){changed();}",
    },
    limits: { timeoutMs: 10000 },
  });
  assert.ok(overlay.unsaved);
  assert.ok(overlay.nodes.some((n) => n.label === "changed"));
  assert.notEqual(first.snapshotId, overlay.snapshotId);
  assert.doesNotThrow(() =>
    engine.trace({
      root: { path: "main.ts", position: { line: 0, character: 999999 } },
      view: "calls",
    }),
  );
});
