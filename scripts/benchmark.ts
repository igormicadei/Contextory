import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir, cpus, totalmem } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { startService } from "../src/service/server";
import { rpc } from "../src/service/rpc";
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "contextory-benchmark-"));
  const root = join(directory, "project");
  const storage = join(directory, "storage");
  await mkdir(root);
  await mkdir(storage);
  await mkdir("artifacts", { recursive: true });
  const samples: Record<string, number[]> = {};
  async function measure<T>(name: string, work: () => Promise<T>) {
    const start = performance.now();
    const result = await work();
    (samples[name] ??= []).push(performance.now() - start);
    return result;
  }
  for (let file = 0; file < 100; file++)
    await writeFile(
      join(root, `file${file}.ts`),
      `${file < 99 ? `import {start as next} from './file${file + 1}';` : "function next(){}"} export function start(ok=true){if(ok){next()}else{leaf0()}} ${Array.from({ length: 20 }, (_, i) => `function leaf${i}(){return ${i}}`).join(" ")}`,
    );
  for (let file = 0; file < 100; file++)
    await writeFile(
      join(root, `file${file}.py`),
      `${file < 99 ? `from file${file + 1} import start as next` : "def next():\n    pass"}\ndef start(ok=True):\n    if ok:\n        next()\n    else:\n        leaf0()\n${Array.from({ length: 20 }, (_, i) => `def leaf${i}():\n    return ${i}\n`).join("\n")}`,
    );
  const service = await measure("serviceStart", () =>
    startService({
      root,
      storage,
      workerPath: resolve("dist/analysis-worker.mjs"),
      embeddingDirectory: resolve(".contextory-local/embeddings"),
    }),
  );
  try {
    const descriptor = join(storage, "ui.json");
    const actor = { id: "benchmark", human: true };
    await measure("seed2000Records", async () =>
      service.app.ledger.transaction(
        "benchmark-seed",
        actor,
        "seed",
        {},
        () => {
          for (let i = 0; i < 2000; i++)
            service.app.ledger.create("request", `Network retry ${i}`, {
              description: `Remember retry backoff and credential renewal for service ${i}.`,
            });
          return { inserted: 2000 };
        },
      ),
    );
    for (let i = 0; i < 30; i++)
      await measure("healthRpc", () => rpc(descriptor, "health"));
    for (let i = 0; i < 20; i++)
      await measure("lexicalSearch", () =>
        rpc(descriptor, "tools/call", {
          name: "contextory_search",
          arguments: { query: "retry credentials", mode: "lexical", limit: 10 },
        }),
      );
    const flow = {
      root: { path: "file0.ts", symbol: "start" },
      view: "flow",
      limits: { callDepth: 5 },
    };
    const cold = await measure("flowColdWorker", () =>
      rpc(descriptor, "tools/call", {
        name: "contextory_flow_trace",
        arguments: flow,
      }),
    );
    for (let i = 0; i < 10; i++)
      await measure("flowWarm", () =>
        rpc(descriptor, "tools/call", {
          name: "contextory_flow_trace",
          arguments: flow,
        }),
      );
    const healthDuringAnalysis: Promise<unknown>[] = [];
    const tracing = rpc(descriptor, "tools/call", {
      name: "contextory_flow_trace",
      arguments: flow,
    });
    for (let i = 0; i < 20; i++)
      healthDuringAnalysis.push(
        measure("healthDuringAnalysis", () => rpc(descriptor, "health")),
      );
    await Promise.all([tracing, ...healthDuringAnalysis]);
    const pythonFlow = { ...flow, root: { path: "file0.py", symbol: "start" } };
    const pythonCold = await measure("pythonFlowCold", () =>
      rpc(descriptor, "tools/call", {
        name: "contextory_flow_trace",
        arguments: pythonFlow,
      }),
    );
    for (let i = 0; i < 10; i++)
      await measure("pythonFlowRepeat", () =>
        rpc(descriptor, "tools/call", {
          name: "contextory_flow_trace",
          arguments: pythonFlow,
        }),
      );
    const pythonTracing = rpc(descriptor, "tools/call", {
      name: "contextory_flow_trace",
      arguments: pythonFlow,
    });
    await Promise.all([
      pythonTracing,
      ...Array.from({ length: 20 }, () =>
        measure("healthDuringPythonAnalysis", () => rpc(descriptor, "health")),
      ),
    ]);
    for (let i = 0; i < 10; i++)
      await measure("dashboard2000Records", () => rpc(descriptor, "dashboard"));
    for (let i = 0; i < 8; i++)
      await measure(
        "hookProcess",
        () =>
          new Promise<void>((finish, reject) => {
            const child = spawn(
              process.execPath,
              [
                resolve("dist/contextory-hook.mjs"),
                join(storage, "bob-hook.json"),
                "bob",
              ],
              { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] },
            );
            child.stdin.end(
              JSON.stringify({
                hook_event_name: "SessionStart",
                session_id: `benchmark-${i}`,
                cwd: root,
              }),
            );
            child.once("error", reject);
            child.once("close", (code) =>
              code === 0 ? finish() : reject(new Error(`hook ${code}`)),
            );
          }),
      );
    const sourceIndex = await measure("sourceIndex200Files", () =>
      service.app.indexSources(),
    );
    const summary = Object.fromEntries(
      Object.entries(samples).map(([name, values]) => {
        const sorted = [...values].sort((a, b) => a - b);
        return [
          name,
          {
            samples: values.length,
            minMs: +sorted[0].toFixed(2),
            medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(2),
            p95Ms:
              +sorted[
                Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
              ].toFixed(2),
          },
        ];
      }),
    );
    const report = {
      recordedAt: new Date().toISOString(),
      hardware: {
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
        totalMemoryGiB: +(totalmem() / 1024 ** 3).toFixed(1),
      },
      node: process.versions.node,
      fixture: {
        sourceFiles: 200,
        functionsPerLanguage: 2200,
        records: 2000,
        callDepth: 5,
      },
      summary,
      sourceIndex,
      flow: cold,
      pythonFlow: pythonCold,
      serviceRssMiB: +(process.memoryUsage().rss / 1024 ** 2).toFixed(1),
      note: "Same-process loopback service startup excludes external process startup. Analysis runs in a separate worker. RSS includes benchmark harness, service, and analysis worker. Hook timing includes a fresh Node process. Semantic cold loading is measured by the integration test, not these timings.",
    };
    await writeFile(
      "artifacts/benchmark.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify(
        {
          hardware: report.hardware,
          summary: report.summary,
          serviceRssMiB: report.serviceRssMiB,
        },
        null,
        2,
      ),
    );
  } finally {
    await service.close();
    if (!directory.startsWith(join(tmpdir(), "contextory-benchmark-")))
      throw new Error("Unexpected benchmark directory");
    await rm(directory, { recursive: true, force: true });
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
