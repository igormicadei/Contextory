const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
exports.activate = () => {
  const reportPath = process.env.CONTEXTORY_RELOAD_REPORT;
  if (!reportPath) return;
  const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const marker = path.join(root, "reload-probe.json");
  const count = fs.existsSync(marker)
    ? JSON.parse(fs.readFileSync(marker)).activations + 1
    : 1;
  fs.writeFileSync(marker, JSON.stringify({ activations: count }));
  void (async () => {
    const report = {
      recordedAt: new Date().toISOString(),
      host: vscode.env.appName,
      vscode: vscode.version,
      activations: count,
      passed: false,
      checks: [],
    };
    try {
      assert.ok(count <= 2, "Setup created a restart loop");
      const extension = vscode.extensions.getExtension(
        "contextory-local.contextory-workspace",
      );
      const api = await extension.activate();
      await api.ready;
      if (count === 1) {
        await new Promise((resolve) => setTimeout(resolve, 15000));
        throw new Error("Automatic setup did not restart the Extension Host");
      }
      assert.equal(
        vscode.workspace
          .getConfiguration("contextory")
          .get("restartAfterSetup"),
        "automatic",
      );
      assert.ok(fs.existsSync(path.join(root, ".codex/config.toml")));
      assert.ok(fs.existsSync(path.join(root, ".codex/hooks.json")));
      const commands = await vscode.commands.getCommands(true);
      for (const id of [
        "contextory.restartAgentExtensions",
        "contextory.checkConnections",
        "workbench.action.restartExtensionHost",
      ])
        assert.ok(commands.includes(id), id);
      report.checks.push(
        "actual automatic first-setup Extension Host restart; configuration survives and public commands are registered",
      );
      const storage = await api.storage();
      const descriptor = JSON.parse(
        fs.readFileSync(path.join(storage, "ui.json")),
      );
      const rpc = async (method, params = {}) => {
        const response = await fetch(descriptor.url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${descriptor.token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ method, params }),
        });
        const packet = await response.json();
        assert.ok(!packet.error, JSON.stringify(packet.error));
        return packet.result;
      };
      const connection = () =>
        rpc("dashboard").then((d) =>
          d.connections.find((c) => c.provider === "codex"),
        );
      assert.equal((await connection()).hookCurrent, false);
      const node = vscode.workspace
        .getConfiguration("contextory")
        .get("nodeExecutable");
      const hook = promisify(execFile)(
        node,
        [
          path.join(storage, "runtime/contextory-hook.mjs"),
          path.join(storage, "codex-hook.json"),
          "codex",
        ],
        { windowsHide: true, timeout: 15000 },
      );
      hook.child.stdin.end(
        JSON.stringify({
          hook_event_name: "SessionStart",
          session_id: "isolated-reload-probe",
          cwd: root,
        }),
      );
      const output = await hook;
      assert.ok(
        JSON.parse(output.stdout).hookSpecificOutput.additionalContext.includes(
          "Contextory",
        ),
      );
      assert.equal((await connection()).hookCurrent, true);
      report.checks.push(
        "installed hook executes after restart; status changes only after the hook is actually observed (native trust is not simulated)",
      );
      const original = fs.readFileSync(
        path.join(root, ".codex/config.toml"),
        "utf8",
      );
      await vscode.commands.executeCommand("contextory.connectNativeCodex");
      assert.equal(
        fs.readFileSync(path.join(root, ".codex/config.toml"), "utf8"),
        original,
      );
      await new Promise((resolve) => setTimeout(resolve, 1800));
      assert.equal(JSON.parse(fs.readFileSync(marker)).activations, 2);
      report.checks.push(
        "unchanged reconnect does not rewrite config or restart again",
      );
      report.passed = true;
    } catch (error) {
      report.error = error.stack || String(error);
    } finally {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
      setTimeout(
        () => void vscode.commands.executeCommand("workbench.action.quit"),
        500,
      );
    }
  })();
};
