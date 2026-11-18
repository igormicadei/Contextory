import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { application, claimed, agent, operationId } from "../helpers";
import { ReleaseGit } from "../../src/releases/git";
import { ReleaseManager } from "../../src/releases/manager";
import { Ledger } from "../../src/storage/ledger";
import { watchReleases } from "../../src/releases/watch";
import type { Entity } from "../../src/contracts/model";
import { releasePath, releaseConfig } from "../../src/releases/config";

async function repository(t: TestContext) {
  const f = await application(t),
    git = new ReleaseGit(f.root);
  await git.run(["init", "-b", "main"]);
  await git.run(["config", "user.email", "fixture@example.invalid"]);
  await git.run(["config", "user.name", "Release fixture"]);
  await git.run(["config", "core.autocrlf", "false"]);
  await git.run(["config", "commit.gpgsign", "false"]);
  await git.run(["config", "tag.gpgsign", "false"]);
  await writeFile(
    join(f.root, "package.json"),
    '{"name":"fixture","version":"1.0.0"}\n',
  );
  await writeFile(
    join(f.root, "package-lock.json"),
    '{"version":"1.0.0","packages":{"":{"version":"1.0.0"}}}\n',
  );
  await git.run(["add", "."]);
  await git.run(["commit", "-m", "feat: initial"]);
  const first = await git.head();
  await git.run(["tag", "v1.0.0"]);
  const commit = async (subject: string) => {
    await writeFile(join(f.root, "main.ts"), `// ${subject}\n`);
    await git.run(["add", "main.ts"]);
    await git.run(["commit", "-m", subject]);
    return git.head();
  };
  const prepare = async (extra = {}) =>
    (await f.call("contextory_release_prepare", {
      operationId: operationId(),
      ...extra,
    })) as Entity;
  const change = async (e: Entity, action: string, op = operationId()) =>
    (await f.call("contextory_release_change", {
      operationId: op,
      id: e.id,
      expectedRevision: e.revision,
      action,
    })) as Entity;
  return { ...f, git, first, commit, prepare, change };
}

test("global releases capture exact commits, cross-request definitions, preserve versions and publish only immutable tags", async (t) => {
  const f = await repository(t);
  const second = await f.commit("feat(editor): add navigation");
  const a = await claimed(f.call),
    b = await claimed(f.call);
  for (const work of [a, b])
    await f.call("contextory_decision_record", {
      operationId: operationId(),
      specId: work.spec.id,
      leaseId: work.leaseId,
      title: `Decision ${work.request.id}`,
      choice: "Keep stable navigation",
      rationale: "Predictability",
      alternatives: "Change navigation",
      consequences: "Shared contract",
      sources: [{ path: "main.ts" }],
    });
  const remote = join(f.directory, "remote.git");
  await mkdir(remote);
  await new ReleaseGit(remote).run(["init", "--bare"]);
  await f.git.run(["remote", "add", "origin", remote]);
  const before = await f.git.head(),
    manifest = await readFile(join(f.root, "package.json"), "utf8");
  const plan = await f.prepare();
  assert.equal(plan.parentId, undefined);
  assert.equal(plan.data.version, "1.1.0");
  assert.deepEqual(
    (plan.data.commits as { hash: string }[]).map((c) => c.hash),
    [second],
  );
  assert.equal(
    (plan.data.semantic as { kind: string }[]).filter(
      (e) => e.kind === "decision",
    ).length,
    2,
  );
  assert.equal(await f.git.head(), before);
  assert.equal(await readFile(join(f.root, "package.json"), "utf8"), manifest);
  const op = operationId(),
    tagged = await f.change(plan, "apply", op);
  assert.equal(tagged.state, "tagged");
  assert.equal(await f.git.dirty(), "");
  assert.equal(
    JSON.parse(await readFile(join(f.root, "package.json"), "utf8")).version,
    "1.1.0",
  );
  const lock = JSON.parse(
    await readFile(join(f.root, "package-lock.json"), "utf8"),
  );
  assert.equal(lock.version, "1.1.0");
  assert.equal(lock.packages[""].version, "1.1.0");
  assert.equal(
    (tagged.data.commits as unknown[]).length,
    2,
    "release commit is also a member",
  );
  assert.deepEqual(
    await f.change(plan, "apply", op),
    tagged,
    "exact retry returns original result",
  );
  await assert.rejects(f.change(plan, "publish"), {
    code: "REVISION_CONFLICT",
  });
  assert.equal(
    await f.git.run(["cat-file", "-t", `refs/tags/${tagged.data.tag}`]),
    "tag",
  );
  const published = await f.change(tagged, "publish");
  assert.equal(published.state, "published");
  const repeated = await f.change(published, "publish");
  assert.equal(repeated.state, "published");
  assert.equal(f.ledger.get(plan.id).state, "published");
  assert.equal(f.ledger.get(plan.id).revision, published.revision);
  const refs = await new ReleaseGit(remote).run(["show-ref"]);
  assert.ok(refs.includes("refs/tags/v1.1.0"));
  assert.ok(!refs.includes("refs/heads/"));
  const changelog = await readFile(join(f.root, "CHANGELOG.md"), "utf8");
  assert.ok(changelog.includes(second));
  assert.ok(changelog.includes("recording interval"));
  const view = (await f.call("contextory_version_get", {
    releaseId: tagged.id,
    limit: 1,
  })) as any;
  assert.equal(view.commits.nextOffset, 1);
  assert.equal(view.commits.items[0].hash, second);
  assert.equal(
    (
      (await f.call("contextory_project_export", {
        section: "records",
        entityId: tagged.id,
      })) as any
    ).items[0].data.tagObject,
    tagged.data.tagObject,
  );
  await f.commit("fix: repair navigation");
  const next = await f.prepare();
  assert.equal(next.data.version, "1.1.1");
  assert.equal(
    (next.data.semantic as { kind: string }[]).filter(
      (e) => e.kind === "decision",
    ).length,
    0,
  );
});

test("release plans reject dirty work, stale heads, staging conflicts and moved historical tags", async (t) => {
  const f = await repository(t);
  await f.commit("fix: change");
  await writeFile(join(f.root, "notes.txt"), "unrelated");
  await assert.rejects(f.prepare(), { code: "DIRTY_WORKTREE" });
  await f.git.run(["add", "notes.txt"]);
  await f.git.run(["commit", "-m", "docs: notes"]);
  const plan = await f.prepare();
  const changed = await f.commit("fix: another change");
  await assert.rejects(f.change(plan, "apply"), { code: "STALE_RELEASE" });
  assert.equal(await f.git.head(), changed);
  assert.equal(
    JSON.parse(await readFile(join(f.root, "package.json"), "utf8")).version,
    "1.0.0",
  );
  assert.equal(
    (await f.change(f.ledger.get(plan.id), "cancel")).state,
    "cancelled",
  );
  await f.git.run(["tag", "-f", "v1.0.0"]);
  const status = await f.app.releases.observe();
  assert.ok(status.gaps.some((g) => g.includes("moved")));
  const retained = f.ledger.all("release").find((e) => e.state === "observed")!;
  assert.equal(retained.data.head, f.first);
});

test("failed local application survives restart and recovers owned edits without duplicate commits or tags", async (t) => {
  const f = await repository(t);
  await f.commit("fix: retry");
  const plan = await f.prepare();
  const hooks = join(f.root, ".git", "hooks");
  await writeFile(join(hooks, "pre-commit"), "#!/bin/sh\nexit 1\n", {
    mode: 0o755,
  });
  await assert.rejects(f.change(plan, "apply"));
  let failed = f.ledger.get(plan.id);
  assert.equal(failed.state, "failed");
  assert.equal(await f.git.head(), plan.data.head);
  // New manager simulates reopening the controller on persisted state.
  const reopenedLedger = new Ledger(join(f.storage, "ledger.sqlite3"), f.root);
  const reopened = new ReleaseManager(reopenedLedger);
  await writeFile(join(hooks, "pre-commit"), "#!/bin/sh\nexit 0\n", {
    mode: 0o755,
  });
  const recovered = (await reopened.change(
    {
      operationId: operationId(),
      id: failed.id,
      expectedRevision: failed.revision,
      action: "recover",
    },
    agent,
  )) as Entity;
  assert.equal(recovered.state, "tagged");
  const head = await f.git.head();
  assert.notEqual(head, plan.data.head);
  assert.equal(
    await f.git.run(["rev-list", "--count", `${plan.data.head}..HEAD`]),
    "1",
  );
  await reopened.close();
  reopenedLedger.close();
});

test("remote tag conflicts and destination drift are retained for safe publish recovery", async (t) => {
  const f = await repository(t);
  await f.commit("fix: remote");
  const remote = join(f.directory, "remote.git");
  await mkdir(remote);
  const bare = new ReleaseGit(remote);
  await bare.run(["init", "--bare"]);
  await f.git.run(["remote", "add", "origin", remote]);
  const plan = await f.prepare(),
    tagged = await f.change(plan, "apply");
  await f.git.run([
    "push",
    "origin",
    `refs/tags/v1.0.0:refs/tags/${tagged.data.tag}`,
  ]);
  await assert.rejects(f.change(tagged, "publish"), {
    code: "REMOTE_TAG_CONFLICT",
  });
  let pending = f.ledger.get(plan.id);
  assert.equal(pending.state, "publishing");
  assert.notEqual(
    await bare.run(["rev-parse", `refs/tags/${tagged.data.tag}`]),
    tagged.data.tagObject,
  );
  await f.git.run([
    "remote",
    "set-url",
    "--push",
    "origin",
    join(f.directory, "different.git"),
  ]);
  await assert.rejects(f.change(pending, "recover"), {
    code: "REMOTE_CHANGED",
  });
});

test("automatic observer records externally created versions and commits without a request or agent call", async (t) => {
  const f = await repository(t),
    stop = watchReleases(f.app.releases, 100);
  f.cleanups.push(async () => stop());
  const head = await f.commit("feat!: breaking navigation");
  let deadline = Date.now() + 15000;
  while (Date.now() < deadline && f.app.releases.status().head !== head)
    await new Promise((r) => setTimeout(r, 50));
  assert.equal(f.app.releases.status().head, head);
  assert.equal(f.app.releases.status().recommendedBump, "major");
  assert.equal(f.ledger.all("request").length, 0);
  await f.git.run(["tag", "v2.0.0"]);
  deadline = Date.now() + 15000;
  while (
    Date.now() < deadline &&
    f.app.releases.status().latestTag !== "v2.0.0"
  )
    await new Promise((r) => setTimeout(r, 50));
  assert.equal(f.app.releases.status().latestTag, "v2.0.0");
  const ledger = new Ledger(join(f.storage, "second.sqlite3"), f.root);
  const controller = new ReleaseManager(ledger);
  const imported = await controller.observe();
  assert.equal(imported.latestTag, "v2.0.0");
  await controller.close();
  ledger.close();
});

test("configuration adapters protect paths and serialize competing global plans", async (t) => {
  const f = await repository(t);
  await writeFile(join(f.root, "version.txt"), 'version = "1.0.0"\n');
  await writeFile(
    join(f.root, "contextory.release.json"),
    JSON.stringify({
      versionFiles: [
        {
          path: "version.txt",
          format: "text",
          prefix: 'version = "',
          suffix: '"',
        },
      ],
    }),
  );
  await f.git.run(["add", "."]);
  await f.git.run(["commit", "-m", "feat: text version adapter"]);
  const results = await Promise.allSettled([f.prepare(), f.prepare()]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const plan = (
    results.find(
      (r) => r.status === "fulfilled",
    ) as PromiseFulfilledResult<Entity>
  ).value;
  const cancelled = await f.change(plan, "cancel");
  assert.equal(cancelled.state, "cancelled");
  const next = await f.prepare({ version: "1.5.0" });
  await f.change(next, "apply");
  assert.equal(
    await readFile(join(f.root, "version.txt"), "utf8"),
    'version = "1.5.0"\n',
  );
  for (const path of ["../outside.txt", ".git/HEAD", "x/../../outside.txt"])
    await assert.rejects(releasePath(f.root, path), { code: "INVALID_PATH" });
  await writeFile(
    join(f.root, "contextory.release.json"),
    JSON.stringify({
      versionFiles: [
        { path: "../outside.json", format: "json", keys: [["version"]] },
      ],
    }),
  );
  await assert.rejects(releaseConfig(f.root), { code: "INVALID_PATH" });
});

test("recovery reconciles tags and remote pushes completed before an interrupted result, including CRLF normalization", async (t) => {
  const f = await repository(t);
  await f.git.run(["config", "core.autocrlf", "true"]);
  for (const file of ["package.json", "package-lock.json"]) {
    const text = await readFile(join(f.root, file), "utf8");
    await writeFile(join(f.root, file), text.replaceAll("\n", "\r\n"));
  }
  await f.git.run(["add", "--renormalize", "."]);
  assert.equal(await f.git.dirty(), "");
  const remote = join(f.directory, "remote.git");
  await mkdir(remote);
  await new ReleaseGit(remote).run(["init", "--bare"]);
  await f.git.run(["remote", "add", "origin", remote]);
  await f.commit("fix: crash recovery");
  const plan = await f.prepare();
  const run = f.app.releases.git.run.bind(f.app.releases.git);
  let interruptedTag = false;
  f.app.releases.git.run = async (args, timeout, input) => {
    const result = await run(args, timeout, input);
    if (args[0] === "tag" && args.includes("-a") && !interruptedTag) {
      interruptedTag = true;
      throw new Error("Interrupted after tag creation");
    }
    return result;
  };
  const op = operationId();
  await assert.rejects(f.change(plan, "apply", op), /Interrupted after tag/);
  const head = await f.git.head();
  assert.notEqual(head, plan.data.head);
  const tagged = await f.change(plan, "apply", op);
  assert.equal(tagged.state, "tagged");
  assert.equal(await f.git.head(), head);
  assert.equal((tagged.data.commits as unknown[]).length, 2);
  let interruptedPush = false;
  f.app.releases.git.run = async (args, timeout, input) => {
    const result = await run(args, timeout, input);
    if (args[0] === "push" && !interruptedPush) {
      interruptedPush = true;
      throw new Error("Interrupted after push");
    }
    return result;
  };
  await assert.rejects(f.change(tagged, "publish"), /Interrupted after push/);
  const pending = f.ledger.get(plan.id);
  assert.equal(pending.state, "publishing");
  const recovered = await f.change(pending, "recover");
  assert.equal(recovered.state, "published");
  assert.equal(await f.git.head(), head);
});

test("shallow membership is explicitly partial and is revised after a full history fetch", async (t) => {
  const f = await repository(t);
  const second = await f.commit("feat: second");
  await f.git.run(["tag", "v1.1.0"]);
  const root = join(f.directory, "shallow");
  await f.git.run(["clone", "--depth", "1", "--no-local", f.root, root]);
  const ledger = new Ledger(join(f.storage, "shallow.sqlite3"), root),
    controller = new ReleaseManager(ledger);
  f.cleanups.push(async () => {
    await controller.close();
    ledger.close();
  });
  assert.equal((await controller.observe()).shallow, true);
  await assert.rejects(
    controller.prepare({ operationId: operationId(), bump: "auto" }, agent),
    { code: "INCOMPLETE_HISTORY" },
  );
  const partial = ledger.all("release").find((e) => e.data.tag === "v1.1.0")!;
  assert.equal(partial.data.membershipComplete, false);
  await controller.git.run(["fetch", "--unshallow", "--tags"]);
  assert.equal((await controller.observe()).shallow, false);
  const complete = ledger.get(partial.id);
  assert.equal(complete.revision, 2);
  assert.equal(complete.data.membershipComplete, true);
  assert.deepEqual(
    (complete.data.commits as { hash: string }[]).map((c) => c.hash),
    [second],
  );
  assert.equal(ledger.get(partial.id, 1).data.membershipComplete, false);
});

test("project history includes tags on other branches while unreleased membership follows the active branch", async (t) => {
  const f = await repository(t);
  await f.git.run(["checkout", "-b", "other"]);
  const other = await f.commit("feat: other branch");
  await f.git.run(["tag", "v2.0.0"]);
  await f.git.run(["checkout", "main"]);
  const main = await f.commit("fix: main branch");
  const status = await f.app.releases.observe();
  assert.equal(status.latestTag, "v1.0.0");
  assert.ok(status.releases.some((r) => r.tag === "v2.0.0"));
  assert.equal(status.gaps.length, 0);
  const tagged = f.ledger.all("release").find((e) => e.data.tag === "v2.0.0")!;
  assert.deepEqual(
    (tagged.data.commits as { hash: string }[]).map((c) => c.hash),
    [other],
  );
  const current = (await f.call("contextory_version_get", {})) as any;
  assert.deepEqual(
    current.unreleased.items.map((c: any) => c.hash),
    [main],
  );
});
