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
      "contextory-local.contextory-workspace",
    );
    assert.ok(extension);
    result.extensionPath = extension.extensionPath;
    const api = await extension.activate();
    assert.ok(extension.isActive);
    result.checks.push("extension activation");
    await api.ready;
    const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const config = vscode.workspace.getConfiguration("contextory");
    assert.equal(config.get("startupAgent"), "auto");
    if (!config.get("autoConnect")) {
      for (const file of [".codex/config.toml", ".mcp.json", ".bob/mcp.json"])
        assert.ok(!fs.existsSync(path.join(root, file)));
      await vscode.commands.executeCommand("contextory.toggleAutoConnect");
      result.checks.push(
        "paused cold startup creates no provider configuration; resume discovers installed agents",
      );
    }
    assert.equal(
      vscode.workspace.getConfiguration("contextory").get("autoConnect"),
      true,
    );
    assert.ok(fs.existsSync(path.join(root, ".codex/config.toml")));
    assert.ok(fs.existsSync(path.join(root, ".mcp.json")));
    if (/\bbob\b/i.test(vscode.env.appName)) {
      assert.ok(fs.existsSync(path.join(root, ".bob/mcp.json")));
      assert.ok(fs.existsSync(path.join(root, ".bob/settings.json")));
    } else assert.ok(!fs.existsSync(path.join(root, ".bob/mcp.json")));
    assert.equal(
      vscode.extensions.getExtension("openai.chatgpt").isActive,
      false,
    );
    assert.equal(
      vscode.extensions.getExtension("Anthropic.claude-code").isActive,
      false,
    );
    result.checks.push(
      "all detected inactive agent extensions and Bob host configured automatically before opening Contextory; no chosen default or native session required",
    );
    const beforePause = fs.readFileSync(path.join(root, ".mcp.json"), "utf8");
    await vscode.commands.executeCommand("contextory.toggleAutoConnect");
    assert.equal(
      vscode.workspace.getConfiguration("contextory").get("autoConnect"),
      false,
    );
    assert.equal(
      fs.readFileSync(path.join(root, ".mcp.json"), "utf8"),
      beforePause,
    );
    await vscode.commands.executeCommand("contextory.toggleAutoConnect");
    assert.equal(
      vscode.workspace.getConfiguration("contextory").get("autoConnect"),
      true,
    );
    assert.equal(
      fs.readFileSync(path.join(root, ".mcp.json"), "utf8"),
      beforePause,
    );
    result.checks.push(
      "workspace pause/resume persists without removing or rewriting existing agent configuration",
    );
    const commands = await vscode.commands.getCommands(true);
    for (const command of [
      "contextory.refresh",
      "contextory.traceFlowFromHere",
      "contextory.connectNativeClaude",
      "contextory.connectNativeCodex",
      "contextory.connectNativeBob",
      "contextory.connectGenericMcp",
      "contextory.openArchitecture",
    ])
      assert.ok(commands.includes(command), command);
    const health = await api.health();
    assert.ok(Number(health.node.split(".")[0]) >= 24);
    result.checks.push("isolated Node 24 workspace service");
    await vscode.commands.executeCommand("contextory.openArchitecture");
    const architecture = await api.tool("contextory_code_architecture_get", {
      refresh: true,
    });
    assert.ok(architecture.status.files > 0);
    const context = await api.tool("contextory_code_context_get", {
      query: "start",
      budgetTokens: 1500,
    });
    assert.ok(context.symbols.some((symbol) => symbol.name === "start"));
    assert.ok(
      Buffer.byteLength(JSON.stringify(context)) <= context.budgetBytes,
    );
    const connected = await api.tool("contextory_code_path_get", {
      from: "start",
      to: "next",
      direction: "forward",
    });
    assert.ok(connected.found);
    await vscode.commands.executeCommand("contextory.connectGenericMcp");
    assert.ok(fs.existsSync(path.join(root, ".contextory/mcp.json")));
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          ".contextory/skills/contextory-codebase/references/retrieval.md",
        ),
      ),
    );
    result.checks.push(
      "architecture workbench, source context/path tools and generic MCP export with portable skills",
    );
    await vscode.commands.executeCommand("contextory.tasks.focus");
    result.checks.push("sidebar view opens");
    const request = await api.tool("contextory_request_change", {
      operationId: crypto.randomUUID(),
      action: "create",
      title: "Host smoke request",
      description: "Native companion host test",
    });
    assert.equal(request.data.provenance, "developer");
    result.checks.push("host to service workflow mutation");
    const usage = await api.tool("contextory_usage_get", {
      entityId: request.id,
    });
    assert.equal(usage.origin, "native-hook");
    assert.equal(usage.availability, "unavailable");
    assert.equal(usage.attempts, 0);
    result.checks.push(
      "native model/usage query with explicit unavailable counters",
    );
    for (const provider of ["Codex", "Claude", "Bob"])
      await vscode.commands.executeCommand(
        `contextory.connectNative${provider}`,
      );
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
    const referenceRoot = path.join(path.dirname(root), "reference");
    fs.mkdirSync(referenceRoot);
    const referenceSource =
      "function start(){referenceNext()} function referenceNext(){}";
    fs.writeFileSync(path.join(referenceRoot, "main.ts"), referenceSource);
    const reference = await api.tool("contextory_codebase_change", {
      action: "add",
      root: referenceRoot,
      name: "Legacy source",
      operationId: crypto.randomUUID(),
    });
    const referenceArchitecture = await api.tool(
      "contextory_code_architecture_get",
      { codebaseId: reference.id },
    );
    assert.equal(
      referenceArchitecture.codebase.root.toLowerCase(),
      referenceRoot.toLowerCase(),
    );
    assert.equal(referenceArchitecture.status.files, 1);
    const referenceFlow = await api.trace(
      {
        codebaseId: reference.id,
        root: { path: "main.ts", symbol: "start" },
        view: "flow",
      },
      undefined,
      false,
    );
    assert.equal(referenceFlow.codebase.id, reference.id);
    assert.equal(referenceFlow.unsaved, false);
    assert.ok(referenceFlow.nodes.some((n) => n.label === "referenceNext"));
    assert.ok(!referenceFlow.nodes.some((n) => n.label === "unsaved"));
    await api.tool("contextory_codebase_change", {
      action: "remove",
      codebaseId: reference.id,
      operationId: crypto.randomUUID(),
    });
    assert.equal(
      (await api.tool("contextory_codebase_list", {})).references.length,
      0,
    );
    assert.equal(
      fs.readFileSync(path.join(referenceRoot, "main.ts"), "utf8"),
      referenceSource,
    );
    assert.deepEqual(fs.readdirSync(referenceRoot), ["main.ts"]);
    result.checks.push(
      "isolated reference architecture and source flow ignore current editor overlays; detach preserves source",
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
    await vscode.commands.executeCommand("contextory.tasks.focus");
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
    const nativePythonGraph = await api.tool("contextory_flow_trace", {
      root: { path: "main.py", symbol: "main" },
      view: "flow",
    });
    assert.ok(nativePythonGraph.nodes.some((n) => n.label === "print_2"));
    result.checks.push(
      "Python agent-tool flow without an editor language provider",
    );
    const milestone = await api.tool("contextory_spec_change", {
      operationId: crypto.randomUUID(),
      action: "milestone",
      parentId: request.id,
      title: "Source navigation",
    });
    const spec = await api.tool("contextory_spec_change", {
      operationId: crypto.randomUUID(),
      action: "create",
      parentId: milestone.id,
      title: "Explain source relationships",
      description: "Show how the request connects to implementation files",
      paths: ["main.ts"],
      criteria: ["Related source is identifiable"],
    });
    await api.tool("contextory_relationship_change", {
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
        .some((t) => t.label === "Contextory: Relationships"),
    );
    result.checks.push(
      "dedicated relationship workbench tab with request titles, descriptions and source files",
    );
    await api.refresh();
    await vscode.commands.executeCommand("contextory.exportReport", request.id);
    result.checks.push("request-scoped report opens from service artifact");
    const storage = await api.storage();
    assert.ok(fs.existsSync(path.join(storage, "project.sqlite3")));
    result.checks.push("persistent SQLite ledger");
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
