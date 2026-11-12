import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { application, human } from "../helpers";
import type { FlowGraph } from "../../src/contracts/model";

function reachable(
  g: FlowGraph,
  from: string,
  to: string,
  excluded: string[] = [],
) {
  const seen = new Set(excluded),
    queue = [from];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    if (id === to) return true;
    seen.add(id);
    queue.push(...g.edges.filter((e) => e.from === id).map((e) => e.to));
  }
  return false;
}
test("Python works through agent tools without an editor or importing workspace code", async (t) => {
  const { call, root } = await application(t);
  await writeFile(
    join(root, "main.py"),
    'raise RuntimeError("must never execute")\ndef main():\n    print_2(val="Hello, world!")\n\ndef print_2(val: str) -> None:\n    print(val)\n',
  );
  const graph = (await call("contextory_flow_trace", {
    root: { path: "main.py", symbol: "main" },
    view: "flow",
  })) as FlowGraph;
  assert.match(graph.engine, /python-ast/);
  assert.ok(
    graph.nodes.some((n) => n.kind === "function" && n.label === "print_2"),
  );
  assert.ok(
    graph.frontier.some((f) => f.reason.includes("external target: print")),
  );
  assert.ok(
    graph.edges.every(
      (e) =>
        graph.nodes.some((n) => n.id === e.from) &&
        graph.nodes.some((n) => n.id === e.to),
    ),
  );
});
test("Python resolves workspace imports, aliases and instance methods; depth expansion advances and overlays invalidate snapshots", async (t) => {
  const { call, root } = await application(t);
  await mkdir(join(root, "pkg"));
  await writeFile(join(root, "pkg", "__init__.py"), "");
  await writeFile(
    join(root, "pkg", "helpers.py"),
    "class Worker:\n    def work(self):\n        leaf()\ndef leaf():\n    return 1\ndef helper():\n    worker = Worker()\n    return worker.work()\n",
  );
  await writeFile(
    join(root, "main.py"),
    "from pkg.helpers import helper as run\ndef main():\n    return run()\n",
  );
  const input = {
    root: { path: "main.py", symbol: "main" },
    view: "flow",
    limits: { callDepth: 0 },
  };
  const graph = (await call("contextory_flow_trace", input)) as FlowGraph;
  const frontier = graph.frontier.find((f) => f.target)!;
  assert.equal(frontier.target?.symbol, "helper");
  const expanded = (await call("contextory_flow_expand", {
    graphId: graph.id,
    snapshotId: graph.snapshotId,
    nodeId: frontier.nodeId,
    limits: { callDepth: 5 },
  })) as FlowGraph;
  assert.ok(expanded.nodes.some((n) => n.label === "Worker.work"));
  assert.ok(expanded.nodes.some((n) => n.label === "leaf"));
  const overlaid = (await call(
    "contextory_flow_trace",
    {
      ...input,
      overlays: {
        "main.py":
          "def changed():\n    return 1\ndef main():\n    return changed()\n",
      },
      limits: { callDepth: 5 },
    },
    human,
  )) as FlowGraph;
  assert.ok(overlaid.unsaved);
  assert.notEqual(overlaid.snapshotId, graph.snapshotId);
  assert.ok(overlaid.nodes.some((n) => n.label === "changed"));
  await writeFile(
    join(root, "pkg", "helpers.py"),
    "def helper():\n    return 2\n",
  );
  await assert.rejects(
    call("contextory_flow_expand", {
      graphId: graph.id,
      snapshotId: graph.snapshotId,
      nodeId: frontier.nodeId,
    }),
    { code: "STALE_GRAPH" },
  );
});
test("Python branches terminate, finally runs on return, loops and recursive calls remain bounded", async (t) => {
  const { call, root } = await application(t);
  await writeFile(
    join(root, "main.py"),
    "def left():\n    return 1\ndef right():\n    return 2\ndef cleanup():\n    pass\ndef main(ok):\n    if ok:\n        return left()\n    right()\ndef guarded():\n    try:\n        return left()\n    except ValueError:\n        right()\n    finally:\n        cleanup()\ndef loop(items):\n    for item in items:\n        if item:\n            continue\n        else:\n            break\n    loop(items)\n",
  );
  const run = (symbol: string, limits = {}) =>
    call("contextory_flow_trace", {
      root: { path: "main.py", symbol },
      view: "flow",
      limits,
    }) as Promise<FlowGraph>;
  const g = await run("main");
  const ret = g.nodes.find((n) => n.kind === "return" && n.depth === 0)!;
  const right = g.nodes.find(
    (n) => n.kind === "call" && n.label === "right()",
  )!;
  assert.equal(reachable(g, ret.id, right.id), false);
  const guarded = await run("guarded");
  const returning = guarded.nodes.find(
    (n) => n.kind === "return" && n.depth === 0,
  )!;
  const cleanups = guarded.nodes.filter(
    (n) => n.kind === "call" && n.label === "cleanup()",
  );
  const exit = guarded.nodes.find(
    (n) => n.kind === "exit" && n.label === "return / function exit",
  )!;
  assert.ok(cleanups.some((n) => reachable(guarded, returning.id, n.id)));
  assert.equal(
    reachable(
      guarded,
      returning.id,
      exit.id,
      cleanups.map((n) => n.id),
    ),
    false,
  );
  const loop = await run("loop");
  assert.ok(loop.nodes.some((n) => n.kind === "loop"));
  assert.ok(loop.edges.some((e) => e.label === "recursion"));
  const tiny = await run("guarded", { nodes: 5, edges: 5 });
  assert.ok(tiny.partial && tiny.nodes.length <= 5 && tiny.edges.length <= 5);
});
test("Python incoming calls and parameter dispatch preserve explicit analysis boundaries", async (t) => {
  const { call, root } = await application(t);
  await writeFile(
    join(root, "main.py"),
    "def leaf():\n    pass\ndef caller():\n    leaf()\ndef dynamic(leaf):\n    leaf()\n",
  );
  const g = (await call("contextory_flow_trace", {
    root: { path: "main.py", symbol: "leaf" },
    view: "calls",
    direction: "incoming",
  })) as FlowGraph;
  assert.ok(g.nodes.some((n) => n.label === "caller"));
  assert.ok(!g.nodes.some((n) => n.label === "dynamic"));
  assert.ok(g.partial);
  const dynamic = (await call("contextory_flow_trace", {
    root: { path: "main.py", symbol: "dynamic" },
    view: "calls",
  })) as FlowGraph;
  assert.ok(dynamic.frontier.some((f) => f.reason.includes("Unresolved")));
});
