import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative } from "node:path";
import { Application } from "../src/service/application";
import { Ledger } from "../src/storage/ledger";

async function main() {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), "contextory-evaluation-")),
  );
  const root = join(directory, "project"),
    storage = join(directory, "storage");
  await mkdir(root);
  await mkdir(storage);
  const corpus: Record<string, string> = {
    "contextory.project.json": JSON.stringify({
      schemaVersion: 1,
      name: "Checkout evaluation",
      entryPoints: ["src/main.ts"],
    }),
    "src/payments/gateway.ts":
      "export function chargePayment(orderId:string){return orderId} export function refundPayment(id:string){return id}",
    "src/orders/checkout.ts":
      'import {chargePayment as charge} from "../payments/gateway"; export function checkout(id:string){return charge(id)}',
    "src/main.ts":
      'import {checkout} from "./orders/checkout"; export function main(){return checkout("order-1")}',
    "tests/checkout.test.ts":
      'import {checkout} from "../src/orders/checkout"; export function checkoutRegression(){return checkout("fixture")}',
    "docs/payments.md":
      "# Payment retries\n[Gateway](../src/payments/gateway.ts#chargePayment) preserves idempotency.\n",
    "src/webview/client.ts":
      'const api={postMessage:(message:unknown)=>message}; export function submitOrder(){api.postMessage({type:"checkout"})}',
    "src/webview/host.ts":
      'export function receive(message:{type:string}){switch(message.type){case "checkout": return 1}}',
    "src/notes.ts":
      "// chargePayment checkout chargePayment mentions must not outrank definitions\nexport const unrelated=1;",
  };
  for (const [path, text] of Object.entries(corpus)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  const ledger = new Ledger(join(storage, "project.sqlite3"), root),
    app = new Application(
      ledger,
      storage,
      resolve("dist/analysis-worker.mjs"),
      join(storage, "no-embeddings"),
    );
  try {
    ledger.create("decision", "Payment idempotency", {
      choice: "Keep one payment key across retries",
      sources: [{ path: "src/payments/gateway.ts", symbol: "chargePayment" }],
    });
    const start = performance.now();
    await app.indexSources();
    const indexMs = performance.now() - start;
    const gold = [
      {
        query: "chargePayment",
        definition: "chargePayment",
        files: [
          "src/payments/gateway.ts",
          "src/orders/checkout.ts",
          "tests/checkout.test.ts",
        ],
      },
      {
        query: "checkout",
        definition: "checkout",
        files: [
          "src/orders/checkout.ts",
          "src/payments/gateway.ts",
          "tests/checkout.test.ts",
        ],
      },
    ];
    const retrieval = [];
    for (const sample of gold) {
      const then = performance.now(),
        context = await app.codeQueries.context(
          sample.query,
          [],
          undefined,
          4000,
        ),
        latencyMs = performance.now() - then;
      const files = new Set(context.symbols.map((s) => s.path)),
        rank =
          app.codeQueries
            .ranked(sample.query)
            .findIndex(
              (r) =>
                r.node.label === sample.definition &&
                r.node.kind === "function",
            ) + 1;
      const recall =
        sample.files.filter((p) => files.has(p)).length / sample.files.length;
      assert.equal(rank, 1);
      assert.equal(recall, 1);
      assert.ok(
        Buffer.byteLength(JSON.stringify(context)) <= context.budgetBytes,
      );
      retrieval.push({
        query: sample.query,
        definitionRank: rank,
        relevantFileRecall: recall,
        responseBytes: Buffer.byteLength(JSON.stringify(context)),
        latencyMs: Math.round(latencyMs * 100) / 100,
      });
    }
    const nodes = app.codebase.nodes(),
      edges = app.codebase.edges(),
      id = (name: string) => nodes.find((n) => n.qualifiedName === name)!.id;
    const expectedCalls = [
      ["checkout", "chargePayment"],
      ["main", "checkout"],
      ["checkoutRegression", "checkout"],
    ];
    const correct = expectedCalls.filter(([a, b]) =>
      edges.some(
        (e) => e.source === id(a) && e.target === id(b) && e.kind === "calls",
      ),
    ).length;
    assert.equal(correct, expectedCalls.length);
    assert.ok(
      !edges.some((e) => e.source === id("unrelated") && e.kind === "calls"),
    );
    const contract = await app.codeQueries.path(
      "submitOrder",
      "receive",
      "forward",
      3,
    );
    assert.ok(contract.found);
    const memory = await app.codeQueries.context(
      "chargePayment",
      [],
      undefined,
      4000,
    );
    assert.ok(memory.records.some((r) => r.title === "Payment idempotency"));
    const old = id("chargePayment");
    await writeFile(
      join(root, "src/payments/gateway.ts"),
      "export function replacement(){}",
    );
    await app.codebase.refresh();
    const obsoleteEdges = app.codebase
      .edges()
      .filter((e) => e.source === old || e.target === old).length;
    assert.equal(obsoleteEdges, 0);
    const briefStart = performance.now();
    app.brief();
    const orientationMs = performance.now() - briefStart;
    const report = {
      recordedAt: new Date().toISOString(),
      node: process.version,
      fixture: {
        files: Object.keys(corpus).length,
        scope:
          "Deterministic checkout fixture; no large-repository or model-following claim",
      },
      indexMs: Math.round(indexMs),
      retrieval,
      graph: {
        expectedCalls: expectedCalls.length,
        correctCalls: correct,
        contractPath: contract.edges.map((e) => e.kind),
        linkedProjectDecision: true,
        obsoleteEdgesAfterExportChange: obsoleteEdges,
      },
      cachedBriefMs: Math.round(orientationMs * 100) / 100,
      semanticProfile: "unprepared; lexical and structural fallback",
    };
    if (!process.argv.includes("--stdout")) {
      await mkdir("artifacts", { recursive: true });
      await writeFile(
        "artifacts/codebase-evaluation.json",
        JSON.stringify(report, null, 2) + "\n",
      );
    }
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } finally {
    await app.close();
    if (
      relative(await realpath(tmpdir()), directory).startsWith(
        "contextory-evaluation-",
      )
    )
      await rm(directory, { recursive: true, force: true });
  }
}
void main().catch((error) => {
  process.stderr.write(String(error) + "\n");
  process.exitCode = 1;
});
