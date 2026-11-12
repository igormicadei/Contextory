const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
exports.run = async function () {
  const output = path.resolve(__dirname, '../../artifacts/host-smoke.json');
  const result = { recordedAt: new Date().toISOString(), vscode: vscode.version, checks: [], passed: false };
  try {
    const extension = vscode.extensions.getExtension('relay-local.relay-workspace');
    assert.ok(extension, 'Development extension is discoverable');
    await extension.activate();
    assert.ok(extension.isActive, 'Extension activates');
    result.checks.push('extension activation');
    const commands = await vscode.commands.getCommands(true);
    for (const command of ['relay.openPlan', 'relay.checkRuntimes', 'relay.resetDemo', 'relay.connectNativeClaude', 'relay.connectNativeCodex']) assert.ok(commands.includes(command), command);
    result.checks.push('command registration');
    await vscode.commands.executeCommand('relay.tasks.focus');
    result.checks.push('webview view opens');
    await vscode.commands.executeCommand('relay.resetDemo');
    result.checks.push('preview reset command');
    await vscode.commands.executeCommand('relay.openPlan');
    result.checks.push('bundled plan preview command');
    // Exercise the interactive launch configuration, without a test-runner flag in its child.
    // A host that activates normally can still fail when launched under the F5 debugger.
    const root = path.resolve(__dirname, '../..');
    const launch = JSON.parse(fs.readFileSync(path.join(root, '.vscode/launch.json'), 'utf8')).configurations[0];
    const config = JSON.parse(JSON.stringify(launch).replaceAll('${workspaceFolder}', root.replaceAll('\\', '/')));
    config.name = 'Relay F5 regression';
    config.runtimeExecutable = process.platform === 'win32' ? config.windows.runtimeExecutable : process.platform === 'darwin' ? config.osx.runtimeExecutable : config.runtimeExecutable;
    config.args = config.args.map(arg => arg.replace('/debug-user', '/f5-smoke-user').replace('/debug-extensions', '/f5-smoke-extensions'));
    // VS Code reuses a development window for the same extension path. Give the
    // nested regression launch a copy so it cannot reload its own test runner.
    const fixtureRoot = path.join(root, '.relay-local/f5-extension');
    fs.mkdirSync(fixtureRoot, { recursive: true });
    fs.copyFileSync(path.join(root, 'package.json'), path.join(fixtureRoot, 'package.json'));
    for (const folder of ['dist', 'media', 'docs']) fs.cpSync(path.join(root, folder), path.join(fixtureRoot, folder), { recursive: true });
    config.args = config.args.map(arg => arg.startsWith('--extensionDevelopmentPath=') ? `--extensionDevelopmentPath=${fixtureRoot}` : arg);
    delete config.preLaunchTask; // The parent prepared and built the identical runtime already.
    assert.ok(!config.args.some(arg => arg.includes('extensionTestsPath')), 'Interactive F5 must not auto-exit as a test runner');
    // The parent is a test window; VS Code otherwise inherits its test-runner path.
    config.args.push('--extensionTestsPath=');
    let session;
    let ended = false;
    const debugOutput = [];
    const tracker = vscode.debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker(value) {
        if (value.name !== config.name) return undefined;
        return { onDidSendMessage(message) {
          if (message.type === 'event' && message.event === 'output' && typeof message.body?.output === 'string') debugOutput.push(message.body.output.slice(0, 2000));
        } };
      }
    });
    const started = vscode.debug.onDidStartDebugSession(value => { if (value.name === config.name) session = value; });
    const terminated = vscode.debug.onDidTerminateDebugSession(value => { if (value.name === config.name) ended = true; });
    try {
      assert.ok(await vscode.debug.startDebugging(undefined, config), 'F5 debugger starts');
      const deadline = Date.now() + 20000;
      while (!session && Date.now() < deadline && !ended) await new Promise(resolve => setTimeout(resolve, 100));
      assert.ok(session, 'F5 debug session is available');
      if (!config.noDebug) await Promise.race([
        session.customRequest('threads'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('F5 debugger did not respond')), 10000))
      ]);
      await new Promise(resolve => setTimeout(resolve, 3000));
      assert.equal(ended, false, 'F5 development host stays running');
      result.checks.push(config.noDebug ? 'F5 preview development host stays running without inspector attachment' : 'F5 debugger responds and development host stays running');
    } finally {
      if (session && !ended) await vscode.debug.stopDebugging(session);
      started.dispose(); terminated.dispose();
      tracker.dispose();
      if (ended) result.debugOutput = debugOutput.slice(-10);
    }
    result.passed = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Host smoke failed';
    throw error;
  } finally {
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  }
};
