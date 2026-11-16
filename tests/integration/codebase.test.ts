import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { application, fixture } from "../helpers";
import { importGraphify } from "../../src/codebase/import";
import { Ledger } from "../../src/storage/ledger";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

test("persistent graph resolves TS aliases, project paths, inheritance and stable declarations", async (t) => {
  const { app, root, ledger } = await application(t);
  await mkdir(join(root, "src"));
  await writeFile(
    join(root, "tsconfig.base.json"),
    JSON.stringify({
      compilerOptions: { baseUrl: ".", paths: { "@lib/*": ["src/*"] } },
    }),
  );
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({ extends: "./tsconfig.base.json" }),
  );
  await writeFile(
    join(root, "src/lib.ts"),
    "export interface Port { run():void } export class Base {} export function helper(){return 1}",
  );
  await writeFile(
    join(root, "main.ts"),
    'import {helper as help,Base,Port} from "@lib/lib"; export class Service extends Base implements Port {run(){help()}}',
  );
  const first = await app.codebase.refresh();
  const nodes = app.codebase.nodes(),
    edges = app.codebase.edges();
  const helper = nodes.find((n) => n.label === "helper")!,
    run = nodes.find((n) => n.qualifiedName === "Service.run")!;
  assert.ok(helper && run);
  assert.ok(
    edges.some(
      (e) =>
        e.source === run.id && e.target === helper.id && e.kind === "calls",
    ),
  );
  assert.ok(edges.some((e) => e.kind === "extends"));
  assert.ok(edges.some((e) => e.kind === "implements"));
  assert.equal(
    Number(ledger.db.prepare("PRAGMA user_version").get()!.user_version),
    4,
  );
  assert.equal((await app.codebase.refresh()).changedFiles, 0);
  await writeFile(
    join(root, "src/lib.ts"),
    "\n\nexport interface Port { run():void } export class Base {} export function helper(){return 1}",
  );
  assert.notEqual((await app.codebase.refresh()).snapshotId, first.snapshotId);
  assert.equal(
    app.codebase.nodes().find((n) => n.label === "helper")!.id,
    helper.id,
  );
  assert.equal(app.codebase.nodes().find((n) => n.label === "helper")!.line, 2);
});

test("task retrieval ranks definitions, links project memory, budgets context and traces contracts", async (t) => {
  const { app, root, ledger, call } = await application(t);
  await mkdir(join(root, "tests"));
  await writeFile(
    join(root, "main.ts"),
    'export function important(){return 1} export function caller(){important()} const client={call:(method:string)=>method}; export function send(){client.call("work.run")}',
  );
  await writeFile(
    join(root, "server.ts"),
    'export function dispatch(method:string){switch(method){case "work.run": return 42}}',
  );
  await writeFile(
    join(root, "tests/ref.test.ts"),
    'import {important} from "../main"; function testImportant(){important()}',
  );
  ledger.create("decision", "Keep important stable", {
    choice: "Preserve the API",
    sources: [{ path: "main.ts", symbol: "important" }],
  });
  await app.indexSources();
  const results = await app.codeQueries.search("important", "lexical", 5);
  assert.equal(results.hits[0].via[0], "definition");
  const context = await app.codeQueries.context(
    "important",
    [],
    undefined,
    1500,
  );
  assert.ok(context.symbols.some((s) => s.name === "important"));
  assert.ok(context.records.some((r) => r.title === "Keep important stable"));
  assert.ok(Buffer.byteLength(JSON.stringify(context)) <= context.budgetBytes);
  const impact = await app.codeQueries.impact(
    "source:main.ts#important",
    "reverse",
    2,
    30,
  );
  assert.ok(impact.nodes.some((n) => n.title.includes("caller")));
  assert.ok(impact.nodes.some((n) => n.title.includes("Keep important")));
  const path = await app.codeQueries.path("send", "dispatch", "forward", 3);
  assert.ok(path.found);
  assert.deepEqual(
    path.edges.map((e) => e.kind),
    ["sends", "handles"],
  );
  const tool = (await call("contextory_code_context_get", {
    query: "important",
    budgetTokens: 512,
  })) as typeof context;
  assert.ok(Buffer.byteLength(JSON.stringify(tool)) <= 512 * 3);
});

test("Graphify import retains provenance, rejects missing/outside endpoints and replaces an import", async (t) => {
  const { app, root } = await application(t);
  const graph = {
    graph: { schema_version: 1, graphify_version: "0.9.111" },
    nodes: [
      {
        id: "a",
        label: "externalLanguage",
        source_file: "main.ts",
        source_location: "L1",
      },
      { id: "b", label: "target", source_file: "main.ts" },
    ],
    links: [
      { source: "a", target: "b", relation: "calls", confidence: "INFERRED" },
    ],
  };
  await writeFile(join(root, "graph.json"), JSON.stringify(graph));
  await importGraphify(app.codebase, "graph.json");
  assert.ok(
    app.codebase
      .edges()
      .some(
        (e) => e.extractor === "graphify-0.9.111" && e.category === "inferred",
      ),
  );
  graph.nodes[0].label = "changedImported";
  await writeFile(join(root, "graph.json"), JSON.stringify(graph));
  await importGraphify(app.codebase, "graph.json");
  assert.ok(!app.codebase.nodes().some((n) => n.label === "externalLanguage"));
  const before = app.codebase.status().snapshotId;
  graph.nodes[0].source_file = "../outside.ts";
  await writeFile(join(root, "graph.json"), JSON.stringify(graph));
  await assert.rejects(importGraphify(app.codebase, "graph.json"), {
    code: "INVALID_PATH",
  });
  assert.equal(app.codebase.status().snapshotId, before);
});

test("isolated Python graph resolves imports, aliases, instance methods and test references", async (t) => {
  const { app, root } = await application(t);
  await writeFile(
    join(root, "lib.py"),
    "def helper():\n    return 1\nclass Service:\n    def run(self):\n        return helper()\n",
  );
  await writeFile(
    join(root, "test_service.py"),
    "from lib import Service as S\ndef test_run():\n    value=S()\n    return value.run()\n",
  );
  await app.codebase.refresh();
  const nodes = app.codebase.nodes(),
    edges = app.codebase.edges();
  const run = nodes.find((n) => n.qualifiedName === "Service.run")!,
    test = nodes.find((n) => n.label === "test_run")!;
  assert.ok(run && test);
  assert.ok(
    edges.some(
      (e) => e.source === test.id && e.target === run.id && e.kind === "calls",
    ),
  );
  assert.ok(edges.some((e) => e.source === run.id && e.kind === "calls"));
});

test("manifest exclusions, documents, renames, deletions and failed config preserve coherent snapshots", async (t) => {
  const { app, root } = await application(t);
  await writeFile(join(root, "ignored.ts"), "export function hidden(){}");
  await writeFile(
    join(root, "README.md"),
    "# Architecture\n[implementation](main.ts#hello)\n",
  );
  await writeFile(
    join(root, "contextory.project.json"),
    JSON.stringify({
      schemaVersion: 1,
      exclude: ["ignored.ts"],
      entryPoints: ["main.ts"],
    }),
  );
  await app.codebase.refresh();
  assert.ok(!app.codebase.nodes().some((n) => n.label === "hidden"));
  assert.ok(app.codebase.edges().some((e) => e.kind === "documents"));
  await rename(join(root, "main.ts"), join(root, "renamed.ts"));
  await app.codebase.refresh();
  assert.ok(!app.codebase.nodes().some((n) => n.path === "main.ts"));
  await unlink(join(root, "renamed.ts"));
  const before = await app.codebase.refresh();
  await writeFile(
    join(root, "contextory.project.json"),
    '{"include":["../outside"]}',
  );
  await assert.rejects(app.codebase.refresh(), {
    code: "INVALID_PROJECT_CONFIG",
  });
  assert.equal(app.codebase.status().snapshotId, before.snapshotId);
  assert.equal(app.codebase.status().state, "failed");
});

test("Graphify facts are invalidated by unsupported-language edits and rejected imports preserve saved bytes", async (t) => {
  const { app, root, ledger } = await application(t);
  await writeFile(join(root, "lib.rs"), "fn run() {}\n");
  const graph = {
    graph: { schema_version: 1 },
    nodes: [{ id: "rust", label: "rustRun", source_file: "lib.rs" }],
    edges: [],
  };
  await writeFile(join(root, "graph.json"), JSON.stringify(graph));
  await importGraphify(app.codebase, "graph.json");
  const saved = String(
    ledger.db.prepare("SELECT data FROM code_imports").get()!.data,
  );
  assert.ok(app.codebase.nodes().some((n) => n.label === "rustRun"));
  await writeFile(join(root, "lib.rs"), "fn different() {}\n");
  await app.codebase.refresh();
  assert.ok(!app.codebase.nodes().some((n) => n.label === "rustRun"));
  assert.ok(app.codebase.status().gaps.some((g) => g.includes("stale")));
  await writeFile(join(root, "contextory.project.json"), '{"unknown":true}');
  await assert.rejects(importGraphify(app.codebase, "graph.json"), {
    code: "INVALID_PROJECT_CONFIG",
  });
  assert.equal(
    String(ledger.db.prepare("SELECT data FROM code_imports").get()!.data),
    saved,
  );
  await unlink(join(root, "contextory.project.json"));
  await writeFile(
    join(root, "graph.json"),
    JSON.stringify({ ...graph, edges: [{ source: "rust" }] }),
  );
  await assert.rejects(importGraphify(app.codebase, "graph.json"), {
    code: "INVALID_GRAPHIFY",
  });
});

test("Python shadowed and duplicate symbols never invent call edges and parsing never executes modules", async (t) => {
  const { app, root } = await application(t);
  await writeFile(
    join(root, "lib.py"),
    "raise RuntimeError('must not execute')\ndef run(): pass\n",
  );
  await writeFile(
    join(root, "main.py"),
    "from lib import run\ndef real(): return run()\ndef shadow(run): return run()\ndef assigned():\n    run = None\n    return run()\ndef dup(): pass\ndef dup(): pass\ndef ambiguous(): return dup()\n",
  );
  await app.codebase.refresh();
  const nodes = app.codebase.nodes(),
    edges = app.codebase.edges(),
    byName = (name: string) =>
      nodes.find((n) => n.path === "main.py" && n.qualifiedName === name)!.id;
  assert.ok(
    edges.some((e) => e.source === byName("real") && e.kind === "calls"),
  );
  for (const name of ["shadow", "assigned", "ambiguous"])
    assert.ok(
      !edges.some((e) => e.source === byName(name) && e.kind === "calls"),
      name,
    );
  assert.ok(
    app.codebase.status().gaps.some((g) => g.includes("duplicate declaration")),
  );
  assert.ok(
    app.codebase.status().gaps.some((g) => g.includes("external or dynamic")),
  );
});

test("concurrent freshness requests recheck changes made during extraction and briefs use cached orientation", async (t) => {
  const { app, root } = await application(t);
  const extracting = app.codebase.refresh();
  // Wait until the first snapshot has read its files and dispatched extraction.
  await new Promise((r) => setTimeout(r, 100));
  await writeFile(
    join(root, "main.ts"),
    "export function changedDuringBuild(){}\n",
  );
  await Promise.all([extracting, app.codebase.fresh()]);
  assert.ok(app.codebase.nodes().some((n) => n.label === "changedDuringBuild"));
  app.codeQueries.architecture = () => {
    throw new Error("Brief must not traverse graph");
  };
  const start = performance.now(),
    brief = app.brief();
  assert.ok(
    brief.architecture.entryPoints?.some(
      (p: { path: string }) => p.path === "main.ts",
    ),
  );
  assert.ok(performance.now() - start < 450);
});

test("schema 3 migration preserves authoritative records and persists rebuildable graph tables", async (t) => {
  const f = await fixture(t),
    path = join(f.storage, "migration.sqlite3");
  let ledger = new Ledger(path, f.root);
  const request = ledger.create("request", "Preserved contract", {
    description: "Before code intelligence",
  });
  ledger.db.exec(
    "DROP TABLE code_edges; DROP TABLE code_nodes; DROP TABLE code_files; DROP TABLE code_imports; PRAGMA user_version=3;",
  );
  ledger.close();
  ledger = new Ledger(path, f.root);
  f.cleanups.push(async () => ledger.close());
  assert.equal(
    ledger.get(request.id).data.description,
    "Before code intelligence",
  );
  assert.equal(ledger.get(request.id, 1).title, "Preserved contract");
  assert.equal(
    Number(ledger.db.prepare("PRAGMA user_version").get()!.user_version),
    4,
  );
  assert.equal(
    ledger.db.prepare("SELECT count(*) AS n FROM code_nodes").get()!.n,
    0,
  );
});

test("an explicitly opened workspace inside an ignored parent repository still indexes its own source", async (t) => {
  const { app, directory, root } = await application(t);
  const exec = promisify(execFile);
  await exec("git", ["-C", directory, "init"], { windowsHide: true });
  await writeFile(join(directory, ".gitignore"), "project/\n");
  const status = await app.codebase.refresh();
  assert.ok(status.files > 0);
  assert.ok(
    app.codebase
      .nodes()
      .some((n) => n.path === "main.ts" && n.label === "hello"),
  );
  assert.equal(
    (await app.codeQueries.context("hello", [], undefined, 512)).symbols[0]
      .path,
    "main.ts",
  );
  assert.ok(root.startsWith(directory));
});

test("class context favors callable members over local-variable seeds and reserves relationship evidence", async (t) => {
  const { app, root } = await application(t);
  await writeFile(
    join(root, "main.ts"),
    "export class Engine { first(){ const incidentalOne=1;return incidentalOne } second(){ const incidentalTwo=2;return incidentalTwo } third(){return this.first()} }",
  );
  const context = await app.codeQueries.context("Engine", [], undefined, 1500);
  assert.equal(context.symbols[0].name, "Engine");
  assert.ok(context.symbols.some((s) => s.kind === "method"));
  assert.ok(
    !context.symbols.some(
      (s) => s.name.includes("incidental") && s.reason === "query",
    ),
  );
  assert.ok(context.relationships.some((e) => e.kind === "contains"));
  assert.ok(Buffer.byteLength(JSON.stringify(context)) <= context.budgetBytes);
});
