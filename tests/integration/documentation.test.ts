import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, cp, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  application,
  fixture,
  claimed,
  operationId,
  waitJob,
} from "../helpers";
import { startService } from "../../src/service/server";
import { rpc } from "../../src/service/rpc";
import { DocumentationManager } from "../../src/documentation/manager";
import { tools } from "../../src/contracts/tools";
import { agent } from "../helpers";

const bi = (en: string, pt: string) => ({ en, "pt-BR": pt });
async function run(
  call: (name: string, args: object) => Promise<any>,
  args: object,
) {
  const queued = await call("contextory_docs_run", {
    operationId: operationId(),
    ...args,
  });
  const job = (await waitJob(call, queued.jobId)) as any;
  return { ...job, jobId: queued.jobId };
}
async function authored(
  f: Awaited<ReturnType<typeof application>>,
  work: Awaited<ReturnType<typeof claimed>>,
) {
  await mkdir(join(f.root, "lib"));
  await writeFile(
    join(f.root, "lib/hello.py"),
    '"""PT-BR: Saudações configuradas. EN: Configured greetings."""\n\ndef hello():\n    """PT-BR: Retorna a saudação. EN: Return the greeting."""\n    return "hello"\n',
  );
  const lease = { specId: work.spec.id, leaseId: work.leaseId };
  const initialized = await run(f.call, {
    ...lease,
    action: "init",
    name: "Greeting Kit",
    kind: "library",
    sourceRoots: ["lib"],
  });
  assert.equal(initialized.state, "passed", JSON.stringify(initialized));
  const path = join(f.root, ".documentation/project.json"),
    corpus = JSON.parse(await readFile(path, "utf8"));
  const map = await run(f.call, { action: "map" });
  corpus.draft = false;
  corpus.audit = {
    featuresReviewed: true,
    reviewedSourceFingerprint: map.data.result.sourceFingerprint,
  };
  corpus.features = [
    {
      id: "greeting",
      name: bi("Configured greeting", "Saudação configurada"),
      sources: [{ path: "lib/hello.py", line: 3 }],
      pages: ["quickstart"],
    },
  ];
  for (const page of corpus.pages) {
    page.sources = [{ path: "lib/hello.py", line: 3 }];
    page.sections[0].blocks = [
      {
        type: "paragraph",
        text: bi(
          "The hello function returns the configured greeting without changing project state.",
          "A função hello retorna a saudação configurada sem alterar o estado do projeto.",
        ),
      },
    ];
  }
  await writeFile(path, JSON.stringify(corpus, null, 2));
  return { lease, path, corpus };
}

test("bundled guidance and source explanations work without Python; runtime failures do not block the service", async (t) => {
  const f = await application(t);
  assert.equal(
    ((await f.call("contextory_docs_get", {})) as any).state,
    "missing",
  );
  const guidance = (await f.call("contextory_docs_get", {
    section: "guidance",
    query: "carbon-design",
    limit: 50,
  })) as any;
  assert.ok(guidance.total > 0);
  const tokens = (await f.call("contextory_docs_get", {
    section: "guidance",
    resource:
      "modules/carbon-design/internal-skills/guia-visual-carbon/tokens/themes.css",
    limit: 50,
  })) as any;
  assert.match(tokens.text, /--cds-/);
  assert.equal(guidance.provenance.softwareDocumentation, "1.0.1");
  const guide = (await f.call("contextory_docs_get", {
    section: "guidance",
    resource:
      "modules/software-documentation/skills/documentar-software/SKILL.md",
    limit: 1,
  })) as any;
  assert.equal(guide.text.length, 400);
  assert.equal(guide.nextOffset, 1);
  await assert.rejects(
    f.call("contextory_docs_get", {
      section: "guidance",
      resource: "../../package.json",
    }),
    { code: "INVALID_PATH" },
  );
  f.app.codebase.pythonExecutable = join(f.root, "missing-python");
  const args = { operationId: operationId(), action: "map" };
  const first = (await f.call("contextory_docs_run", args)) as any;
  const failed = (await waitJob(f.call, first.jobId)) as any;
  assert.equal(failed.state, "failed");
  assert.match(failed.data.error, /Python 3.11/);
  assert.ok(((await f.call("contextory_context_get", {})) as any).root);
  f.app.codebase.pythonExecutable = "python";
  assert.equal(
    ((await f.call("contextory_docs_run", args)) as any).jobId,
    first.jobId,
  );
  assert.equal(
    (
      (await f.call("contextory_docs_get", {
        section: "job",
        jobId: first.jobId,
      })) as any
    ).state,
    "failed",
  );
  const mapped = await run(f.call, { action: "map", limit: 1 });
  assert.equal(mapped.state, "passed");
  assert.equal(mapped.data.result.files.length, 1);
  await assert.rejects(
    f.call("contextory_docs_run", {
      operationId: operationId(),
      action: "init",
      name: "X",
      kind: "library",
    }),
    { code: "LEASE_REQUIRED" },
  );
  await assert.rejects(
    f.call("contextory_docs_run", {
      operationId: operationId(),
      action: "map",
      codebaseId: "foreign",
    }),
    { code: "INVALID_ARGUMENT" },
  );
});

test("isolated bundled runtime validates/builds Carbon, preserves a corpus, exports consumers and detects stale explanations", async (t) => {
  const f = await application(t),
    work = await claimed(f.call);
  const { lease, path, corpus } = await authored(f, work);
  const valid = await run(f.call, { action: "validate" });
  assert.equal(valid.state, "passed");
  assert.equal(valid.data.result.valid, true, JSON.stringify(valid));
  const built = await run(f.call, { ...lease, action: "build" });
  assert.equal(built.state, "passed", JSON.stringify(built));
  const html = await readFile(
    join(f.root, ".documentation/site/en/overview.html"),
    "utf8",
  );
  assert.match(html, /carbon/);
  assert.match(html, /IBM|Plex|site.css/);
  await access(
    join(f.root, ".documentation/site/assets/fonts/IBMPlexSans-Regular.woff2"),
  );
  const initial = (await f.call("contextory_docs_get", {
    section: "sections",
    pageId: "quickstart",
    locale: "pt-BR",
  })) as any;
  assert.match(initial.sections[0].text, /saudação/);
  assert.equal(initial.sections[0].freshness.state, "current");
  assert.equal(initial.sections[0].sources[0].line, 2);
  const beforeAssociation = (await f.call("contextory_code_context_get", {
    query: "greeting",
    paths: ["lib/hello.py"],
    specId: work.spec.id,
    budgetTokens: 3000,
  })) as any;
  assert.ok(
    beforeAssociation.documentation?.sections.length,
    "A new spec retrieves relevant explanations before explicit record associations exist",
  );
  assert.ok(Buffer.byteLength(JSON.stringify(beforeAssociation)) <= 9000);
  const linkArgs = {
    ...lease,
    operationId: operationId(),
    pageId: "quickstart",
    sectionId: "guide",
    recordIds: [work.spec.id],
    corpusFingerprint: initial.corpusFingerprint,
    reason: "Compared the explanation and current greeting implementation",
  };
  await f.call("contextory_docs_link", linkArgs);
  const linked = (await f.call("contextory_docs_get", {
    section: "sections",
    recordId: work.spec.id,
  })) as any;
  assert.equal(linked.total, 1);
  assert.equal(linked.sections[0].records[0].id, work.spec.id);
  const requestDocs = (await f.call("contextory_docs_get", {
    section: "sections",
    recordId: work.request.id,
  })) as any;
  assert.equal(requestDocs.total, 1);
  assert.equal(
    linked.sections[0].records[0].linkedRevision,
    work.spec.revision,
  );
  const context = (await f.call("contextory_code_context_get", {
    query: "greeting",
    paths: ["lib/hello.py"],
    budgetTokens: 3000,
  })) as any;
  assert.ok(context.documentation?.sections.length);
  assert.ok(Buffer.byteLength(JSON.stringify(context)) <= 9000);
  const integrated = await run(f.call, { ...lease, action: "integrations" });
  assert.equal(integrated.state, "passed", JSON.stringify(integrated));
  await writeFile(
    join(f.root, "README.md"),
    "Keep this authored introduction.\n",
  );
  const readmePreview = await run(f.call, {
    action: "readme",
    siteUrl: "https://example.invalid/greeting/",
  });
  assert.equal(readmePreview.data.result.applied, false);
  assert.equal(
    await readFile(join(f.root, "README.md"), "utf8"),
    "Keep this authored introduction.\n",
  );
  const readmeApplied = await run(f.call, {
    ...lease,
    action: "readme",
    siteUrl: "https://example.invalid/greeting/",
    apply: true,
  });
  assert.equal(readmeApplied.data.result.applied, true);
  assert.match(
    await readFile(join(f.root, "README.md"), "utf8"),
    /^Keep this authored introduction\./,
  );
  for (const action of ["pages_plan", "pages_status"]) {
    const unavailable = await run(f.call, { action });
    assert.equal(unavailable.state, "passed", JSON.stringify(unavailable));
    assert.equal(unavailable.data.result.status, "needs_repository");
  }
  const preserved = await readFile(path, "utf8");
  const duplicate = await run(f.call, {
    ...lease,
    action: "init",
    name: "Greeting Kit",
    kind: "library",
  });
  assert.equal(duplicate.state, "failed");
  assert.equal(await readFile(path, "utf8"), preserved);
  const bundle = join(f.directory, "portable-documentation");
  await cp(resolve("dist/documentation"), bundle, { recursive: true });
  const independent = new DocumentationManager(
    f.app.workflow,
    bundle,
    f.storage,
  );
  f.cleanups.push(() => independent.close());
  const queued = independent.run(
    tools.contextory_docs_run.schema.parse({
      operationId: operationId(),
      action: "validate",
    }),
    agent,
    "python",
  );
  assert.equal(
    ((await waitJob(f.call, queued.jobId)) as any).data.result.valid,
    true,
  );
  await writeFile(
    join(f.root, "lib/hello.py"),
    '"""PT-BR: Mudou. EN: Changed."""\n',
  );
  const stale = (await f.call("contextory_docs_get", {
    section: "sections",
    recordId: work.spec.id,
  })) as any;
  assert.equal(stale.sections[0].freshness.state, "stale");
  assert.deepEqual(stale.sections[0].freshness.changed, ["lib/hello.py"]);
  corpus.pages.find(
    (p: any) => p.id === "quickstart",
  ).sections[0].blocks[0].text = bi("Updated text", "Texto atualizado");
  await writeFile(path, JSON.stringify(corpus));
  const changed = (await f.call("contextory_docs_get", {
    section: "sections",
    recordId: work.spec.id,
  })) as any;
  assert.match(
    changed.sections[0].freshness.changed.join(" "),
    /text or citations/,
  );
  const recovered = (await f.call("contextory_docs_link", linkArgs)) as any;
  assert.equal(recovered.corpusFingerprint, initial.corpusFingerprint);
  await assert.rejects(
    f.call("contextory_docs_link", { ...linkArgs, operationId: operationId() }),
    { code: "REVISION_CONFLICT" },
  );
  const invalid = await run(f.call, { action: "validate" });
  assert.equal(invalid.data.result.valid, false);
  const blocked = await run(f.call, { ...lease, action: "build" });
  assert.equal(blocked.state, "failed");
});

test("migration preview preserves schema 1 and apply backs up authored content without publication", async (t) => {
  const f = await application(t),
    work = await claimed(f.call),
    { lease, path, corpus } = await authored(f, work);
  corpus.schemaVersion = 1;
  delete corpus.designSystem;
  delete corpus.navigation;
  const legacy = JSON.stringify(corpus);
  await writeFile(path, legacy);
  const preview = await run(f.call, { action: "migrate" });
  assert.equal(preview.state, "passed", JSON.stringify(preview));
  assert.equal(await readFile(path, "utf8"), legacy);
  const migrated = await run(f.call, {
    ...lease,
    action: "migrate",
    apply: true,
  });
  assert.equal(migrated.state, "passed", JSON.stringify(migrated));
  const current = JSON.parse(await readFile(path, "utf8"));
  assert.equal(current.schemaVersion, 2);
  assert.equal(current.draft, true);
  assert.deepEqual(current.pages, corpus.pages);
  await assert.rejects(
    f.call("contextory_docs_run", {
      ...lease,
      operationId: operationId(),
      action: "pages_publish",
    }),
    { code: "PUBLICATION_REQUIRED" },
  );
});

test("documentation tools are available over headless MCP with project and hook boundaries", async (t) => {
  const f = await fixture(t),
    service = await startService({ ...f, headless: true });
  f.cleanups.push(() => service.close());
  const client = new Client({ name: "embedded-docs", version: "1" });
  f.cleanups.push(() => client.close());
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [
        resolve("dist/contextory.mjs"),
        "mcp",
        "--root",
        f.root,
        "--descriptor",
        join(f.storage, "generic.json"),
      ],
      stderr: "pipe",
    }),
  );
  const catalog = (await client.listTools()).tools;
  assert.equal(
    catalog.find((t) => t.name === "contextory_docs_get")?.annotations
      ?.readOnlyHint,
    true,
  );
  assert.ok(catalog.some((t) => t.name === "contextory_docs_run"));
  assert.ok(catalog.some((t) => t.name === "contextory_docs_link"));
  const result = await client.callTool({
    name: "contextory_docs_get",
    arguments: {
      section: "guidance",
      query: "software-documentation/skills",
      limit: 10,
    },
  });
  assert.ok(!result.isError, JSON.stringify(result));
  assert.match(JSON.stringify(result), /documentar-software/);
  await assert.rejects(
    rpc(join(f.storage, "codex-hook.json"), "tools/call", {
      name: "contextory_docs_run",
      arguments: { operationId: operationId(), action: "map" },
    }),
    { code: "FORBIDDEN" },
  );
  const wrong = await client.callTool({
    name: "contextory_docs_get",
    arguments: { projectId: "foreign" },
  });
  assert.equal(wrong.isError, true);
});
