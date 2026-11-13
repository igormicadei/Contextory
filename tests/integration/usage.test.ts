import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { application, claimed, fixture } from "../helpers";
import { normalizeHook } from "../../src/hooks/observation";
import { usageSummary } from "../../src/core/usage";
import { renderReport } from "../../src/core/report";
import { Ledger } from "../../src/storage/ledger";
import { startService } from "../../src/service/server";
import { rpc } from "../../src/service/rpc";
import type { HookObservation, UsageSummary } from "../../src/contracts/usage";

const attempt = (
  cwd: string,
  patch: Partial<HookObservation> = {},
): HookObservation => ({
  id: crypto.randomUUID(),
  event: "PostModelRequest",
  nativeSession: "native-session",
  cwd,
  model: "test-model",
  turnId: "turn-1",
  status: "completed",
  usage: {
    inputTokens: 100,
    outputTokens: 25,
    cachedInputTokens: 60,
    reasoningTokens: 10,
    totalTokens: 125,
  },
  ...patch,
});

test("normalization retains only native metadata, preserves absent counters and does not collapse identical attempts", () => {
  const raw = {
    hook_event_name: "PostModelRequest",
    session_id: "native-session",
    cwd: "/project",
    model: "test-model",
    turn_id: "turn-1",
    status: "failed",
    error: "SECRET_ERROR",
    prompt: "SECRET_PROMPT",
    transcript_path: "SECRET_PATH",
    tool_input: { secret: true },
    token_usage: {
      input_tokens: 100,
      output_tokens: 0,
      cached_input_tokens: -1,
      reasoning_output_tokens: "10",
      total_tokens: Infinity,
    },
  };
  const a = normalizeHook(raw, "codex");
  const b = normalizeHook(raw, "codex");
  assert.notEqual(a.id, b.id);
  assert.equal(a.usage?.inputTokens, 100);
  assert.equal(a.usage?.outputTokens, 0);
  assert.equal(a.usage?.cachedInputTokens, undefined);
  assert.equal(a.usage?.reasoningTokens, undefined);
  assert.equal(a.usage?.totalTokens, undefined);
  assert.equal(a.status, "failed");
  assert.doesNotMatch(
    JSON.stringify(a),
    /SECRET|secret|transcript|tool_input|error/,
  );
  const stable = { ...raw, request_id: "native-request-1" };
  assert.equal(
    normalizeHook(stable, "codex").id,
    normalizeHook(stable, "codex").id,
  );
  assert.equal(
    normalizeHook({ ...raw, token_usage: null }, "codex").usage,
    undefined,
  );
  assert.equal(
    normalizeHook({ ...raw, token_usage: { total_tokens: "100" } }, "codex")
      .usage,
    undefined,
  );
});

test("usage is idempotent per observation, scoped to the exact session/spec and available through MCP/report exports", async (t) => {
  const { app, call, root, ledger } = await application(t);
  await app.hook("codex", {
    ...attempt(root),
    event: "SessionStart",
    usage: undefined,
  });
  const { request, milestone, spec } = await claimed(call);
  const observation = attempt(root);
  const sequence = ledger.sequence();
  await app.hook("codex", observation);
  await app.hook("codex", observation);
  assert.equal(
    ledger.sequence(),
    sequence,
    "per-request telemetry must not displace project activity",
  );
  await app.hook(
    "codex",
    attempt(root, {
      nativeSession: "different-session",
      model: "unrelated-model",
    }),
  );
  for (const entityId of [request.id, milestone.id, spec.id]) {
    const usage = (await call("contextory_usage_get", {
      entityId,
    })) as UsageSummary;
    assert.equal(usage.origin, "native-hook");
    assert.equal(usage.availability, "observed");
    assert.equal(usage.attempts, 1);
    assert.equal(usage.unassignedAttempts, 0);
    assert.deepEqual(usage.groups[0].tokens, observation.usage);
    assert.equal(usage.groups.length, 1);
    assert.equal(
      usage.records.find((r) => r.event === "PostModelRequest")?.specId,
      spec.id,
    );
  }
  const report = renderReport(ledger, "report", request.id);
  assert.match(report, /Agent models and observed usage/);
  assert.match(report, /test-model/);
  assert.doesNotMatch(report, /unrelated-model/);
  assert.match(report, /not billing/);
  const json = JSON.parse(renderReport(ledger, "json", request.id));
  assert.equal(json.usage.attempts, 1);
  assert.equal(json.usage.groups[0].tokens.totalTokens, 125);
  assert.equal(usageSummary(ledger).unassignedAttempts, 1);
  await assert.rejects(call("contextory_usage_get", { entityId: "missing" }), {
    code: "NOT_FOUND",
  });
});

test("missing counters remain null, real zero remains zero, and retries/failed attempts remain separate", async (t) => {
  const { root, app, ledger, call } = await application(t);
  const { spec } = await claimed(call);
  await app.hook(
    "codex",
    attempt(root, { usage: undefined, status: "failed" }),
  );
  await app.hook(
    "codex",
    attempt(root, {
      usage: { inputTokens: 0, outputTokens: 0 },
      status: "cancelled",
    }),
  );
  let usage = usageSummary(ledger, { entityId: spec.id });
  assert.equal(usage.availability, "partial");
  assert.equal(usage.attempts, 2);
  assert.equal(usage.measuredAttempts, 1);
  assert.equal(usage.groups[0].tokens.inputTokens, 0);
  assert.equal(usage.groups[0].tokens.totalTokens, null);
  assert.ok(
    usage.records.some((r) => r.status === "failed" && r.tokens === null),
  );
  await app.hook(
    "codex",
    attempt(root, { model: "output-only", usage: { outputTokens: 9 } }),
  );
  usage = usageSummary(ledger, { entityId: spec.id });
  assert.equal(usage.availability, "partial");
  assert.equal(usage.attempts, 3);
  assert.equal(
    usage.groups.find((g) => g.model === "output-only")?.tokens.inputTokens,
    null,
  );
});

test("concurrent, expired, unknown and parent-only subagent sessions never receive guessed spec attribution", async (t) => {
  const { app, call, ledger, root } = await application(t);
  const first = await claimed(call);
  const second = await claimed(call);
  await app.hook("codex", attempt(root));
  assert.equal(
    usageSummary(ledger).unassignedAttempts,
    1,
    "two leases share a native session",
  );
  for (const spec of [first.spec, second.spec]) {
    const current = ledger.get(spec.id);
    ledger.update(current, current.revision, {
      data: { ...current.data, lease: null },
    });
  }
  await app.hook("codex", attempt(root));
  assert.equal(usageSummary(ledger).unassignedAttempts, 2);
  const third = await claimed(call);
  await app.hook(
    "codex",
    attempt(root, { agentId: "child-agent", model: "child-model" }),
  );
  await app.hook("codex", attempt(root, { nativeSession: "unknown" }));
  const current = ledger.get(third.spec.id);
  ledger.update(current, current.revision, {
    data: {
      ...current.data,
      lease: { ...(current.data.lease as object), expiresAt: Date.now() - 1 },
    },
  });
  await app.hook("codex", attempt(root));
  assert.equal(usageSummary(ledger).unassignedAttempts, 5);
  assert.equal(
    usageSummary(ledger, { entityId: third.request.id }).attempts,
    0,
  );
});

test("Claude model changes are retained without counting context size or estimated cost as usage; Bob stays unavailable", async (t) => {
  const { app, call, root, ledger } = await application(t);
  const claude = { id: "claude", provider: "claude", human: false } as const;
  await app.hook(
    "claude",
    normalizeHook(
      {
        hook_event_name: "SessionStart",
        session_id: "native-session",
        cwd: root,
        model: "claude-test",
      },
      "claude",
    ),
  );
  const setup = await claimed((name, args) => call(name, args, claude));
  await app.hook(
    "claude",
    normalizeHook(
      {
        hook_event_name: "PostModelSwitch",
        session_id: "native-session",
        cwd: root,
        to_model: "claude-next",
        context_tokens: 9999,
        estimated_cache_write_usd: 20,
        token_usage: { total_tokens: 1234 },
      },
      "claude",
    ),
  );
  const usage = usageSummary(ledger, { entityId: setup.spec.id });
  assert.deepEqual(
    usage.groups.map((g) => g.model),
    ["claude-next", "claude-test"],
  );
  assert.equal(usage.availability, "unavailable");
  assert.equal(usage.attempts, 0);
  assert.ok(usage.groups.every((g) => g.tokens.totalTokens === null));
  await app.hook(
    "bob",
    normalizeHook(
      { hook_event_name: "SessionStart", session_id: "bob-session", cwd: root },
      "bob",
    ),
  );
  const bob = usageSummary(ledger, { provider: "bob" });
  assert.equal(bob.groups[0].model, null);
  assert.equal(bob.availability, "unavailable");
  assert.doesNotMatch(
    JSON.stringify(usage),
    /estimated_cache|context_tokens|9999/,
  );
});

test("paged usage metadata and filters survive service restarts and additive ledger migration", async (t) => {
  const { root, storage, cleanups } = await fixture(t);
  const path = join(storage, "ledger.sqlite3");
  let ledger = new Ledger(path, root);
  ledger.create("request", "Preserve existing work", {
    description: "Original contract",
  });
  ledger.db.exec("DROP TABLE agent_usage; PRAGMA user_version=2;");
  ledger.close();
  ledger = new Ledger(path, root);
  assert.equal(ledger.all("request")[0].title, "Preserve existing work");
  const { recordUsage } = await import("../../src/core/usage");
  for (let i = 0; i < 4; i++)
    recordUsage(ledger, "codex", attempt(root), new Date().toISOString());
  ledger.close();
  ledger = new Ledger(path, root);
  cleanups.push(async () => ledger.close());
  const first = usageSummary(ledger, {
    provider: "codex",
    nativeSessionId: "native-session",
    limit: 2,
  });
  assert.equal(first.totalRecords, 4);
  assert.equal(first.nextOffset, 2);
  const second = usageSummary(ledger, { limit: 2, offset: first.nextOffset! });
  assert.equal(second.nextOffset, null);
  assert.equal(
    new Set([...first.records, ...second.records].map((r) => r.id)).size,
    4,
  );
  assert.equal(usageSummary(ledger, { provider: "bob" }).totalRecords, 0);
  assert.equal(usageSummary(ledger).groups[0].tokens.totalTokens, 500);
});

test("packaged hook launcher forwards native usage without chat content or model-visible output", async (t) => {
  const f = await fixture(t);
  const service = await startService(f);
  f.cleanups.push(() => service.close());
  for (let i = 0; i < 2; i++) {
    const child = spawn(
      process.execPath,
      [
        resolve("dist/contextory-hook.mjs"),
        join(f.storage, "codex-hook.json"),
        "codex",
      ],
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const finished = new Promise<number | null>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
    child.stdin.end(
      JSON.stringify({
        hook_event_name: "PostModelRequest",
        cwd: f.root,
        session_id: "native-session",
        turn_id: "turn-1",
        model: "native-fixture-model",
        status: "completed",
        token_usage: {
          input_tokens: 100,
          output_tokens: 25,
          total_tokens: 125,
        },
        transcript_path: "PRIVATE_TRANSCRIPT",
        prompt: "PRIVATE_PROMPT",
        error: "PRIVATE_ERROR",
      }),
    );
    assert.equal(await finished, 0);
    assert.equal(stdout, "");
    assert.equal(stderr, "");
  }
  const summary = await rpc<UsageSummary>(
    join(f.storage, "ui.json"),
    "tools/call",
    { name: "contextory_usage_get", arguments: {} },
  );
  assert.equal(summary.attempts, 2);
  assert.equal(summary.groups[0].tokens.totalTokens, 250);
  assert.doesNotMatch(JSON.stringify(summary), /PRIVATE/);
  assert.doesNotMatch(JSON.stringify(service.app.ledger.events()), /PRIVATE/);
});
