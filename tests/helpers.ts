import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { TestContext } from "node:test";
import { Ledger } from "../src/storage/ledger";
import { Application } from "../src/service/application";
import type { Actor, Entity } from "../src/contracts/model";
export const agent: Actor = { id: "codex", provider: "codex", human: false };
export const human: Actor = { id: "ui", human: true };
export const operationId = () => randomUUID();
export async function fixture(t: TestContext) {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), "relay-test-")),
  );
  const cleanups: (() => Promise<unknown>)[] = [];
  const root = join(directory, "project");
  const storage = join(directory, "storage");
  await mkdir(root);
  await mkdir(storage);
  await writeFile(
    join(root, "main.ts"),
    "export function hello() { return 42; }\n",
  );
  t.after(async () => {
    for (const cleanup of cleanups.reverse()) await cleanup();
    if (!directory.startsWith(join(await realpath(tmpdir()), "relay-test-")))
      throw new Error("Unexpected test directory");
    await rm(directory, { recursive: true, force: true });
  });
  return {
    directory,
    root,
    storage,
    cleanups,
    workerPath: resolve("dist/analysis-worker.mjs"),
    embeddingDirectory: resolve(".relay-local/embeddings"),
  };
}
export async function application(t: TestContext) {
  const f = await fixture(t);
  const ledger = new Ledger(join(f.storage, "ledger.sqlite3"), f.root);
  const app = new Application(
    ledger,
    f.storage,
    f.workerPath,
    f.embeddingDirectory,
  );
  f.cleanups.push(() => app.close());
  const call = (name: string, args: object, actor = agent) =>
    app.call(name, args, actor);
  return { ...f, app, ledger, call };
}
export async function claimed(
  call: (name: string, args: object, actor?: Actor) => Promise<unknown>,
) {
  const request = (await call("relay_request_change", {
    operationId: operationId(),
    action: "create",
    title: "Feature",
    description: "Authorized feature",
  })) as Entity;
  const milestone = (await call("relay_spec_change", {
    operationId: operationId(),
    action: "milestone",
    parentId: request.id,
    title: "Delivery",
  })) as Entity;
  let spec = (await call("relay_spec_change", {
    operationId: operationId(),
    action: "create",
    parentId: milestone.id,
    title: "Implementation",
    criteria: ["Works correctly"],
    paths: ["main.ts"],
  })) as Entity;
  const session = (await call("relay_session_attach", {
    operationId: operationId(),
    nativeSessionId: "native-session",
  })) as Entity;
  spec = (await call("relay_spec_lease", {
    operationId: operationId(),
    action: "claim",
    specId: spec.id,
    sessionId: session.id,
    expectedRevision: spec.revision,
  })) as Entity;
  const leaseId = (spec.data.lease as { id: string }).id;
  return { request, milestone, spec, session, leaseId };
}
export async function waitJob(
  call: (name: string, args: object) => Promise<unknown>,
  jobId: string,
) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const job = (await call("relay_entity_get", { id: jobId })) as {
      state: string;
      data: { evidenceId: string };
    };
    if (!["queued", "running"].includes(job.state)) return job;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Check job timed out");
}
