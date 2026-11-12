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
  try {
    const extension = vscode.extensions.getExtension(
      "relay-local.relay-workspace",
    );
    assert.ok(extension);
    result.extensionPath = extension.extensionPath;
    const api = await extension.activate();
    assert.ok(extension.isActive);
    result.checks.push("extension activation");
    const commands = await vscode.commands.getCommands(true);
    for (const command of [
      "relay.refresh",
      "relay.traceFlowFromHere",
      "relay.connectNativeClaude",
      "relay.connectNativeCodex",
      "relay.connectNativeBob",
    ])
      assert.ok(commands.includes(command), command);
    const health = await api.health();
    assert.ok(Number(health.node.split(".")[0]) >= 24);
    result.checks.push("isolated Node 24 workspace service");
    await vscode.commands.executeCommand("relay.tasks.focus");
    result.checks.push("sidebar view opens");
    const request = await api.tool("relay_request_change", {
      operationId: crypto.randomUUID(),
      action: "create",
      title: "Host smoke request",
      description: "Native companion host test",
    });
    assert.equal(request.data.provenance, "developer");
    result.checks.push("host to service workflow mutation");
    const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
    for (const provider of ["Codex", "Claude", "Bob"])
      await vscode.commands.executeCommand(`relay.connectNative${provider}`);
    for (const file of [
      ".codex/config.toml",
      ".codex/hooks.json",
      ".mcp.json",
      ".claude/settings.local.json",
      ".bob/mcp.json",
      ".bob/settings.json",
    ])
      assert.ok(fs.existsSync(path.join(root, file)), file);
    result.checks.push(
      "all three native provider configurations generated in disposable workspace",
    );
    const source = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(root, "main.ts")),
    );
    const editor = await vscode.window.showTextDocument(source);
    editor.selection = new vscode.Selection(
      new vscode.Position(0, 30),
      new vscode.Position(0, 30),
    );
    const graph = await api.trace({
      root: { path: "main.ts", symbol: "start" },
      view: "flow",
    });
    assert.ok(graph.nodes.some((n) => n.kind === "branch"));
    assert.ok(graph.nodes.some((n) => n.label === "next"));
    result.checks.push("worker source flow with branches and call targets");
    await editor.edit((edit) =>
      edit.replace(
        new vscode.Range(0, 0, source.lineCount, 0),
        "function unsaved(){} function start(){unsaved();}",
      ),
    );
    const unsaved = await api.trace({
      root: { path: "main.ts", symbol: "start" },
      view: "calls",
    });
    assert.ok(unsaved.unsaved);
    assert.ok(unsaved.nodes.some((n) => n.label === "unsaved"));
    result.checks.push(
      "unsaved buffer overlay survives UI to service boundary",
    );
    assert.ok(
      fs.existsSync(path.join(extension.extensionPath, "dist/python-flow.py")),
    );
    const pythonPath = path.join(root, "main.py");
    fs.writeFileSync(
      pythonPath,
      'def main():\n    print_2(val="Hello, world!")\n\ndef print_2(val: str) -> None:\n    print(val)\n',
      "utf8",
    );
    const pythonSource = await vscode.workspace.openTextDocument(
      vscode.Uri.file(pythonPath),
    );
    const pythonEditor = await vscode.window.showTextDocument(pythonSource);
    pythonEditor.selection = new vscode.Selection(1, 4, 1, 4);
    await vscode.commands.executeCommand("relay.tasks.focus");
    const mapTabs = () =>
      vscode.window.tabGroups.all
        .flatMap((g) => g.tabs)
        .filter((t) => t.input instanceof vscode.TabInputWebview).length;
    const beforeTabs = mapTabs();
    const pythonGraph = await api.trace(undefined, { view: "flow" }, false);
    assert.equal(pythonGraph.root.path, "main.py");
    assert.ok(
      pythonGraph.nodes.some(
        (n) => n.kind === "function" && n.label === "print_2",
      ),
    );
    assert.equal(mapTabs(), beforeTabs);
    result.checks.push(
      "Python AST flow from remembered editor cursor; sidebar tracing creates no extra editor tab",
    );
    const nativePythonGraph = await api.tool("relay_flow_trace", {
      root: { path: "main.py", symbol: "main" },
      view: "flow",
    });
    assert.ok(nativePythonGraph.nodes.some((n) => n.label === "print_2"));
    result.checks.push(
      "Python agent-tool flow without an editor language provider",
    );
    const milestone = await api.tool("relay_spec_change", {
      operationId: crypto.randomUUID(),
      action: "milestone",
      parentId: request.id,
      title: "Source navigation",
    });
    const spec = await api.tool("relay_spec_change", {
      operationId: crypto.randomUUID(),
      action: "create",
      parentId: milestone.id,
      title: "Explain source relationships",
      description: "Show how the request connects to implementation files",
      paths: ["main.ts"],
      criteria: ["Related source is identifiable"],
    });
    await api.tool("relay_relationship_change", {
      operationId: crypto.randomUUID(),
      from: spec.id,
      source: { path: "main.ts", symbol: "start" },
      kind: "implements",
      rationale: "The entry function implements this request",
    });
    const relationships = await api.relationships(spec.id);
    assert.equal(relationships.subject.title, spec.title);
    assert.ok(relationships.nodes.some((n) => n.title === request.title));
    assert.ok(
      relationships.nodes.some(
        (n) => n.kind === "source" && n.sources[0].path === "main.ts",
      ),
    );
    assert.ok(
      vscode.window.tabGroups.all
        .flatMap((g) => g.tabs)
        .some((t) => t.label === "Relay: Relationships"),
    );
    result.checks.push(
      "dedicated relationship workbench tab with request titles, descriptions and source files",
    );
    await api.refresh();
    await vscode.commands.executeCommand("relay.exportReport", request.id);
    result.checks.push("request-scoped report opens from service artifact");
    const storage = await api.storage();
    assert.ok(fs.existsSync(path.join(storage, "project.sqlite3")));
    result.checks.push("persistent SQLite ledger");
    result.passed = true;
  } catch (error) {
    result.error = error instanceof Error ? error.stack : String(error);
    throw error;
  } finally {
    fs.mkdirSync(path.dirname(process.env.RELAY_SMOKE_REPORT), {
      recursive: true,
    });
    fs.writeFileSync(
      process.env.RELAY_SMOKE_REPORT,
      JSON.stringify(result, null, 2) + "\n",
    );
  }
};
