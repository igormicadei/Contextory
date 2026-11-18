const vscode = require("vscode");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
exports.run = async function () {
  const result = {
    recordedAt: new Date().toISOString(),
    host: vscode.env.appName,
    vscode: vscode.version,
    checks: [],
    passed: false,
  };
  const waitFor = async (probe) => {
    for (let i = 0; i < 100; i++) {
      const value = await probe();
      if (value) return value;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Workspace lifecycle timed out");
  };
  try {
    const api = await vscode.extensions
      .getExtension("contextory-local.contextory-workspace")
      .activate();
    await api.ready;
    const [alpha, beta] = (await api.projects()).projects;
    assert.equal(alpha.name, "Alpha");
    assert.equal(beta.name, "Beta");
    assert.notEqual(alpha.id, beta.id);
    assert.ok(fs.existsSync(path.join(alpha.root, ".codex/config.toml")));
    assert.ok(!fs.existsSync(path.join(beta.root, ".codex/config.toml")));
    const alphaStorage = await api.storage();
    const request = await api.tool("contextory_request_change", {
      action: "create",
      operationId: crypto.randomUUID(),
      title: "Alpha only",
      description: "Keep local work separate",
    });
    await api.selectProject(beta.id);
    const betaStorage = await api.storage();
    assert.notEqual(alphaStorage, betaStorage);
    await assert.rejects(
      api.tool("contextory_entity_get", { id: request.id }),
      { code: "NOT_FOUND" },
    );
    const recipes = (await api.tool("contextory_context_get", {})).recipes;
    assert.deepEqual(
      recipes.map((r) => r.id),
      ["beta"],
    );
    const source = await api.tool("contextory_code_context_get", {
      query: "start",
      paths: ["main.ts"],
      budgetTokens: 1500,
    });
    assert.match(JSON.stringify(source.symbols), /beta/);
    await api.openSource({ path: "main.ts", line: 0 });
    assert.equal(
      vscode.window.activeTextEditor.document.uri.fsPath.toLowerCase(),
      path.join(beta.root, "main.ts").toLowerCase(),
    );
    result.checks.push(
      "distinct project identities, SQLite storage, requests, source symbols, source navigation and folder check settings",
    );
    await vscode.commands.executeCommand("contextory.toggleAutoConnect");
    assert.ok(fs.existsSync(path.join(beta.root, ".codex/config.toml")));
    assert.equal(
      vscode.workspace
        .getConfiguration("contextory", vscode.Uri.file(alpha.root))
        .get("autoConnect"),
      true,
    );
    assert.equal(
      vscode.workspace
        .getConfiguration("contextory", vscode.Uri.file(beta.root))
        .get("autoConnect"),
      true,
    );
    result.checks.push(
      "root-specific paused startup and resume configure only the intended folder",
    );
    await api.selectProject(alpha.id);
    const group = await api.tool("contextory_workspace_request_create", {
      operationId: crypto.randomUUID(),
      projectIds: [alpha.id, beta.id],
      title: "Shared contract migration",
      description: "Independent project branches",
    });
    assert.equal(group.branches.length, 2);
    assert.equal(group.partial, false);
    await api.selectProject(beta.id);
    const fromBeta = await api.tool("contextory_workspace_get", {
      groupId: group.id,
    });
    assert.equal(fromBeta.id, group.id);
    assert.notEqual(group.branches[0].request.id, group.branches[1].request.id);
    const alphaDoc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(alpha.root, "main.ts")),
    );
    await vscode.window.showTextDocument(alphaDoc, {
      selection: new vscode.Range(0, 10, 0, 10),
    });
    const graph = await api.trace();
    assert.ok(graph.nodes.length);
    assert.equal(await api.storage(), alphaStorage);
    result.checks.push(
      "cross-project branch navigation and editor cursor tracing select the actual source project",
    );
    await api.selectProject(beta.id);
    assert.ok(vscode.workspace.updateWorkspaceFolders(1, 1));
    await waitFor(
      async () =>
        vscode.workspace.workspaceFolders.length === 1 &&
        (await api.projects()).projects.length === 1,
    );
    assert.equal(await api.storage(), alphaStorage);
    const incomplete = await api.tool("contextory_workspace_get", {
      groupId: group.id,
    });
    assert.equal(incomplete.state, "incomplete");
    await waitFor(async () =>
      vscode.workspace.updateWorkspaceFolders(1, 0, {
        uri: vscode.Uri.file(beta.root),
        name: "Beta",
      }),
    );
    await waitFor(
      async () =>
        vscode.workspace.workspaceFolders.length === 2 &&
        (await api.projects()).projects.length === 2,
    );
    await api.selectProject(beta.id);
    assert.equal(await api.storage(), betaStorage);
    assert.equal(
      (await api.tool("contextory_workspace_get", { groupId: group.id }))
        .partial,
      false,
    );
    result.checks.push(
      "remove selected folder detaches routing; re-add preserves stable storage, identity and request records",
    );
    result.passed = true;
  } catch (error) {
    result.error = error instanceof Error ? error.stack : String(error);
    throw error;
  } finally {
    fs.mkdirSync(path.dirname(process.env.CONTEXTORY_SMOKE_REPORT), {
      recursive: true,
    });
    fs.writeFileSync(
      process.env.CONTEXTORY_SMOKE_REPORT,
      JSON.stringify(result, null, 2) + "\n",
    );
  }
};
