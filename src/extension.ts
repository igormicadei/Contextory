import * as vscode from "vscode";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, realpath } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawn } from "node:child_process";
import { ServiceClient } from "./service/client";
import { ReconnectLoop } from "./service/reconnect";
import { configureProvider } from "./providers/registration";
import { isClient, nativeClientIds, clients } from "./providers/clients";
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
  WorkspaceInfo,
} from "./contracts/model";
let active: ServiceClient | undefined;
const running = new Set<ServiceClient>();
export async function deactivate() {
  await Promise.allSettled([...running].map((client) => client.close()));
  running.clear();
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
  const projectClients = new Map<string, Promise<ServiceClient>>();
  const clientFolders = new Map<ServiceClient, vscode.WorkspaceFolder>();
  const failedClients = new Set<ServiceClient>();
  const configurationErrors = new Map<string, string>();
  const notifiedReviews = new Map<string, string>();
  let selectedRoot =
    context.workspaceState.get<string>("contextory.selectedProjectRoot") ??
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  let workspaceInfo: WorkspaceInfo | undefined;
  let syncing: Promise<void> | undefined;
  let membership = "";
  let lastGraph: FlowGraph | undefined;
  let lastSource: FlowInput["root"] | undefined;
  let lastSourceRoot: string | undefined;
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
  const automation = (path = selectedRoot): AgentAutomation => ({
    reloadRequired: setupReload.pending,
    enabled: vscode.workspace
      .getConfiguration("contextory", path ? vscode.Uri.file(path) : undefined)
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
  const projectKey = (key: string, path: string) =>
    `${key}:${createHash("sha256")
      .update(process.platform === "win32" ? path.toLowerCase() : path)
      .digest("hex")
      .slice(0, 24)}`;
  const rememberAgent = async (agent: RememberedAgent, path = root()) => {
    const key = projectKey(agentKey, path);
    const workspace = context.workspaceState.get<RememberedAgent>(key);
    if (!workspace || agent.at > workspace.at)
      await context.workspaceState.update(key, agent);
    const global = context.globalState.get<RememberedAgent>(agentKey);
    if (!global || agent.at > global.at)
      await context.globalState.update(agentKey, agent);
  };
  const rememberEditor = (editor: vscode.TextEditor | undefined) => {
    const folder =
      editor && vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (editor?.document.uri.scheme === "file" && folder) {
      lastSourceRoot = folder.uri.fsPath;
      lastSource = {
        path: relative(
          folder.uri.fsPath,
          editor.document.uri.fsPath,
        ).replaceAll("\\", "/"),
        position: {
          line: editor.selection.active.line,
          character: editor.selection.active.character,
        },
        start: "cursor",
      };
    }
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
    if (
      !folders?.length ||
      folders.some((folder) => folder.uri.scheme !== "file")
    )
      throw new Error("Open a trusted local folder to use Contextory.");
    if (folders.length > 16)
      throw new Error(
        "Contextory supports up to 16 local project folders per workspace.",
      );
    if (!vscode.workspace.isTrusted)
      throw new Error(
        "Trust this workspace before connecting agents or running analysis/checks.",
      );
    return (
      folders.find((folder) => folder.uri.fsPath === selectedRoot)?.uri
        .fsPath ?? folders[0].uri.fsPath
    );
  };
  const selectedClient = (client: ServiceClient) =>
    clientFolders.get(client)?.uri.fsPath ===
    (
      vscode.workspace.workspaceFolders?.find(
        (f) => f.uri.fsPath === selectedRoot,
      ) ?? vscode.workspace.workspaceFolders?.[0]
    )?.uri.fsPath;
  const postProject = (client: ServiceClient, message: object) => {
    if (selectedClient(client))
      post({
        ...message,
        projectId: workspaceInfo?.projects.find((p) => p.root === client.root)
          ?.id,
      });
  };
  const refresh = async () => {
    await synchronizeProjects();
    const client = await service();
    const dashboard = await client.call<Dashboard>("dashboard");
    if (!selectedClient(client)) return;
    dashboard.workspace = workspaceInfo;
    dashboard.configurationError = configurationErrors.get(client.root);
    const observed = latestNativeAgent(dashboard.connections);
    if (observed) await rememberAgent(observed, client.root);
    if (!selectedClient(client)) return;
    post({
      type: "restore",
      dashboard,
      projectId: dashboard.projectId,
      automation: automation(client.root),
    });
    reconnect.reset();
    post({
      type: "serviceConnection",
      state: "connected",
      checkedAt: new Date().toISOString(),
    });
    notifyReviews(client, dashboard);
  };
  const reconnect = new ReconnectLoop(
    async () => {
      root();
      await refresh();
    },
    (error, nextRetryAt) => {
      post({
        type: "serviceConnection",
        state: "reconnecting",
        nextRetryAt,
        text:
          error instanceof Error
            ? error.message
            : "Restoring the workspace connection.",
      });
    },
  );
  context.subscriptions.push({ dispose: () => reconnect.dispose() });
  const recover = (error: unknown) => {
    if (
      vscode.workspace.isTrusted &&
      vscode.workspace.workspaceFolders?.some((f) => f.uri.scheme === "file")
    )
      reconnect.request(error);
  };
  const notifyReviews = (client: ServiceClient, dashboard: Dashboard) => {
    const count =
      (dashboard.catalog?.observed ?? 0) +
      (dashboard.catalog?.pendingChanges ?? 0);
    if (view)
      view.badge = count
        ? { value: count, tooltip: `${count} knowledge items await review` }
        : undefined;
    const key = projectKey("contextory.reviewNotification", client.root);
    const signature = dashboard.entities
      .filter(
        (e) =>
          (e.kind === "knowledge" && e.state === "observed") ||
          (e.kind === "knowledge_change" && e.state === "pending"),
      )
      .map((e) => `${e.id}:${e.revision}`)
      .sort()
      .join(",");
    if (
      !count ||
      notifiedReviews.get(key) === signature ||
      context.workspaceState.get<string>(key) === signature
    )
      return;
    notifiedReviews.set(key, signature);
    void Promise.resolve(context.workspaceState.update(key, signature))
      .then(async () => {
        const choice = await vscode.window.showInformationMessage(
          `${count} knowledge ${count === 1 ? "item needs" : "items need"} your review in ${client.root.split(/[\\/]/).pop()}.`,
          "Review now",
        );
        if (choice !== "Review now") return;
        const folder = clientFolders.get(client);
        if (!folder) return;
        await selectProjectRoot(folder.uri.fsPath);
        await vscode.commands.executeCommand("contextory.tasks.focus");
        post({
          type: "navigate",
          screen: "catalog",
          projectId: dashboard.projectId,
        });
      })
      .catch((error: Error) =>
        output.appendLine(`Knowledge review notification: ${error.message}`),
      );
  };
  const configureClient = async (
    client: ServiceClient,
    folder: vscode.WorkspaceFolder,
  ) => {
    const settings = vscode.workspace.getConfiguration(
      "contextory",
      folder.uri,
    );
    try {
      await client.call("configure", {
        recipes: settings.get("checks", []),
        pythonExecutable: settings.get("pythonExecutable", "python"),
      });
      configurationErrors.delete(client.root);
    } catch (error) {
      if ((error as { code?: string }).code !== "INVALID_CHECKS") throw error;
      const text = `${error instanceof Error ? error.message : String(error)} The connection remains available; checks retain their last valid configuration.`;
      configurationErrors.set(client.root, text);
      output.appendLine(text);
    }
  };
  const handleEvent = (
    client: ServiceClient,
    event: Record<string, unknown>,
  ) => {
    if (event.type === "health" && !failedClients.has(client)) {
      postProject(client, {
        type: "serviceConnection",
        state: "connected",
        checkedAt: event.checkedAt,
      });
      return;
    }
    if (event.type === "changed" || event.type === "connected")
      void refresh().catch((error) =>
        post({ type: "notice", text: error.message }),
      );
    else if (event.type === "editor.trace")
      void editorCallGraph(client.root, event.input as FlowInput).then(
        (graph) => client.call("editor.response", { id: event.id, graph }),
        (error) =>
          client.call("editor.response", {
            id: event.id,
            error: error.message,
          }),
      );
    else if (event.type === "disconnected") {
      if (failedClients.has(client)) return;
      failedClients.add(client);
      const folder = clientFolders.get(client);
      if (folder) projectClients.delete(folder.uri.fsPath);
      membership = "";
      postProject(client, {
        type: "notice",
        text: "Contextory service disconnected. Refresh to reconnect; native work can continue.",
      });
      clientFolders.delete(client);
      void client.close();
      running.delete(client);
      recover(
        new Error(
          String(event.message ?? "Contextory connection interrupted."),
        ),
      );
    }
  };
  const service = (folderRoot = root()): Promise<ServiceClient> => {
    root();
    const folder = vscode.workspace.workspaceFolders?.find(
      (folder) => folder.uri.fsPath === folderRoot,
    );
    if (!folder)
      return Promise.reject(
        new Error("The selected project is no longer in this workspace."),
      );
    const existing = projectClients.get(folderRoot);
    if (existing)
      return existing.then((client) => {
        if (folderRoot === root()) active = client;
        return client;
      });
    let openingClient: ServiceClient | undefined;
    const opening = (async () => {
      const path = await realpath(folderRoot);
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
          .getConfiguration("contextory", folder.uri)
          .get("nodeExecutable", "node"),
        join(context.globalStorageUri.fsPath, "embeddings"),
        (event) => handleEvent(client, event),
        (text) => output.appendLine(text),
      );
      openingClient = client;
      clientFolders.set(client, folder);
      running.add(client);
      if (folderRoot === root()) active = client;
      await client.start();
      await configureClient(client, folder);
      try {
        await prepareStartupAgents(client, true);
      } catch (error) {
        const text = `Startup agent configuration: ${error instanceof Error ? error.message : String(error)}`;
        output.appendLine(text);
        postProject(client, { type: "notice", text });
      }
      return client;
    })().catch(async (error) => {
      projectClients.delete(folderRoot);
      if (openingClient) {
        clientFolders.delete(openingClient);
        running.delete(openingClient);
        await openingClient.close();
      }
      throw error;
    });
    projectClients.set(folderRoot, opening);
    return opening;
  };
  const synchronizeProjects = (): Promise<void> =>
    (syncing ??= (async () => {
      const folders = vscode.workspace.workspaceFolders ?? [];
      root();
      const signature = JSON.stringify(
        folders.map((folder) => [folder.uri.toString(), folder.name]),
      );
      if (membership === signature) return;
      for (const [path, pending] of projectClients) {
        if (folders.some((folder) => folder.uri.fsPath === path)) continue;
        const removed = await pending.catch(() => undefined);
        if (removed) {
          await removed.close();
          running.delete(removed);
          clientFolders.delete(removed);
        }
        projectClients.delete(path);
      }
      const clients = await Promise.all(
        folders.map(async (folder) => {
          try {
            return await service(folder.uri.fsPath);
          } catch (error) {
            throw new Error(
              `${folder.name}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }),
      );
      const projects = await Promise.all(
        clients.map(async (client, index) => ({
          id: (await client.call<{ projectId: string }>("health")).projectId,
          name: folders[index].name,
          root: client.root,
          storage: client.storage,
        })),
      );
      const workspaceId = `workspace:${createHash("sha256")
        .update(
          vscode.workspace.workspaceFile?.toString() ??
            JSON.stringify(projects.map((p) => p.root).sort()),
        )
        .digest("hex")
        .slice(0, 32)}`;
      for (const client of clients)
        await client.call("workspace.configure", {
          clientId: client.id,
          workspaceId,
          projects,
        });
      workspaceInfo = {
        id: workspaceId,
        projects: projects.map(({ storage: _storage, ...p }) => p),
        contexts: [],
      };
      membership = signature;
      selectedRoot = root();
      offerSetupReload();
    })().finally(() => {
      syncing = undefined;
    }));
  const run = async (work: () => Promise<unknown>, projectId?: unknown) => {
    post({ type: "busy", value: true, projectId });
    try {
      return await work();
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Contextory operation failed.";
      post({ type: "notice", text, projectId });
      output.appendLine(text);
      if ((error as { code?: string }).code === "SERVICE_UNAVAILABLE")
        recover(error);
      return undefined;
    } finally {
      post({ type: "busy", value: false, projectId });
    }
  };
  const registerAgent = async (
    client: ServiceClient,
    provider: Provider,
    remove = false,
  ) => {
    const result = await configureProvider(
      {
        root: client.root,
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
        `${client.root}:${provider}`,
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
      const state = automation(client.root);
      if (!state.enabled) return;
      const current = await client.call<Dashboard>("dashboard");
      const preference = vscode.workspace
        .getConfiguration("contextory", vscode.Uri.file(client.root))
        .get<StartupAgent>("startupAgent", "auto");
      const disabled = context.workspaceState.get<Provider[]>(
        projectKey(disabledKey, client.root),
        vscode.workspace.workspaceFolders?.length === 1
          ? context.workspaceState.get<Provider[]>(disabledKey, [])
          : [],
      );
      const providers = startupProviders({
        preference,
        enabled: state.enabled,
        detected: state.detected,
        workspace:
          context.workspaceState.get<RememberedAgent>(
            projectKey(agentKey, client.root),
          ) ??
          (vscode.workspace.workspaceFolders?.length === 1
            ? context.workspaceState.get<RememberedAgent>(agentKey)
            : undefined),
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
        if (!automation(client.root).enabled) break;
        if (!refreshExisting && configured.includes(provider)) continue;
        try {
          await registerAgent(client, provider);
          output.appendLine(
            `Automatic connection ${provider}: workspace MCP/hooks ready for the native client.`,
          );
        } catch (error) {
          const text = `${provider}: ${error instanceof Error ? error.message : String(error)}`;
          output.appendLine(`Automatic connection failed: ${text}`);
          postProject(client, {
            type: "notice",
            text: `Automatic connection needs attention: ${text}`,
          });
        }
      }
    });
  const connect = async (provider: Provider, remove = false) => {
    const client = await service();
    const result = await queueConnections(async () => {
      const result = await registerAgent(client, provider, remove);
      const disabled = context.workspaceState
        .get<
          Provider[]
        >(projectKey(disabledKey, client.root), vscode.workspace.workspaceFolders?.length === 1 ? context.workspaceState.get<Provider[]>(disabledKey, []) : [])
        .filter((p) => p !== provider);
      if (remove) disabled.push(provider);
      await context.workspaceState.update(
        projectKey(disabledKey, client.root),
        disabled,
      );
      if (!remove)
        await rememberAgent({ provider, at: Date.now() }, client.root);
      return result;
    });
    postProject(client, { type: "notice", text: result.instruction });
    await refresh();
    offerSetupReload();
    return result;
  };
  const rebuildHooks = async (provider?: unknown) => {
    const client = await service();
    if (
      provider !== undefined &&
      (!isClient(String(provider)) || provider === "generic")
    )
      throw new Error("Choose Codex, Claude Code or IBM Bob to rebuild hooks.");
    const picked =
      provider === undefined
        ? await vscode.window.showQuickPick(
            nativeClientIds.map((id) => ({
              label: clients[id].label,
              provider: id,
            })),
            {
              placeHolder: `Rebuild Contextory hooks for ${client.root.split(/[\\/]/).pop()}`,
            },
          )
        : { provider: provider as Exclude<Provider, "generic"> };
    if (!picked) return;
    const result = await queueConnections(() =>
      client.call<{
        instruction: string;
        status: string;
        changedFiles: string[];
        launcherChanged: boolean;
      }>("tools/call", {
        name: "contextory_hooks_rebuild",
        arguments: { operationId: randomUUID(), provider: picked.provider },
      }),
    );
    output.appendLine(
      `${picked.provider}: ${result.status}. ${result.instruction}`,
    );
    postProject(client, { type: "notice", text: result.instruction });
    if (result.changedFiles.length || result.launcherChanged) {
      await setupReload.changed(
        `hooks:${client.root}:${picked.provider}`,
        createHash("sha256").update(JSON.stringify(result)).digest("hex"),
        true,
      );
    }
    await refresh();
    offerSetupReload();
    return result;
  };
  const setAutoConnect = async (enabled: boolean) => {
    const projectRoot = root();
    await vscode.workspace
      .getConfiguration("contextory", vscode.Uri.file(projectRoot))
      .update(
        "autoConnect",
        enabled,
        vscode.workspace.workspaceFolders?.length === 1
          ? vscode.ConfigurationTarget.Workspace
          : vscode.ConfigurationTarget.WorkspaceFolder,
      );
    if (
      !vscode.workspace.isTrusted ||
      !vscode.workspace.workspaceFolders?.length ||
      vscode.workspace.workspaceFolders.some(
        (folder) => folder.uri.scheme !== "file",
      )
    )
      return;
    const client = await service(projectRoot);
    postProject(client, {
      type: "automation",
      automation: automation(projectRoot),
    });
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
    let input = provided;
    if (!input) {
      rememberEditor(vscode.window.activeTextEditor);
      if (!lastSource)
        throw new Error("Place the cursor inside a source function first.");
      if (lastSourceRoot && lastSourceRoot !== root())
        await selectProjectRoot(lastSourceRoot);
      input = {
        root: lastSource,
        view: /\.(?:[cm]?[jt]sx?|py)$/.test(lastSource.path) ? "flow" : "calls",
        limits: {
          callDepth: vscode.workspace
            .getConfiguration("contextory", vscode.Uri.file(root()))
            .get("flowDepth", 5),
        },
      };
    }
    const client = await service();
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
                    clientFolders.get(client)?.uri.fsPath,
              )
              .map((doc) => [
                relative(
                  clientFolders.get(client)!.uri.fsPath,
                  doc.uri.fsPath,
                ).replaceAll("\\", "/"),
                doc.getText(),
              ]),
          );
    if (options) input = { ...input, ...options };
    const graph = await client.call<FlowGraph>(
      "tools/call",
      { name: "contextory_flow_trace", arguments: input },
      15000,
    );
    if (!selectedClient(client)) return graph;
    lastGraph = graph;
    if (inPanel) showMap();
    postProject(client, { type: "flow", graph });
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
    const client = await service();
    const graph = await client.call<RelationshipGraph>("tools/call", {
      name: "contextory_impact_get",
      arguments: { id, direction: "both", depth: 5, limit: 60 },
    });
    if (request !== relationshipRequest || !selectedClient(client))
      return graph;
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
      projectId: workspaceInfo?.projects.find((p) => p.root === client.root)
        ?.id,
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
    const client = await service();
    const path = await client.call<string>("source.resolve", {
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
  const selectProjectRoot = async (path: string, recordId?: string) => {
    if (
      !vscode.workspace.workspaceFolders?.some(
        (folder) => folder.uri.fsPath === path,
      )
    )
      throw new Error("The selected project is no longer in this workspace.");
    selectedRoot = path;
    lastGraph = undefined;
    lastRelationships = undefined;
    relationshipRequest++;
    pendingRecord = recordId;
    post({
      type: "projectChanging",
      targetProjectId: workspaceInfo?.projects.find((p) =>
        [...clientFolders].some(
          ([c, f]) => c.root === p.root && f.uri.fsPath === path,
        ),
      )?.id,
    });
    await context.workspaceState.update("contextory.selectedProjectRoot", path);
    if (selectedRoot !== path) return;
    await refresh();
    if (selectedRoot !== path) return;
    await deliverRecord(view?.webview);
  };
  const receive = async (raw: unknown, sender?: vscode.Webview) => {
    if (!raw || typeof raw !== "object") return;
    const message = raw as Record<string, unknown>;
    if (
      message.type !== "selectProject" &&
      message.projectId &&
      workspaceInfo?.projects.find((p) => p.root === active?.root)?.id !==
        message.projectId
    )
      return;
    await run(async () => {
      switch (message.type) {
        case "restartAgents":
          await vscode.commands.executeCommand(
            "workbench.action.restartExtensionHost",
          );
          break;
        case "checkConnections":
          await vscode.commands.executeCommand("contextory.checkConnections");
          break;
        case "checkSettings":
          await vscode.commands.executeCommand(
            "workbench.action.openWorkspaceSettings",
            "contextory.checks",
          );
          break;
        case "selectProject": {
          await synchronizeProjects();
          const project = workspaceInfo?.projects.find(
            (p) => p.id === message.targetProjectId,
          );
          const client =
            project &&
            [...clientFolders].find(([client]) => client.root === project.root);
          if (!client)
            throw new Error("Select an active project from this workspace.");
          await selectProjectRoot(
            client[1].uri.fsPath,
            typeof message.recordId === "string" ? message.recordId : undefined,
          );
          break;
        }
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
          const client = await service();
          const folders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Analyze as reference",
            title: "Choose a reference codebase",
          });
          const folder = folders?.[0];
          if (!folder || folder.scheme !== "file") break;
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
            projectId: workspaceInfo?.projects.find(
              (p) => p.root === client.root,
            )?.id,
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
        case "rebuildHooks":
          await rebuildHooks(message.provider);
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
              arguments: {
                ...(message.arguments as object),
                workspaceId: workspaceInfo?.id,
              },
            },
            String(message.name).startsWith("contextory_release") ||
              message.name === "contextory_version_get"
              ? 300000
              : 120000,
          );
          await sender?.postMessage({
            type: "toolResult",
            projectId: workspaceInfo?.projects.find(
              (p) => p.root === client.root,
            )?.id,
            requestId: message.requestId,
            result,
          });
          if (message.name !== "contextory_workspace_get") await refresh();
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
          if (!selectedClient(client)) break;
          lastGraph = graph;
          postProject(client, { type: "flow", graph });
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
          postProject(client, {
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
    }, message.projectId);
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
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "contextory.rebuildHooks",
      (provider?: string) => run(() => rebuildHooks(provider)),
    ),
  );
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
      if (!event.affectsConfiguration("contextory")) return;
      void (async () => {
        if (!projectClients.size) await startWhenReady();
        for (const pending of projectClients.values()) {
          const client = await pending;
          const folder = clientFolders.get(client)!;
          if (
            event.affectsConfiguration("contextory.autoConnect", folder.uri) ||
            event.affectsConfiguration("contextory.startupAgent", folder.uri)
          )
            await prepareStartupAgents(client);
          if (
            event.affectsConfiguration("contextory.checks", folder.uri) ||
            event.affectsConfiguration(
              "contextory.pythonExecutable",
              folder.uri,
            )
          ) {
            await configureClient(client, folder);
          }
        }
        offerSetupReload();
        if (projectClients.size) await refresh();
      })().catch((error) => output.appendLine(error.message));
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const folder = vscode.workspace.getWorkspaceFolder(event.document.uri);
      const pending = folder && projectClients.get(folder.uri.fsPath);
      if (pending)
        void pending
          .then((client) => client.call("analysis.invalidate"))
          .catch(() => {});
    }),
  );
  const startWhenReady = async () => {
    if (
      vscode.workspace.isTrusted &&
      vscode.workspace.workspaceFolders?.length &&
      vscode.workspace.workspaceFolders.every(
        (folder) => folder.uri.scheme === "file",
      )
    ) {
      try {
        await refresh();
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        output.appendLine(text);
        post({ type: "notice", text });
        recover(error);
      }
    }
  };
  context.subscriptions.push(
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      void startWhenReady();
    }),
  );
  const ready = startWhenReady();
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      membership = "";
      lastGraph = undefined;
      lastRelationships = undefined;
      pendingRecord = undefined;
      post({ type: "projectChanging" });
      if (!vscode.workspace.workspaceFolders?.length) {
        reconnect.reset();
        for (const pending of projectClients.values())
          void pending.then((client) => client.close());
        projectClients.clear();
        workspaceInfo = undefined;
        post({
          type: "notice",
          text: "Open a trusted local project folder to use Contextory.",
        });
        return;
      }
      void startWhenReady();
    }),
    vscode.extensions.onDidChange(() => {
      if (
        !vscode.workspace.isTrusted ||
        !vscode.workspace.workspaceFolders?.length ||
        vscode.workspace.workspaceFolders.some(
          (folder) => folder.uri.scheme !== "file",
        )
      )
        return;
      void synchronizeProjects()
        .then(async () => {
          for (const pending of projectClients.values())
            await prepareStartupAgents(await pending);
          offerSetupReload();
          await refresh();
        })
        .catch((error) => {
          output.appendLine(error.message);
          recover(error);
        });
    }),
  );
  return {
    ready,
    projects: async () => {
      await synchronizeProjects();
      return workspaceInfo;
    },
    selectProject: async (projectId: string) => {
      await synchronizeProjects();
      const project = workspaceInfo?.projects.find((p) => p.id === projectId);
      const entry =
        project &&
        [...clientFolders].find(([client]) => client.root === project.root);
      if (!entry) throw new Error("Unknown workspace project.");
      await selectProjectRoot(entry[1].uri.fsPath);
    },
    health: async () => (await service()).call("health"),
    tool: async (name: string, args: unknown) =>
      (await service()).call("tools/call", { name, arguments: args }),
    trace,
    relationships: showRelationships,
    openSource,
    refresh,
    storage: async () => (await service()).storage,
    operationId: () => randomUUID(),
  };
}
