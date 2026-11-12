import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NativeBroker, nativeClaudeUri, nativePrompt } from './native/broker';
import { NativeMcpServer } from './native/server';
import { nativeRegistration } from './native/registration';
import { registerNativeCodex } from './native/codexRegistration';
import { Coordinator, type LiveState } from './engine/coordinator';
import { CodexAgent } from './engine/codex';
import { EngineError, type Agent } from './engine/types';
import { git, verifyWorktree, type CheckRecipe } from './engine/git';
import { report } from './shared/report';
import { checkRuntimes } from './diagnostics';
import { createDemo } from './shared/fixtures';
import { findSpec, restoreDemo, type DemoState } from './shared/model';
import { pickAttachments, searchReferences } from './contextDiscovery';
import { isToHost, type ToWebview } from './shared/protocol';
import { webviewDocument } from './webview/document';
let activeEngine: Coordinator | undefined;
type NativeProvider = 'claude' | 'codex';
type NativeConnection = { broker: NativeBroker; server: NativeMcpServer };
const activeNative: Partial<Record<NativeProvider, NativeConnection>> = {};
export async function deactivate() { await activeEngine?.close(); activeEngine = undefined; for (const provider of ['claude', 'codex'] as const) { await activeNative[provider]?.server.close(); await activeNative[provider]?.broker.close(); delete activeNative[provider]; } }

export function activate(context: vscode.ExtensionContext): void {
  const content = new Map<string, string>();
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('relay-preview', {
    provideTextDocumentContent(uri) { return content.get(uri.toString()) ?? 'Preview document no longer available. Open it again from Relay.'; }
  }));
  async function document(name: string, text: string, language?: string): Promise<vscode.Uri> {
    const uri = vscode.Uri.parse(`relay-preview:/${Date.now()}-${name}`);
    content.set(uri.toString(), text);
    const doc = await vscode.workspace.openTextDocument(uri);
    if (language) await vscode.languages.setTextDocumentLanguage(doc, language);
    return uri;
  }
  const stored = context.workspaceState.get<unknown>('relay.demo.v1');
  let state: DemoState = restoreDemo(stored) ?? createDemo();
  let view: vscode.WebviewView | undefined;
  let checking = false;
  let live = !!vscode.workspace.workspaceFolders?.length && context.workspaceState.get<boolean>('relay.live', true);
  let opening: Promise<Coordinator> | undefined;
  const nativeOpening: Partial<Record<NativeProvider, Promise<NativeConnection>>> = {};
  const nativeClaude = () => vscode.workspace.getConfiguration('relay').get<string>('claudeIntegration', 'native') === 'native';
  const nativeCodex = () => vscode.workspace.getConfiguration('relay').get<string>('codexIntegration', 'appServer') === 'native';
  const post = (message: ToWebview) => view?.webview.postMessage(message);
  const workspaceMessage = (): ToWebview => ({ type: 'workspace', live, name: vscode.workspace.workspaceFolders?.[0]?.name ?? 'Relay', claudeIntegration: nativeClaude() ? 'native' : 'sdk', codexIntegration: nativeCodex() ? 'native' : 'appServer' });
  const registeredKey = (provider: NativeProvider) => provider === 'codex' ? 'relay.nativeCodexRegistered' : 'relay.nativeClaudeRegistered';
  const requireNative = (provider: NativeProvider) => {
    if (provider === 'codex' && process.platform === 'win32' && vscode.workspace.getConfiguration('chatgpt').get<boolean>('runCodexInWindowsSubsystemForLinux', false)) throw new EngineError('Relay native Codex currently requires the same local Windows host. WSL Codex cannot use this Windows MCP proxy; keep using the existing route or connect from a supported local profile.');
    const id = provider === 'codex' ? 'openai.chatgpt' : 'anthropic.claude-code';
    const extension = vscode.extensions.getExtension(id);
    if (!extension) throw new EngineError(`Install/enable the official ${provider === 'codex' ? 'OpenAI Codex' : 'Claude Code'} extension in this VS Code profile. F5 uses an isolated profile; use your normal profile for native integration.`);
    return extension;
  };
  const connectNative = async (provider: NativeProvider, register: boolean) => {
    if (!vscode.workspace.isTrusted || !context.storageUri || vscode.workspace.workspaceFolders?.length !== 1) throw new EngineError('The native agent bridge requires one trusted local workspace.');
    const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
    if (vscode.workspace.workspaceFolders[0].uri.scheme !== 'file') throw new EngineError('The native agent bridge requires a local filesystem workspace.');
    const prefix = provider === 'codex' ? 'native-codex' : 'native';
    const descriptor = join(context.storageUri.fsPath, `${prefix}-bridge.json`); const proxy = join(context.storageUri.fsPath, `${prefix}-proxy.mjs`);
    if (!nativeOpening[provider]) nativeOpening[provider] = (async () => {
      const broker = new NativeBroker(context.storageUri!.fsPath, {
        open: async turn => {
          const extension = requireNative(provider);
          if (provider === 'claude') {
            if (!await vscode.env.openExternal(vscode.Uri.parse(nativeClaudeUri(turn, vscode.env.uriScheme)))) throw new EngineError('Could not open the native Claude tab. Open Claude Code and retry the Relay message.');
          } else {
            await extension.activate();
            const commands = await vscode.commands.getCommands(true);
            if (!commands.includes('chatgpt.addToThread') || !commands.includes('chatgpt.openSidebar')) throw new EngineError('The installed Codex extension lacks the documented context/sidebar commands. Update Codex and retry.');
            const folder = join(context.storageUri!.fsPath, 'native-codex-handoffs'); await mkdir(folder, { recursive: true });
            const path = join(folder, `${turn.id}.md`); await writeFile(path, nativePrompt(turn), 'utf8');
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
            const editor = await vscode.window.showTextDocument(doc, { preview: true });
            editor.selection = new vscode.Selection(doc.positionAt(0), doc.positionAt(doc.getText().length));
            // Public command attaches selected context; it does not submit a message.
            await vscode.commands.executeCommand('chatgpt.addToThread');
            await vscode.commands.executeCommand('chatgpt.openSidebar');
          }
        },
        activity: text => post({ type: 'activity', text }),
        history: () => activeEngine?.state.projection.messages.slice(-20).map(m => ({ role: m.role, text: m.text })) ?? [],
        search: query => activeEngine?.search(query) ?? [], request: id => activeEngine?.get(id) ?? null
      }, provider);
      const server = new NativeMcpServer(broker);
      try { await broker.open(); await server.start(descriptor); await copyFile(vscode.Uri.joinPath(context.extensionUri, 'dist', 'native-proxy.mjs').fsPath, proxy + '.tmp'); await rename(proxy + '.tmp', proxy); }
      catch (error) { await server.close(); await broker.close(); throw error; }
      activeNative[provider] = { broker, server }; return activeNative[provider]!;
    })().catch(error => { delete nativeOpening[provider]; throw error; });
    const native = await nativeOpening[provider]!;
    if (register && provider === 'codex') {
      await registerNativeCodex(root, proxy, descriptor);
      await context.workspaceState.update(registeredKey(provider), true);
    } else if (register && !context.workspaceState.get<boolean>(registeredKey(provider), false)) {
      const registration = nativeRegistration(root, proxy, descriptor);
      try {
        await promisify(execFile)(vscode.workspace.getConfiguration('relay').get<string>('claudeExecutable', 'claude'), ['mcp', 'add-json', '--scope', 'local', registration.name, JSON.stringify(registration.config)], { cwd: root, windowsHide: true, timeout: 15000, maxBuffer: 128 * 1024 });
        await context.workspaceState.update(registeredKey(provider), true);
      } catch { throw new EngineError('Could not register the Relay MCP server with native Claude. Check relay.claudeExecutable and Node availability. Existing native configuration was not replaced.'); }
    }
    return native;
  };
  const agent = async (provider: 'codex' | 'claude'): Promise<Agent> => {
    if (!vscode.workspace.isTrusted) throw new EngineError('Trust this workspace before connecting a native agent.');
    const config = vscode.workspace.getConfiguration('relay');
    if ((provider === 'codex' && nativeCodex()) || (provider === 'claude' && nativeClaude())) {
      requireNative(provider);
      return (await connectNative(provider, true)).broker;
    }
    if (provider === 'codex') return new CodexAgent(config.get<string>('codexExecutable', 'codex'));
    let executable = config.get<string>('claudeExecutable', 'claude');
    if (!/[\\/]/.test(executable)) {
      try { executable = (await promisify(execFile)(process.platform === 'win32' ? 'where.exe' : 'which', [executable], { windowsHide: true, timeout: 5000 })).stdout.trim().split(/\r?\n/)[0]; } catch { throw new EngineError('Claude executable not found. Configure relay.claudeExecutable.'); }
    }
    const module = await (new Function('url', 'return import(url)') as (url: string) => Promise<{ ClaudeAgent: new (path: string) => Agent }>)(pathToFileURL(vscode.Uri.joinPath(context.extensionUri, 'dist', 'claude.mjs').fsPath).href);
    return new module.ClaudeAgent(executable);
  };
  const engine = (): Promise<Coordinator> => {
    if (opening) return opening;
    opening = (async () => {
      if (!vscode.workspace.isTrusted || !context.storageUri || vscode.workspace.workspaceFolders?.length !== 1) throw new EngineError('Live Relay currently requires one trusted, local workspace folder.');
      const root = vscode.workspace.workspaceFolders[0].uri;
      if (root.scheme !== 'file') throw new EngineError('Live execution requires a local filesystem workspace on the extension host.');
      const coordinator = new Coordinator({ root: root.fsPath, storage: context.storageUri.fsPath, agent,
        changed: (s: LiveState) => { if (live) { state = s.projection; post({ type: 'restore', state }); } },
        activity: text => { if (live) post({ type: 'activity', text }); },
        approve: async (title, detail) => vscode.window.showWarningMessage(`${title}\n\n${detail}`, { modal: true }, 'Allow once') .then(answer => answer === 'Allow once'),
        checks: () => vscode.workspace.getConfiguration('relay').get<CheckRecipe[]>('checks', []),
        push: () => vscode.workspace.getConfiguration('relay').get<boolean>('push', false)
      });
      await coordinator.open(); activeEngine = coordinator; return coordinator;
    })().catch(error => { opening = undefined; throw error; });
    return opening;
  };
  const restore = async () => {
    post(workspaceMessage());
    if (live) state = (await engine()).state.projection;
    else state = restoreDemo(context.workspaceState.get<unknown>('relay.demo.v1')) ?? createDemo();
    post({ type: 'restore', state });
  };
  const openPlan = async () => { await vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.joinPath(context.extensionUri, 'docs', 'PLAN.md')); };
  const diagnostics = async () => {
    if (checking) return;
    if (!vscode.workspace.isTrusted) { post({ type: 'notice', text: 'Runtime checks require a trusted workspace. The preview remains available.' }); return; }
    checking = true;
    try {
      const config = vscode.workspace.getConfiguration('relay');
      const results = await checkRuntimes({ codex: config.get<string>('codexExecutable', 'codex'), claude: config.get<string>('claudeExecutable', 'claude') });
      if (view) post({ type: 'diagnostics', results });
      else await vscode.window.showInformationMessage(results.map(r => `${r.provider}: ${r.version ?? 'unavailable'}`).join(' · '));
    } finally { checking = false; }
  };
  context.subscriptions.push(
    vscode.commands.registerCommand('relay.openPlan', openPlan),
    vscode.commands.registerCommand('relay.checkRuntimes', diagnostics),
    vscode.commands.registerCommand('relay.connectNativeCodex', async () => {
      try {
        requireNative('codex'); await engine(); await connectNative('codex', true);
        await vscode.workspace.getConfiguration('relay').update('codexIntegration', 'native', vscode.ConfigurationTarget.Workspace);
        await vscode.commands.executeCommand('chatgpt.openSidebar');
        post(workspaceMessage());
        const text = 'Relay is connected to native OpenAI Codex using project MCP configuration. Restart Codex from its MCP settings to load Relay, then send from Relay and press Send in Codex. Native login/model/permissions are preserved.';
        post({ type: 'notice', text }); await vscode.window.showInformationMessage(text);
      } catch (error) { const text = error instanceof EngineError ? error.message : 'Native Codex setup failed. Existing provider settings were preserved.'; post({ type: 'notice', text }); await vscode.window.showWarningMessage(text); }
    }),
    vscode.commands.registerCommand('relay.connectNativeClaude', async () => {
      try { requireNative('claude'); await engine(); await connectNative('claude', true); const text = 'Relay MCP is connected to native Claude for this workspace. Open a new Claude conversation to load it; keep native MCP approval prompts enabled.'; if (view) post({ type: 'notice', text }); else await vscode.window.showInformationMessage(text); }
      catch (error) { const text = error instanceof EngineError ? error.message : 'Native Claude setup failed.'; post({ type: 'notice', text }); await vscode.window.showWarningMessage(text); }
    }),
    vscode.commands.registerCommand('relay.resetDemo', async () => { live = false; state = createDemo(); await context.workspaceState.update('relay.demo.v1', state); post({ type: 'workspace', live, name: vscode.workspace.workspaceFolders?.[0]?.name ?? 'Relay' }); post({ type: 'reset' }); }),
    vscode.window.registerWebviewViewProvider('relay.tasks', {
      resolveWebviewView(webviewView) {
        view = webviewView;
        const { webview } = webviewView;
        webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist'), vscode.Uri.joinPath(context.extensionUri, 'media')] };
        webview.html = webviewDocument({ script: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js')).toString(), stylesheet: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'sidebar.css')).toString(), cspSource: webview.cspSource, nonce: randomBytes(24).toString('hex') });
        webviewView.onDidDispose(() => { if (view === webviewView) view = undefined; }, undefined, context.subscriptions);
        webview.onDidReceiveMessage(async (raw: unknown) => {
          if (!isToHost(raw)) return;
          try {
            if (raw.type === 'ready') { await restore(); return; }
            if (raw.type === 'setMode') { activeEngine?.stop(); live = raw.live; await context.workspaceState.update('relay.live', live); await restore(); return; }
            if (raw.type === 'models') { if (live) post({ type: 'models', provider: raw.provider, items: (raw.provider === 'claude' && nativeClaude()) || (raw.provider === 'codex' && nativeCodex()) ? [{ id: 'default', label: `Selected in ${raw.provider === 'codex' ? 'Codex' : 'Claude'} extension`, efforts: ['default'] }] : await (await agent(raw.provider)).models(vscode.workspace.workspaceFolders![0].uri.fsPath) }); return; }
            if (raw.type === 'liveStop') { activeEngine?.stop(); return; }
            if (raw.type === 'liveRun') { if (live) await (await engine()).run(raw.id); return; }
            if (raw.type === 'openWorktree') {
              if (!live) return;
              const coordinator = await engine(); const path = coordinator.state.plans[raw.id]?.worktree;
              if (!path) throw new EngineError('This request has no worktree yet. Run it after configuring checks.');
              await verifyWorktree(vscode.workspace.workspaceFolders![0].uri.fsPath, path, `relay/${raw.id}/integration`);
              await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(path), true); return;
            }
            if (raw.type === 'liveAnswer') { if (live) await (await engine()).answer(raw.id, raw.text); return; }
            if (raw.type === 'liveSubmit') {
              if (!live) return;
              const images: string[] = []; const files: string[] = [];
              for (const attachment of raw.attachments) {
                const data = attachment.data ?? attachment.thumbnail?.split(',')[1];
                if (!data || Buffer.from(data, 'base64').length !== attachment.size) throw new EngineError(`Attachment ${attachment.name} has no valid content. Attach it again.`);
                if (attachment.mime.startsWith('image/')) images.push(`data:${attachment.mime};base64,${data}`);
                else { const bytes = Buffer.from(data, 'base64'); if (bytes.includes(0)) throw new EngineError('Binary files are not supported as text attachments yet. Reference the workspace file with @ instead.'); files.push(`\nAttached file: ${attachment.name}\n${bytes.toString('utf8')}`); }
              }
              await (await engine()).submit(raw.text + files.join('\n'), raw.choice, images); return;
            }
            if (raw.type === 'save') { if (!live) { state = raw.state; await context.workspaceState.update('relay.demo.v1', state); } }
            if (raw.type === 'openPlan') await openPlan();
            if (raw.type === 'checkRuntimes') await diagnostics();
            if (raw.type === 'pickAttachments') post({ type: 'attachments', files: await pickAttachments() });
            if (raw.type === 'searchReferences') post({ type: 'references', requestId: raw.requestId, items: await searchReferences(raw.trigger, raw.query, raw.provider) });
            if (raw.type === 'openReport') {
              const uri = await document(live ? 'implementation-report.md' : 'demo-report.md', live ? report((await engine()).state.projection, true) : raw.markdown, 'markdown');
              await vscode.window.showTextDocument(uri, { preview: true });
            }
            if (raw.type === 'openSpec') {
              const found = findSpec(state, raw.id);
              if (!found) return;
              const { spec, milestone, request } = found;
              const text = `# ${spec.id}: ${spec.title}\n\n${live ? '> Saved Relay specification.' : '> Demo specification. No agent is executing this work.'}\n\nRequest: ${request.id}\nMilestone: ${milestone.id}\nRevision: ${spec.revision}\n\n${spec.description}\n\n## Acceptance criteria\n\n${spec.criteria.map(c => `- ${c}`).join('\n')}\n\n## Change requests\n\n${spec.amendments.map(a => `- ${a}`).join('\n') || 'None.'}`;
              await vscode.window.showTextDocument(await document(`${spec.id}.md`, text, 'markdown'), { preview: true });
            }
            if (raw.type === 'openDiff') {
              const found = findSpec(state, raw.id);
              if (!found?.spec.commits.some(c => c.sha === raw.sha)) return;
              if (live) {
                const cwd = (await engine()).state.plans[found.request.id]?.worktree;
                if (!cwd) throw new EngineError('Request worktree is unavailable.');
                const text = await git(cwd, ['show', '--format=fuller', '--stat', '--patch', raw.sha]);
                await vscode.window.showTextDocument(await document(`${raw.sha}.diff`, text, 'diff'), { preview: true }); return;
              }
              const before = await document('sample-before.css', '.settings-panel {\n  width: 640px;\n}\n', 'css');
              const after = await document('sample-after.css', '.settings-panel {\n  width: 100%;\n  max-width: 640px;\n  min-width: 0;\n}\n', 'css');
              await vscode.commands.executeCommand('vscode.diff', before, after, `SAMPLE DIFF · ${raw.id} · ${raw.sha}`);
            }
          } catch (error) { post({ type: 'notice', text: error instanceof EngineError ? error.message : 'Relay could not finish this action. Check settings and reopen the view to retry.' }); }
        }, undefined, context.subscriptions);
      }
    })
  );
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('relay.claudeIntegration') || event.affectsConfiguration('relay.codexIntegration')) post(workspaceMessage()); }));
  for (const provider of ['claude', 'codex'] as const) if (context.workspaceState.get<boolean>(registeredKey(provider), false) && vscode.workspace.isTrusted) {
    // Refresh the endpoint and stable proxy after reload; no model call or native login is started.
    void engine().then(() => connectNative(provider, false)).catch(() => {});
  }
}
