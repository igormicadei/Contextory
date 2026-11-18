import * as vscode from "vscode";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, realpath } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { ServiceClient } from "./service/client";
import { configureProvider } from "./providers/registration";
import { isClient } from "./providers/clients";
import { SetupReload, type ReloadMode } from "./providers/reload";
import {
  latestNativeAgent,
  detectedProviders,
  startupProviders,
  type RememberedAgent,
  type StartupAgent,
} from "./providers/startup";
import { editorCallGraph } from "./editor/calls";
import { webviewDocument } from "./webview/document";
import type {
  Dashboard,
  AgentAutomation,
  FlowGraph,
  FlowInput,
  Provider,
  RelationshipGraph,
} from "./contracts/model";
let active: ServiceClient | undefined;
export async function deactivate() {
  await active?.close();
  active = undefined;
}
export async function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Contextory");
  context.subscriptions.push(output);
  let view: vscode.WebviewView | undefined;
  let panel: vscode.WebviewPanel | undefined;
  let relationshipPanel: vscode.WebviewPanel | undefined;
  let architecturePanel: vscode.WebviewPanel | undefined;
  let lastRelationships: RelationshipGraph | undefined;
  let relationshipRequest = 0;
  let pendingRecord: string | undefined;
  let opening: Promise<ServiceClient> | undefined;
  let lastGraph: FlowGraph | undefined;
  let lastSource: FlowInput["root"] | undefined;
  const agentKey = "contextory.lastAgent";
  const disabledKey = "contextory.disconnectedAgents";
  const setupReload = new SetupReload(
    context.workspaceState,
    async () =>
      (await vscode.window.showInformationMessage(
        "Contextory installed or updated workspace MCP/hooks. Restart the Extension Host to reload native integrations, then resume your chat. Hook trust remains in the native client; restarting interrupts active extension tasks.",
        "Restart Extension Host",
        "Later",
      )) === "Restart Extension Host",
    async () =>
      await vscode.commands.executeCommand(
        "workbench.action.restartExtensionHost",
      ),
  );
  const offerSetupReload = () => {
    void setupReload
      .offer(
        vscode.workspace
          .getConfiguration("contextory")
          .get<ReloadMode>("restartAfterSetup", "prompt"),
      )
      .catch((error) => output.appendLine(`Setup reload: ${error.message}`));
  };
  const automation = (): AgentAutomation => ({
    enabled: vscode.workspace
      .getConfiguration("contextory")
      .get("autoConnect", true),
    detected: detectedProviders(
      vscode.env.appName,
      vscode.extensions.all.map((extension) => extension.id),
    ),
    host: vscode.env.appName,
  });
  let connectionsPending = Promise.resolve();
  const queueConnections = <T>(work: () => Promise<T>): Promise<T> => {
    const next = connectionsPending.then(work);
    connectionsPending = next.then(
      () => {},
      () => {},
    );
    return next;
  };
  const rememberAgent = async (agent: RememberedAgent) => {
    const workspace = context.workspaceState.get<RememberedAgent>(agentKey);
    if (!workspace || agent.at > workspace.at)
      await context.workspaceState.update(agentKey, agent);
    const global = context.globalState.get<RememberedAgent>(agentKey);
    if (!global || agent.at > global.at)
      await context.globalState.update(agentKey, agent);
  };
  const rememberEditor = (editor: vscode.TextEditor | undefined) => {
    if (
      editor?.document.uri.scheme === "file" &&
      vscode.workspace.getWorkspaceFolder(editor.document.uri)
    )
      lastSource = {
        path: vscode.workspace.asRelativePath(editor.document.uri, false),
        position: {
          line: editor.selection.active.line,
          character: editor.selection.active.character,
        },
        start: "cursor",
      };
  };
  rememberEditor(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(rememberEditor),
    vscode.window.onDidChangeTextEditorSelection((e) =>
      rememberEditor(e.textEditor),
    ),
  );
  const post = (message: unknown) => {
    void view?.webview.postMessage(message);
    void panel?.webview.postMessage(message);
    void relationshipPanel?.webview.postMessage(message);
    void architecturePanel?.webview.postMessage(message);
  };
  const root = () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length || folders[0].uri.scheme !== "file")
      throw new Error("Open a trusted local folder to use Contextory.");
    if (folders.length !== 1)
      throw new Error(
        "Open this project as a single-folder workspace. Multi-root selection is not yet qualified.",
      );
    if (!vscode.workspace.isTrusted)
      throw new Error(
        "Trust this workspace before connecting agents or running analysis/checks.",
      );
    return folders[0].uri.fsPath;
  };
  const refresh = async () => {
    const client = await service();
    const dashboard = await client.call<Dashboard>("dashboard");
    const observed = latestNativeAgent(dashboard.connections);
    if (observed) await rememberAgent(observed);
    post({
      type: "restore",
      dashboard,
      automation: automation(),
    });
  };
  const handleEvent = (event: Record<string, unknown>) => {
    if (event.type === "changed" || event.type === "connected")
      void refresh().catch((error) =>
        post({ type: "notice", text: error.message }),
      );
    else if (event.type === "editor.trace")
      void editorCallGraph(root(), event.input as FlowInput).then(
        (graph) => active?.call("editor.response", { id: event.id, graph }),
        (error) =>
          active?.call("editor.response", {
            id: event.id,
            error: error.message,
          }),
      );
    else if (event.type === "disconnected") {
      opening = undefined;
      post({
        type: "notice",
        text: "Contextory service disconnected. Refresh to reconnect; native work can continue.",
      });
    }
  };
  const service = (): Promise<ServiceClient> =>
    (opening ??= (async () => {
      const path = await realpath(root());
      const storage = join(
        context.globalStorageUri.fsPath,
        "projects",
        createHash("sha256")
          .update(process.platform === "win32" ? path.toLowerCase() : path)
          .digest("hex")
          .slice(0, 24),
      );
      const client = new ServiceClient(
        path,
        storage,
        context.extensionUri.fsPath,
        vscode.workspace
          .getConfiguration("contextory")
          .get("nodeExecutable", "node"),
        join(context.globalStorageUri.fsPath, "embeddings"),
        handleEvent,
        (text) => output.appendLine(text),
      );
      await active?.close();
      active = client;
      await client.start();
      await client.call("configure", {
        recipes: vscode.workspace
          .getConfiguration("contextory")
          .get("checks", []),
        pythonExecutable: vscode.workspace
          .getConfiguration("contextory")
          .get("pythonExecutable", "python"),
      });
      try {
        await prepareStartupAgents(client, true);
      } catch (error) {
        const text = `Startup agent configuration: ${error instanceof Error ? error.message : String(error)}`;
        output.appendLine(text);
        post({ type: "notice", text });
      }
      return client;
    })().catch((error) => {
      opening = undefined;
      throw error;
    }));
  const run = async (work: () => Promise<unknown>) => {
    post({ type: "busy", value: true });
    try {
      return await work();
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Contextory operation failed.";
      post({ type: "notice", text });
      output.appendLine(text);
      return undefined;
    } finally {
      post({ type: "busy", value: false });
    }
  };
  const registerAgent = async (
    client: ServiceClient,
    provider: Provider,
    remove = false,
  ) => {
    const result = await configureProvider(
      {
        root: root(),
        provider,
        node: client.node,
        proxy: join(client.storage, "runtime/mcp-proxy.mjs"),
        hook: join(client.storage, "runtime/contextory-hook.mjs"),
        descriptor: join(client.storage, `${provider}.json`),
        hookDescriptor: join(client.storage, `${provider}-hook.json`),
      },
      remove,
    );
    await client.call("provider.configured", { provider, configured: !remove });
    if (
      !remove &&
      provider !== "generic" &&
      (result.connectionChanged || client.bridgeChanged)
    )
      await setupReload.changed(
        provider,
        `${result.connectionFingerprint}:${client.bridgeFingerprint}`,
        result.connectionChanged,
      );
    return result;
  };
  const prepareStartupAgents = (
    client: ServiceClient,
    refreshExisting = false,
  ) =>
    queueConnections(async () => {
      const state = automation();
      if (!state.enabled) return;
      const current = await client.call<Dashboard>("dashboard");
      const preference = vscode.workspace
        .getConfiguration("contextory")
        .get<StartupAgent>("startupAgent", "auto");
      const disabled = context.workspaceState.get<Provider[]>(disabledKey, []);
      const providers = startupProviders({
        preference,
        enabled: state.enabled,
        detected: state.detected,
        workspace: context.workspaceState.get<RememberedAgent>(agentKey),
        global: context.globalState.get<RememberedAgent>(agentKey),
        connections: current.connections,
        disabled,
      });
      const configured = current.connections
        .filter((connection) => connection.configured)
        .map((connection) => connection.provider);
      const targets = [
        ...new Set([
          ...providers,
          ...(refreshExisting && preference !== "none"
            ? configured.filter((provider) => !disabled.includes(provider))
            : []),
        ]),
      ];
      for (const provider of targets) {
        if (!automation().enabled) break;
        if (!refreshExisting && configured.includes(provider)) continue;
        try {
          await registerAgent(client, provider);
          output.appendLine(
            `Automatic connection ${provider}: workspace MCP/hooks ready for the native client.`,
          );
        } catch (error) {
          const text = `${provider}: ${error instanceof Error ? error.message : String(error)}`;
          output.appendLine(`Automatic connection failed: ${text}`);
          post({
            type: "notice",
            text: `Automatic connection needs attention: ${text}`,
          });
        }
      }
      offerSetupReload();
    });
  const connect = async (provider: Provider, remove = false) => {
    const client = await service();
    const result = await queueConnections(async () => {
      const result = await registerAgent(client, provider, remove);
      const disabled = context.workspaceState
        .get<Provider[]>(disabledKey, [])
        .filter((p) => p !== provider);
      if (remove) disabled.push(provider);
      await context.workspaceState.update(disabledKey, disabled);
      if (!remove) await rememberAgent({ provider, at: Date.now() });
      return result;
    });
    post({ type: "notice", text: result.instruction });
    await refresh();
    offerSetupReload();
    return result;
  };
  const setAutoConnect = async (enabled: boolean) => {
    await vscode.workspace
      .getConfiguration("contextory")
      .update("autoConnect", enabled, vscode.ConfigurationTarget.Workspace);
    post({ type: "automation", automation: automation() });
    if (
      !vscode.workspace.isTrusted ||
      vscode.workspace.workspaceFolders?.length !== 1 ||
      vscode.workspace.workspaceFolders[0].uri.scheme !== "file"
    )
      return;
    const client = await service();
    await prepareStartupAgents(client);
    await refresh();
  };
  const showMap = () => {
    if (!panel) {
      panel = vscode.window.createWebviewPanel(
        "contextory.flow",
        "Contextory · Source Flow",
        vscode.ViewColumn.Beside,
        { enableScripts: true, localResourceRoots: [context.extensionUri] },
      );
      panel.webview.html = document(panel.webview, "flow");
      panel.webview.onDidReceiveMessage(
        (message) => {
          void receive(message, panel?.webview);
        },
        undefined,
        context.subscriptions,
      );
      panel.onDidDispose(() => {
        panel = undefined;
      });
    }
    panel.reveal(vscode.ViewColumn.Beside, true);
  };
  const trace = async (
    provided?: FlowInput,
    options?: Pick<FlowInput, "view" | "limits">,
    inPanel = true,
  ) => {
    const client = await service();
    let input = provided;
    if (!input) {
      rememberEditor(vscode.window.activeTextEditor);
      if (!lastSource)
        throw new Error("Place the cursor inside a source function first.");
      input = {
        root: lastSource,
        view: /\.(?:[cm]?[jt]sx?|py)$/.test(lastSource.path) ? "flow" : "calls",
        limits: {
          callDepth: vscode.workspace
            .getConfiguration("contextory")
            .get("flowDepth", 5),
        },
      };
    }
    input.overlays =
      input.codebaseId && input.codebaseId !== "current"
        ? undefined
        : Object.fromEntries(
            vscode.workspace.textDocuments
              .filter(
                (doc) =>
                  doc.isDirty &&
                  doc.uri.scheme === "file" &&
                  vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath ===
                    root(),
              )
              .map((doc) => [
                vscode.workspace.asRelativePath(doc.uri, false),
                doc.getText(),
              ]),
          );
    if (options) input = { ...input, ...options };
    const graph = await client.call<FlowGraph>(
      "tools/call",
      { name: "contextory_flow_trace", arguments: input },
      15000,
    );
    lastGraph = graph;
    if (inPanel) showMap();
    post({ type: "flow", graph });
    return graph;
  };
  const document = (
    webview: vscode.Webview,
    surface: "sidebar" | "flow" | "relationships" | "architecture" = "sidebar",
  ) =>
    webviewDocument({
      script: webview
        .asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "dist/webview.js"),
        )
        .toString(),
      stylesheet: webview
        .asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "media/sidebar.css"),
        )
        .toString(),
      cspSource: webview.cspSource,
      nonce: randomBytes(24).toString("hex"),
      surface,
      workspaceName:
        vscode.workspace.name ?? vscode.workspace.workspaceFolders?.[0]?.name,
      workspacePath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    });
  const showRelationships = async (id: string) => {
    const request = ++relationshipRequest;
    const graph = await (
      await service()
    ).call<RelationshipGraph>("tools/call", {
      name: "contextory_impact_get",
      arguments: { id, direction: "both", depth: 5, limit: 60 },
    });
    if (request !== relationshipRequest) return graph;
    lastRelationships = graph;
    if (!relationshipPanel) {
      const created = vscode.window.createWebviewPanel(
        "contextory.relationships",
        "Contextory: Relationships",
        vscode.ViewColumn.Beside,
        { enableScripts: true, localResourceRoots: [context.extensionUri] },
      );
      relationshipPanel = created;
      created.webview.html = document(created.webview, "relationships");
      created.webview.onDidReceiveMessage(
        (message) => {
          void receive(message, created.webview);
        },
        undefined,
        context.subscriptions,
      );
      created.onDidDispose(() => {
        relationshipPanel = undefined;
      });
    }
    relationshipPanel.reveal(vscode.ViewColumn.Beside);
    await relationshipPanel.webview.postMessage({
      type: "relationships",
      graph,
    });
    return graph;
  };
  const showArchitecture = () => {
    if (!architecturePanel) {
      const created = vscode.window.createWebviewPanel(
        "contextory.architecture",
        "Contextory: Architecture",
        vscode.ViewColumn.Beside,
        { enableScripts: true, localResourceRoots: [context.extensionUri] },
      );
      architecturePanel = created;
      created.webview.html = document(created.webview, "architecture");
      created.webview.onDidReceiveMessage(
        (message) => {
          void receive(message, created.webview);
        },
        undefined,
        context.subscriptions,
      );
      created.onDidDispose(() => {
        architecturePanel = undefined;
      });
    }
    architecturePanel.reveal(vscode.ViewColumn.Beside);
  };
  const openSource = async (source: {
    codebaseId?: string;
    path: string;
    line?: number;
    character?: number;
  }) => {
    if (
      typeof source.path !== "string" ||
      source.path.includes("..") ||
      /^[\\/]|^[A-Za-z]:/.test(source.path)
    )
      throw new Error("Source link must stay in this workspace.");
    const path = await (
      await service()
    ).call<string>("source.resolve", {
      path: source.path,
      codebaseId: source.codebaseId,
    });
    const uri = vscode.Uri.file(path);
    const document = await vscode.workspace.openTextDocument(uri);
    const position = document.validatePosition(
      new vscode.Position(source.line ?? 0, source.character ?? 0),
    );
    await vscode.window.showTextDocument(document, {
      selection: new vscode.Range(position, position),
      preview: true,
    });
  };
  const exportReport = async (requestId?: string) => {
    const client = await service();
    if (!requestId) {
      const dashboard = await client.call<Dashboard>("dashboard");
      const requests = dashboard.entities.filter((e) => e.kind === "request");
      if (!requests.length)
        throw new Error("Create a request before exporting its report.");
      const picked =
        requests.length === 1
          ? requests[0].id
          : (
              await vscode.window.showQuickPick(
                requests.map((e) => ({
                  label: e.title,
                  description: e.id,
                  id: e.id,
                })),
                { placeHolder: "Choose the request to export" },
              )
            )?.id;
      if (!picked) return;
      requestId = picked;
    }
    const result = await client.call<{ artifact: string }>("tools/call", {
      name: "contextory_report_export",
      arguments: { format: "report", requestId },
    });
    const uri = vscode.Uri.file(
      join(client.storage, "artifacts", result.artifact),
    );
    await vscode.window.showTextDocument(uri);
    return uri;
  };
  const deliverRecord = async (webview?: vscode.Webview) => {
    const id = pendingRecord;
    if (
      id &&
      (await webview?.postMessage({ type: "selectRecord", id })) &&
      pendingRecord === id
    )
      pendingRecord = undefined;
  };
  const receive = async (raw: unknown, sender?: vscode.Webview) => {
    if (!raw || typeof raw !== "object") return;
    const message = raw as Record<string, unknown>;
    await run(async () => {
      switch (message.type) {
        case "ready":
          await refresh();
          if (lastGraph && message.surface === "flow")
            void sender?.postMessage({ type: "flow", graph: lastGraph });
          if (lastRelationships && message.surface === "relationships")
            void sender?.postMessage({
              type: "relationships",
              graph: lastRelationships,
            });
          if (message.surface === "sidebar") await deliverRecord(sender);
          break;
        case "refresh":
          await refresh();
          break;
        case "architecturePanel":
          showArchitecture();
          break;
        case "referenceAdd": {
          const folders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Analyze as reference",
            title: "Choose a reference codebase",
          });
          const folder = folders?.[0];
          if (!folder || folder.scheme !== "file") break;
          const client = await service();
          const reference = await client.call<{ id: string }>("tools/call", {
            name: "contextory_codebase_change",
            arguments: {
              action: "add",
              root: folder.fsPath,
              operationId: randomUUID(),
            },
          });
          const listed = await client.call<{ references: unknown[] }>(
            "tools/call",
            { name: "contextory_codebase_list", arguments: {} },
          );
          await sender?.postMessage({
            type: "referenceAdded",
            codebaseId: reference.id,
            references: listed.references,
          });
          await refresh();
          break;
        }
        case "traceReference":
          await trace(message.input as FlowInput, undefined, true);
          break;
        case "autoConnect":
          if (typeof message.enabled === "boolean")
            await setAutoConnect(message.enabled);
          break;
        case "connect":
          if (isClient(String(message.provider)))
            await connect(message.provider as Provider);
          break;
        case "disconnect":
          if (isClient(String(message.provider)))
            await connect(message.provider as Provider, true);
          break;
        case "tool": {
          const client = await service();
          const result = await client.call(
            "tools/call",
            {
              name: message.name,
              arguments: message.arguments,
            },
            String(message.name).startsWith("contextory_release") ||
              message.name === "contextory_version_get"
              ? 300000
              : 30000,
          );
          await sender?.postMessage({
            type: "toolResult",
            requestId: message.requestId,
            result,
          });
          await refresh();
          break;
        }
        case "trace":
          await trace(
            message.input as FlowInput | undefined,
            message.options as Pick<FlowInput, "view" | "limits"> | undefined,
            false,
          );
          break;
        case "expand": {
          const client = await service();
          const graph = await client.call<FlowGraph>(
            "tools/call",
            { name: "contextory_flow_expand", arguments: message.arguments },
            15000,
          );
          lastGraph = graph;
          post({ type: "flow", graph });
          break;
        }
        case "source":
          await openSource(
            message.source as {
              path: string;
              line?: number;
              character?: number;
            },
          );
          break;
        case "relationships":
          if (typeof message.id === "string")
            await showRelationships(message.id);
          break;
        case "openRecord":
          if (typeof message.id === "string") {
            pendingRecord = message.id;
            await vscode.commands.executeCommand("contextory.tasks.focus");
            await deliverRecord(view?.webview);
          }
          break;
        case "report":
          await exportReport(
            typeof message.requestId === "string"
              ? message.requestId
              : undefined,
          );
          break;
        case "graphExport": {
          if (!lastGraph) break;
          const content =
            message.format === "json"
              ? JSON.stringify(lastGraph, null, 2)
              : message.format === "svg" &&
                  typeof message.content === "string" &&
                  message.content.length < 2 * 1024 * 1024
                ? message.content
                : undefined;
          if (content)
            await vscode.window.showTextDocument(
              await vscode.workspace.openTextDocument({
                language: message.format === "json" ? "json" : "xml",
                content,
              }),
            );
          break;
        }
        case "index": {
          const client = await service();
          const sources = await client.call("index.sources", {}, 120000);
          post({
            type: "notice",
            text: `Workspace indexed: ${JSON.stringify(sources)}`,
          });
          if ((await client.call<Dashboard>("dashboard")).semantic.ready)
            await client.call("index.vectors", {}, 600000);
          await refresh();
          break;
        }
        case "prepareSemantic":
          await vscode.commands.executeCommand("contextory.prepareSemantic");
          break;
        case "cancelAnalysis":
          await (
            await service()
          ).call("analysis.cancel", { codebaseId: message.codebaseId });
          break;
      }
    });
  };
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("contextory.tasks", {
      resolveWebviewView(value) {
        view = value;
        view.webview.options = {
          enableScripts: true,
          localResourceRoots: [context.extensionUri],
        };
        view.webview.html = document(view.webview);
        view.webview.onDidReceiveMessage(
          (message) => {
            void receive(message, view?.webview);
          },
          undefined,
          context.subscriptions,
        );
      },
    }),
  );
  const command = (id: string, handler: () => Promise<unknown>) =>
    context.subscriptions.push(
      vscode.commands.registerCommand(id, () => run(handler)),
    );
  command("contextory.refresh", refresh);
  command(
    "contextory.restartAgentExtensions",
    async () =>
      await vscode.commands.executeCommand(
        "workbench.action.restartExtensionHost",
      ),
  );
  command("contextory.checkConnections", async () => {
    const dashboard = await (await service()).call<Dashboard>("dashboard");
    const text =
      dashboard.connections
        .filter((c) => c.configured)
        .map(
          (c) =>
            `${c.provider}: MCP ${c.mcpCurrent ? "observed in this service" : "waiting for native traffic"}; hooks ${c.provider === "generic" ? "not used" : c.hookCurrent ? "observed in this service" : "not yet observed (check native trust/reload)"}`,
        )
        .join("\n") || "No configured native connections.";
    output.appendLine(text);
    output.show(true);
    const choice = await vscode.window.showInformationMessage(
      text,
      "Restart Extension Host",
    );
    if (choice)
      await vscode.commands.executeCommand(
        "workbench.action.restartExtensionHost",
      );
  });
  command("contextory.connectNativeCodex", () => connect("codex"));
  command("contextory.connectNativeClaude", () => connect("claude"));
  command("contextory.connectNativeBob", () => connect("bob"));
  command("contextory.connectGenericMcp", () => connect("generic"));
  command("contextory.toggleAutoConnect", () =>
    setAutoConnect(!automation().enabled),
  );
  command("contextory.disconnectProvider", async () => {
    const provider = await vscode.window.showQuickPick(
      ["codex", "claude", "bob", "generic"],
      { placeHolder: "Disconnect Contextory from this native agent" },
    );
    if (provider) await connect(provider as Provider, true);
  });
  command("contextory.traceFlowFromHere", () => trace());
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "contextory.exportReport",
      (requestId?: string) => run(() => exportReport(requestId)),
    ),
  );
  command("contextory.openPlan", async () =>
    vscode.window.showTextDocument(
      vscode.Uri.joinPath(context.extensionUri, "docs/NATIVE-AGENT-PLAN.md"),
    ),
  );
  command("contextory.indexWorkspace", async () => {
    const client = await service();
    const result = await client.call("index.sources", {}, 120000);
    if ((await client.call<Dashboard>("dashboard")).semantic.ready)
      await client.call("index.vectors", {}, 600000);
    return result;
  });
  command("contextory.openArchitecture", async () => showArchitecture());
  command("contextory.prepareSemantic", async () => {
    const client = await service();
    await mkdir(client.embeddings, { recursive: true });
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Contextory: Preparing optional local semantic search",
      },
      () =>
        new Promise<void>((resolve, reject) => {
          const child = spawn(
            client.node,
            [
              join(
                context.extensionUri.fsPath,
                "scripts/prepare-embeddings.mjs",
              ),
              client.embeddings,
            ],
            {
              windowsHide: true,
              shell: false,
              stdio: ["ignore", "pipe", "pipe"],
            },
          );
          child.stdout.on("data", (chunk) => output.append(String(chunk)));
          child.stderr.on("data", (chunk) => output.append(String(chunk)));
          child.once("error", reject);
          child.once("exit", (code) =>
            code === 0
              ? resolve()
              : reject(
                  new Error(
                    "Local model preparation failed. See Contextory output; lexical search remains available.",
                  ),
                ),
          );
        }),
    );
    await refresh();
  });
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        (event.affectsConfiguration("contextory.startupAgent") ||
          event.affectsConfiguration("contextory.autoConnect")) &&
        active
      )
        void service()
          .then(async (client) => {
            await prepareStartupAgents(client);
            await refresh();
          })
          .catch((error) => output.appendLine(error.message));
      if (
        (event.affectsConfiguration("contextory.checks") ||
          event.affectsConfiguration("contextory.pythonExecutable")) &&
        active
      )
        void active
          .call("configure", {
            recipes: vscode.workspace
              .getConfiguration("contextory")
              .get("checks", []),
            pythonExecutable: vscode.workspace
              .getConfiguration("contextory")
              .get("pythonExecutable", "python"),
          })
          .catch((error) => output.appendLine(error.message));
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(() => {
      if (active) void active.call("analysis.invalidate").catch(() => {});
    }),
  );
  const startWhenReady = async () => {
    if (
      vscode.workspace.isTrusted &&
      vscode.workspace.workspaceFolders?.length === 1 &&
      vscode.workspace.workspaceFolders[0].uri.scheme === "file"
    )
      await refresh();
  };
  context.subscriptions.push(
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      void startWhenReady().catch((error) => {
        output.appendLine(error.message);
        post({ type: "notice", text: error.message });
      });
    }),
  );
  const ready = startWhenReady().catch((error) => {
    output.appendLine(error.message);
    post({ type: "notice", text: error.message });
  });
  context.subscriptions.push(
    vscode.extensions.onDidChange(() => {
      if (
        !vscode.workspace.isTrusted ||
        vscode.workspace.workspaceFolders?.length !== 1 ||
        vscode.workspace.workspaceFolders[0].uri.scheme !== "file"
      )
        return;
      void service()
        .then(async (client) => {
          await prepareStartupAgents(client);
          await refresh();
        })
        .catch((error) => output.appendLine(error.message));
    }),
  );
  return {
    ready,
    health: async () => (await service()).call("health"),
    tool: async (name: string, args: unknown) =>
      (await service()).call("tools/call", { name, arguments: args }),
    trace,
    relationships: showRelationships,
    refresh,
    storage: async () => (await service()).storage,
    operationId: () => randomUUID(),
  };
}
