import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fixture } from "../helpers";
import { startService } from "../../src/service/server";
import { rpc } from "../../src/service/rpc";

test("only editor configuration sets persisted project UI language, exposed consistently to native agents and hooks", async (t) => {
  const f = await fixture(t);
  let service = await startService(f);
  f.cleanups.push(() => service.close());
  assert.equal(service.app.brief().uiLanguage, "en");
  await assert.rejects(
    rpc(join(f.storage, "codex.json"), "configure", {
      recipes: [],
      uiLanguage: "pt-BR",
    }),
    { code: "FORBIDDEN" },
  );
  await rpc(join(f.storage, "ui.json"), "configure", {
    recipes: [],
    uiLanguage: "pt-br",
  });
  await assert.rejects(
    rpc(join(f.storage, "ui.json"), "configure", {
      recipes: [{}],
      uiLanguage: "pt-br",
    }),
    { code: "INVALID_CHECKS" },
  );
  assert.equal(service.app.dashboard().uiLanguage, "pt-BR");
  const context = await rpc<{
    uiLanguage: string;
    contentLanguageInstruction: string;
  }>(join(f.storage, "codex.json"), "tools/call", {
    name: "contextory_context_get",
    arguments: {},
  });
  assert.equal(context.uiLanguage, "pt-BR");
  assert.match(context.contentLanguageInstruction, /Brazilian Portuguese/);
  await service.close();
  service = await startService(f);
  assert.equal(service.app.brief().uiLanguage, "pt-BR");
  const result = await new Promise<{ out: string; code: number | null }>(
    (done, reject) => {
      const child = spawn(
        process.execPath,
        [
          resolve("dist/contextory-hook.mjs"),
          join(f.storage, "codex-hook.json"),
          "codex",
        ],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      );
      let out = "";
      child.stdout.on("data", (c) => (out += c));
      child.on("error", reject);
      child.on("close", (code) => done({ out, code }));
      child.stdin.end(
        JSON.stringify({
          hook_event_name: "SessionStart",
          session_id: "language-test",
          cwd: f.root,
        }),
      );
    },
  );
  assert.equal(result.code, 0);
  assert.match(result.out, /Contextory UI language: pt-BR/);
  assert.match(result.out, /Brazilian Portuguese/);
});
