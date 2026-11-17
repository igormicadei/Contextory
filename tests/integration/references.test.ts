import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdir,
  writeFile,
  readFile,
  readdir,
  rename,
  symlink,
} from "node:fs/promises";
import { join } from "node:path";
import { Application } from "../../src/service/application";
import { Ledger } from "../../src/storage/ledger";
import { sourceSnapshot } from "../../src/verification/workspace";
import type { CodebaseInfo, FlowGraph } from "../../src/contracts/model";
import { application, fixture, agent, operationId } from "../helpers";

test("reference graphs stay isolated during parallel analysis, persist across restart and never write source", async (t) => {
  const f = await fixture(t);
  const roots = [join(f.directory, "legacy"), join(f.directory, "example")];
  for (const [i, root] of roots.entries()) {
    await mkdir(root);
    await writeFile(
      join(root, "main.ts"),
      `export function hello(){ return "reference-${i}"; } export function caller(){return hello()}`,
    );
    await writeFile(
      join(root, "README.md"),
      "# Guide\n[entry](main.ts#hello)\n",
    );
    await writeFile(
      join(root, "contextory.project.json"),
      JSON.stringify({
        schemaVersion: 1,
        name: `Reference ${i}`,
        conventions: ["Keep the legacy API stable"],
        entryPoints: ["main.ts"],
      }),
    );
  }
  const before = await Promise.all(roots.map((r) => sourceSnapshot(r)));
  const open = () =>
    new Application(
      new Ledger(join(f.storage, "project.sqlite3"), f.root),
      f.storage,
      f.workerPath,
      f.embeddingDirectory,
    );
  let app = open();
  f.cleanups.push(() => app.close());
  const call = (name: string, input: object) =>
    app.call(name, input, agent) as Promise<any>;
  app.ledger.create("decision", "hello current-only requirement", {
    choice: "Must never enter reference context",
    sources: [{ path: "main.ts", symbol: "hello" }],
  });
  const records = app.ledger.all();
  const refs = [] as CodebaseInfo[];
  for (const root of roots)
    refs.push(
      await call("contextory_codebase_change", {
        action: "add",
        root,
        operationId: operationId(),
      }),
    );
  assert.equal(
    (await call("contextory_codebase_list", {})).references.length,
    2,
  );
  assert.equal(app.brief().references.length, 2);
  const current = await app.codebase.refresh();
  const contexts = await Promise.all(
    [undefined, ...refs.map((r) => r.id)].map((codebaseId) =>
      call("contextory_code_context_get", {
        query: "hello",
        budgetTokens: 1500,
        codebaseId,
      }),
    ),
  );
  assert.ok(
    contexts[0].records.some((r: any) => r.title.includes("current-only")),
  );
  for (let i = 0; i < refs.length; i++) {
    const context = contexts[i + 1];
    assert.equal(context.codebase.id, refs[i].id);
    assert.equal(context.codebase.root, roots[i]);
    assert.equal(context.records.length, 0);
    assert.ok(context.symbols[0].excerpt.includes(`reference-${i}`));
    assert.ok(Buffer.byteLength(JSON.stringify(context)) <= 4500);
    const small = await call("contextory_code_context_get", {
      codebaseId: refs[i].id,
      query: "hello",
      budgetTokens: 512,
    });
    assert.ok(Buffer.byteLength(JSON.stringify(small)) <= 1536);
    const impact = await call("contextory_impact_get", {
      codebaseId: refs[i].id,
      id: "source:main.ts#hello",
    });
    assert.ok(impact.nodes.some((n: any) => n.title.includes("caller")));
    assert.ok(!impact.nodes.some((n: any) => n.kind === "decision"));
    const path = await call("contextory_code_path_get", {
      codebaseId: refs[i].id,
      from: "caller",
      to: "hello",
    });
    assert.equal(path.found, true);
    assert.equal(path.codebase.id, refs[i].id);
    const search = await call("contextory_search", {
      codebaseId: refs[i].id,
      query: "hello",
      mode: "lexical",
    });
    assert.ok(search.hits[0].excerpt.includes(`reference-${i}`));
    assert.equal(
      await app.resolveSource("main.ts", refs[i].id),
      join(roots[i], "main.ts"),
    );
  }
  assert.equal(app.codebase.status().snapshotId, current.snapshotId);
  assert.deepEqual(app.ledger.all(), records);
  const graph = (await call("contextory_flow_trace", {
    codebaseId: refs[0].id,
    root: { path: "main.ts", symbol: "caller" },
    view: "flow",
  })) as FlowGraph;
  assert.equal(graph.codebase?.id, refs[0].id);
  assert.ok(graph.nodes.some((n) => n.label.includes("hello")));
  const page = await call("contextory_flow_expand", {
    codebaseId: refs[0].id,
    graphId: graph.id,
    snapshotId: graph.snapshotId,
  });
  assert.equal(page.codebase.id, refs[0].id);
  await assert.rejects(
    call("contextory_flow_expand", {
      codebaseId: refs[1].id,
      graphId: graph.id,
      snapshotId: graph.snapshotId,
    }),
    { code: "STALE_GRAPH" },
  );
  await app.close();
  app = open();
  assert.deepEqual(
    app.references.list().map((r) => r.id),
    refs.map((r) => r.id),
  );
  assert.equal(
    (
      await call("contextory_code_architecture_get", {
        codebaseId: refs[0].id,
        refresh: false,
      })
    ).status.snapshotId,
    contexts[1].snapshotId,
  );
  assert.deepEqual(
    (
      await call("contextory_code_architecture_get", {
        codebaseId: refs[0].id,
        refresh: false,
      })
    ).conventions,
    ["Keep the legacy API stable"],
  );
  await writeFile(
    join(roots[0], "main.ts"),
    "export function changedReference(){}\n",
  );
  const changed = await call("contextory_code_context_get", {
    codebaseId: refs[0].id,
    query: "changedReference",
  });
  assert.ok(changed.symbols.some((s: any) => s.name === "changedReference"));
  assert.notEqual(changed.snapshotId, contexts[1].snapshotId);
  assert.equal(
    (await call("contextory_code_context_get", { query: "hello" })).symbols[0]
      .name,
    "hello",
  );
  const remove = {
    action: "remove",
    codebaseId: refs[0].id,
    operationId: operationId(),
  };
  await call("contextory_codebase_change", remove);
  await call("contextory_codebase_change", remove); // operation replay is safe
  await assert.rejects(
    call("contextory_code_architecture_get", { codebaseId: refs[0].id }),
    { code: "NOT_FOUND" },
  );
  await writeFile(
    join(roots[0], "main.ts"),
    'export function hello(){ return "reference-0"; } export function caller(){return hello()}',
  );
  for (let i = 0; i < roots.length; i++) {
    assert.equal((await sourceSnapshot(roots[i])).hash, before[i].hash);
    assert.deepEqual((await readdir(roots[i])).sort(), [
      "README.md",
      "contextory.project.json",
      "main.ts",
    ]);
  }
  assert.equal(
    await readFile(join(f.root, "main.ts"), "utf8"),
    "export function hello() { return 42; }\n",
  );
});

test("reference roots, aliases, missing sources and workflow boundaries are validated", async (t) => {
  const { app, root, storage, directory, call } = await application(t);
  const external = join(directory, "external");
  await mkdir(external);
  await writeFile(join(external, "main.ts"), "export function external(){}\n");
  for (const invalid of [
    root,
    directory,
    storage,
    join(root, "nested"),
    "../relative",
    join(root, "main.ts"),
    join(directory, "missing"),
  ]) {
    await assert.rejects(
      call("contextory_codebase_change", {
        action: "add",
        root: invalid,
        operationId: operationId(),
      }),
      { code: "INVALID_REFERENCE_ROOT" },
    );
  }
  const ref = (await call("contextory_codebase_change", {
    action: "add",
    root: external,
    name: "Legacy",
    operationId: operationId(),
  })) as CodebaseInfo;
  const alias = join(directory, "alias");
  await symlink(
    external,
    alias,
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.equal(
    (
      (await call("contextory_codebase_change", {
        action: "add",
        root: alias,
        operationId: operationId(),
      })) as CodebaseInfo
    ).id,
    ref.id,
  );
  assert.equal(app.references.list().length, 1);
  await assert.rejects(
    call("contextory_code_context_get", {
      codebaseId: "unknown",
      query: "hello",
    }),
    { code: "NOT_FOUND" },
  );
  await assert.rejects(
    call("contextory_code_context_get", {
      codebaseId: ref.id,
      query: "external",
      specId: "SPEC-current",
    }),
    { code: "INVALID_ARGUMENT" },
  );
  await assert.rejects(
    call("contextory_request_change", {
      codebaseId: ref.id,
      action: "create",
      title: "Must not write",
      description: "Reference scope",
      operationId: operationId(),
    }),
    { code: "INVALID_ARGUMENT" },
  );
  await assert.rejects(app.resolveSource("../project/main.ts", ref.id), {
    code: "INVALID_PATH",
  });
  await assert.rejects(
    call("contextory_code_index_refresh", {
      codebaseId: ref.id,
      graphifyPath: "../project/main.ts",
    }),
    { code: "INVALID_PATH" },
  );
  await rename(external, external + "-moved");
  await assert.rejects(
    call("contextory_code_architecture_get", { codebaseId: ref.id }),
    { code: "REFERENCE_UNAVAILABLE" },
  );
  assert.ok(
    ((await call("contextory_code_architecture_get", {})) as any).entryPoints
      .length,
  );
});

test("detach drains accepted reference queries without blocking current-project queries", async (t) => {
  const { app, directory, call } = await application(t);
  const root = join(directory, "legacy");
  await mkdir(root);
  const ref = (await call("contextory_codebase_change", {
    action: "add",
    root,
    operationId: operationId(),
  })) as CodebaseInfo;
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const query = app.references.use(ref.id, "python", async () => {
    await gate;
    return "finished";
  });
  const removed = call("contextory_codebase_change", {
    action: "remove",
    codebaseId: ref.id,
    operationId: operationId(),
  });
  assert.equal(app.references.list().length, 0);
  assert.equal(
    ((await call("contextory_codebase_list", {})) as any).current.id,
    "current",
  );
  finish();
  assert.equal(await query, "finished");
  await removed;
});

test("reference projections survive Windows-length editor storage paths", async (t) => {
  const f = await fixture(t);
  const storage = join(f.storage, "editor-storage-" + "nested".repeat(30));
  const root = join(f.directory, "reference");
  await mkdir(root);
  await writeFile(join(root, "main.ts"), "export function legacy(){}");
  const open = () =>
    new Application(
      new Ledger(join(storage, "project.sqlite3"), f.root),
      storage,
      f.workerPath,
      f.embeddingDirectory,
    );
  let app = open();
  f.cleanups.push(() => app.close());
  const ref = (await app.call(
    "contextory_codebase_change",
    { action: "add", root, operationId: operationId() },
    agent,
  )) as CodebaseInfo;
  assert.ok(
    join(storage, "references", ref.id, "projection.sqlite3").length > 260,
  );
  const first = (await app.call(
    "contextory_code_context_get",
    { codebaseId: ref.id, query: "legacy" },
    agent,
  )) as any;
  assert.equal(first.symbols[0].name, "legacy");
  await app.close();
  app = open();
  const saved = (await app.call(
    "contextory_code_architecture_get",
    { codebaseId: ref.id, refresh: false },
    agent,
  )) as any;
  assert.equal(saved.status.snapshotId, first.snapshotId);
});
