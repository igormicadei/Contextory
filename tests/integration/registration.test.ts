import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, symlink, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "jsonc-parser";
import {
  configureProvider,
  registrationName,
  type Registration,
} from "../../src/providers/registration";
import { fixture } from "../helpers";
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
