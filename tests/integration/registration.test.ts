import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, symlink, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "jsonc-parser";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  configureProvider,
  registrationName,
  syncProviderSkills,
  type Registration,
} from "../../src/providers/registration";
import { fixture } from "../helpers";
import { skillFiles } from "../../src/providers/skill-content";
import { clientIds, clients } from "../../src/providers/clients";
const registration = (
  root: string,
  provider: Registration["provider"],
): Registration => ({
  root,
  provider,
  node: process.execPath,
  proxy: "C:/path with spaces/mcp-proxy.mjs",
  hook: "C:/path with spaces/contextory-hook.mjs",
  descriptor: "C:/data/provider.json",
  hookDescriptor: "C:/data/hook.json",
});
test("registration distinguishes connection changes from portable resource updates and unchanged reopen", async (t) => {
  const { root } = await fixture(t),
    r = registration(root, "codex");
  const first = await configureProvider(r);
  assert.equal(first.connectionChanged, true);
  assert.ok(first.changedFiles.includes(join(root, ".codex/config.toml")));
  const again = await configureProvider(r);
  assert.deepEqual(again.changedFiles, []);
  assert.equal(again.connectionChanged, false);
  assert.equal(again.connectionFingerprint, first.connectionFingerprint);
  await writeFile(
    join(root, ".agents/skills/contextory-workflow/SKILL.md"),
    "<!-- contextory-managed-workflow -->\nold\n",
  );
  const resources = await configureProvider(r);
  assert.equal(resources.connectionChanged, false);
  assert.equal(resources.changedFiles.length, 1);
  const moved = await configureProvider({
    ...r,
    proxy: "C:/new runtime/proxy.mjs",
  });
  assert.equal(moved.connectionChanged, true);
  assert.notEqual(moved.connectionFingerprint, first.connectionFingerprint);
});
test("skill-only sync updates every client resource, preserves config and detects drift", async (t) => {
  const { root } = await fixture(t);
  const configs = new Map<string, string>();
  for (const id of clientIds) {
    for (const path of [clients[id].mcpPath, clients[id].hooksPath].filter(
      Boolean,
    )) {
      const file = join(root, path),
        body = `user-owned ${id}: ${path}\n`;
      await mkdir(join(file, ".."), { recursive: true });
      await writeFile(file, body);
      configs.set(file, body);
    }
  }
  const oldPath = join(
    root,
    clients.codex.skillsPath,
    "contextory-workflow/SKILL.md",
  );
  await mkdir(join(oldPath, ".."), { recursive: true });
  await writeFile(
    oldPath,
    "<!-- contextory-managed-workflow -->\nolder version\n",
  );
  await syncProviderSkills(root, clientIds);
  await syncProviderSkills(root, clientIds);
  for (const id of clientIds)
    for (const [path, body] of Object.entries(skillFiles))
      assert.equal(
        await readFile(join(root, clients[id].skillsPath, path), "utf8"),
        body,
      );
  for (const [path, body] of configs)
    assert.equal(await readFile(path, "utf8"), body);
  const exec = promisify(execFile);
  const args = [
    "--import",
    "tsx",
    "scripts/sync-workspace-skills.ts",
    "--root",
    root,
    "--check",
  ];
  await exec(process.execPath, args, { windowsHide: true });
  await writeFile(oldPath, "<!-- contextory-managed-workflow -->\ndrift\n");
  await assert.rejects(exec(process.execPath, args, { windowsHide: true }), {
    code: 1,
  });
  await exec(process.execPath, args.slice(0, -1), { windowsHide: true });
  assert.equal(
    await readFile(oldPath, "utf8"),
    skillFiles["contextory-workflow/SKILL.md"],
  );
});

test("skill-only sync preflights conflicts across all clients before changing any resource", async (t) => {
  const { root } = await fixture(t);
  const preserved = join(
    root,
    clients.generic.skillsPath,
    "contextory-codebase/references/retrieval.md",
  );
  await mkdir(join(preserved, ".."), { recursive: true });
  await writeFile(preserved, "user-owned reference");
  await assert.rejects(syncProviderSkills(root, clientIds), {
    code: "CONFIG_CONFLICT",
  });
  await assert.rejects(access(join(root, clients.codex.skillsPath)));
  assert.equal(await readFile(preserved, "utf8"), "user-owned reference");
});
test("generic MCP exports portable skills and resources without hooks or native config", async (t) => {
  const { root } = await fixture(t),
    r = registration(root, "generic");
  const result = await configureProvider(r);
  assert.ok(
    parse(await readFile(result.files[0], "utf8")).mcpServers[
      registrationName(root)
    ],
  );
  for (const [path, body] of Object.entries(skillFiles))
    assert.equal(
      await readFile(join(root, ".contextory/skills", path), "utf8"),
      body,
    );
  for (const path of [
    ".codex/config.toml",
    ".claude/settings.local.json",
    ".bob/settings.json",
  ])
    await assert.rejects(access(join(root, path)));
  await configureProvider(r, true);
  await assert.rejects(
    access(join(root, ".contextory/skills/contextory-codebase/SKILL.md")),
  );
});
for (const provider of ["codex", "claude", "bob"] as const)
  test(`${provider}: preserves settings, repeated connect is idempotent and owned disconnect works`, async (t) => {
    const { root } = await fixture(t);
    const r = registration(root, provider);
    const folder =
      provider === "codex"
        ? ".codex"
        : provider === "claude"
          ? ".claude"
          : ".bob";
    await mkdir(join(root, folder));
    const hooksFile = join(
      root,
      folder,
      provider === "codex"
        ? "hooks.json"
        : provider === "claude"
          ? "settings.local.json"
          : "settings.json",
    );
    const existing = {
      hooks: {
        Stop: [
          {
            matcher: "custom",
            hooks: [{ type: "command", command: "echo user-owned" }],
          },
          { matcher: "empty", hooks: [] },
        ],
      },
      userSetting: true,
    };
    await writeFile(
      hooksFile,
      "// existing comment\n" + JSON.stringify(existing, null, 2),
    );
    if (provider === "codex")
      await writeFile(
        join(root, ".codex/config.toml"),
        '# user comment\nmodel = "user-model"\n',
      );
    const result = await configureProvider(r);
    const workflow = await readFile(result.files[2], "utf8");
    assert.match(workflow, /action=complete/);
    assert.match(workflow, /contextory_flow_trace/);
    assert.match(workflow, /contextory_search/);
    const first = await readFile(hooksFile, "utf8");
    await configureProvider(r);
    assert.equal(await readFile(hooksFile, "utf8"), first);
    assert.ok(first.includes("// existing comment"));
    assert.equal(parse(first).hooks.Stop.length, 3);
    assert.equal(
      Boolean(parse(first).hooks.PostModelRequest),
      provider === "codex",
    );
    assert.equal(
      Boolean(parse(first).hooks.PostModelSwitch),
      provider === "claude",
    );
    if (provider === "codex")
      assert.match(
        await readFile(result.files[0], "utf8"),
        /model = "user-model"/,
      );
    else
      assert.ok(
        parse(await readFile(result.files[0], "utf8")).mcpServers[
          registrationName(root)
        ],
      );
    await configureProvider(r, true);
    assert.deepEqual(parse(await readFile(hooksFile, "utf8")), existing);
    await assert.rejects(access(result.files[2]));
  });
test("late configuration conflict leaves every earlier file untouched", async (t) => {
  const { root } = await fixture(t);
  const skillDirectory = join(root, ".claude/skills/contextory-workflow");
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(join(skillDirectory, "SKILL.md"), "user-owned skill");
  await assert.rejects(configureProvider(registration(root, "claude")), {
    code: "CONFIG_CONFLICT",
  });
  await assert.rejects(access(join(root, ".mcp.json")));
  await assert.rejects(access(join(root, ".claude/settings.local.json")));
  assert.equal(
    await readFile(join(skillDirectory, "SKILL.md"), "utf8"),
    "user-owned skill",
  );
});
test("linked config ancestor is rejected before creating anything outside the workspace", async (t) => {
  const { root, directory } = await fixture(t);
  const outside = join(directory, "outside");
  await mkdir(outside);
  await symlink(
    outside,
    join(root, ".bob"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(configureProvider(registration(root, "bob")), {
    code: "LINKED_CONFIG",
  });
  await assert.rejects(access(join(outside, "mcp.json")));
});
