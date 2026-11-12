import { test, expect, type Page } from '@playwright/test';
import { createDemo } from '../../src/shared/fixtures';

async function contained(page: Page) {
  const problems = await page.evaluate(() => {
    const issues: string[] = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('document horizontal overflow');
    if (document.documentElement.scrollHeight > innerHeight + 1) issues.push('document vertical overflow');
    for (const element of document.querySelectorAll<HTMLElement>('button, select, textarea, input, progress, .request, .check-card, .runtime-card, .composer, .detail, .notice, .chat-message, .decision-card, .composer-settings')) {
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      if (box.left < -1 || box.right > innerWidth + 1) issues.push(`${element.className || element.tagName} exceeds viewport`);
      if (!['INPUT', 'TEXTAREA', 'SELECT', 'PROGRESS'].includes(element.tagName) && element.scrollWidth > element.clientWidth + 1) issues.push(`${element.className || element.tagName} content overflow`);
    }
    return issues;
  });
  expect(problems).toEqual([]);
}
const requests = (page: Page) => page.getByRole('button', { name: /^Requests\d*/ }).click();
async function progressControls(page: Page) {
  const toggle = page.getByRole('button', { name: 'Progress details', exact: true });
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
}
async function settings(page: Page) {
  if (!await page.getByLabel('Agent', { exact: true }).isVisible()) await page.getByRole('button', { name: 'Agent and model settings', exact: true }).click();
}
async function utility(page: Page, name: string) {
  await page.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
}
async function send(page: Page, text: string) {
  await page.getByLabel('Request message').fill(text);
  await page.getByLabel('Request message').press('Control+Enter');
}
const reply = (page: Page) => page.locator('.chat-message.assistant .message-text').last();
test.beforeEach(async ({ page }) => { await page.goto('/sidebar.html'); });

test('native custom themes and live switches drive colors without palette overrides', async ({ page }) => {
  for (const theme of ['vscode-light', 'vscode-dark', 'vscode-high-contrast', 'vscode-high-contrast-light']) {
    await page.evaluate(theme => {
      document.body.removeAttribute('data-theme'); document.body.className = theme;
      const tokens: Record<string, string> = { 'sideBar-background': '#302341', 'editor-background': '#362b48', 'input-background': '#433451', foreground: '#f6e7c8', descriptionForeground: '#c7b59c', 'textLink-foreground': '#ffbe83', 'button-background': '#8146ad', 'button-foreground': '#ffffff', 'progressBar-background': '#57bbdc', focusBorder: '#ffdb56', contrastBorder: '#cdab87' };
      for (const [key, value] of Object.entries(tokens)) document.documentElement.style.setProperty(`--vscode-${key}`, value);
    }, theme);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(48, 35, 65)');
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(246, 231, 200)');
    await expect(page.locator('.send-button')).toHaveCSS('background-color', 'rgb(129, 70, 173)');
    await expect(page.locator('body')).toHaveCSS('color-scheme', theme.includes('light') ? 'light' : 'dark');
  }
  await page.evaluate(() => document.documentElement.style.setProperty('--vscode-sideBar-background', '#e8edf6'));
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(232, 237, 246)');
  await contained(page);
});

test('live bridge sends conversation, questions and run controls to the host without demo mutations', async ({ page }) => {
  await page.addInitScript(() => {
    const events: unknown[] = []; (window as any).sent = events;
    (window as any).acquireVsCodeApi = () => ({ getState: () => null, setState: () => {}, postMessage: (message: unknown) => events.push(message) });
  });
  await page.reload();
  await page.evaluate(() => window.postMessage({ type: 'workspace', live: true, name: 'Live fixture' }));
  await page.evaluate(state => window.postMessage({ type: 'restore', state }), createDemo());
  await expect(page.locator('.preview-chip')).toHaveText('Live');
  await send(page, 'What does this project do?');
  expect(await page.evaluate(() => (window as any).sent.filter((m: any) => m.type === 'liveSubmit'))).toMatchObject([{ text: 'What does this project do?', attachments: [] }]);
  await requests(page); await page.locator('[data-run-request]').first().click();
  expect(await page.evaluate(() => (window as any).sent.some((m: any) => m.type === 'liveRun'))).toBe(true);
  await settings(page); await page.getByRole('button', { name: 'Refresh models' }).click();
  expect(await page.evaluate(() => (window as any).sent.some((m: any) => m.type === 'models'))).toBe(true);
  await contained(page);
});

test('native Claude delegates model and Send to its extension while sharing Relay intake', async ({ page }) => {
  await page.addInitScript(() => {
    const events: unknown[] = []; (window as any).sent = events;
    (window as any).acquireVsCodeApi = () => ({ getState: () => null, setState: () => {}, postMessage: (message: unknown) => events.push(message) });
  });
  await page.reload();
  await page.evaluate(() => window.postMessage({ type: 'workspace', live: true, name: 'Native fixture', claudeIntegration: 'native' }));
  await page.evaluate(state => window.postMessage({ type: 'restore', state }), createDemo());
  await settings(page); await page.getByLabel('Agent', { exact: true }).selectOption('claude');
  await expect(page.getByLabel('Model', { exact: true })).toContainText('Selected in Claude extension');
  await expect(page.getByLabel('Effort level')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Refresh models' })).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/native-claude-settings.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('.composer-hint')).toContainText('press Send there');
  await page.getByLabel('Request message').fill('Discuss this project without creating a request.');
  await page.getByRole('button', { name: 'Open in Claude', exact: true }).click();
  expect(await page.evaluate(() => (window as any).sent.filter((m: any) => m.type === 'liveSubmit'))).toMatchObject([{ choice: { provider: 'claude', model: 'default', effort: 'default' } }]);
  await contained(page);
});

test('native Codex attaches a handoff with native model/reasoning controls and contains narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 900 });
  await page.addInitScript(() => {
    const events: unknown[] = []; (window as any).sent = events;
    (window as any).acquireVsCodeApi = () => ({ getState: () => null, setState: () => {}, postMessage: (message: unknown) => events.push(message) });
  });
  await page.reload();
  await page.evaluate(() => window.postMessage({ type: 'workspace', live: true, name: 'Native Codex fixture', codexIntegration: 'native' }));
  await page.evaluate(state => window.postMessage({ type: 'restore', state }), createDemo());
  await settings(page);
  await expect(page.getByLabel('Model', { exact: true })).toContainText('Selected in Codex extension');
  await expect(page.getByLabel('Reasoning level')).toBeDisabled();
  await expect(page.locator('.composer-hint')).toContainText('Continue the attached Relay turn');
  await expect(page.getByRole('button', { name: 'Refresh models' })).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/native-codex-settings.png' });
  await contained(page); await page.keyboard.press('Escape');
  await page.getByLabel('Request message').fill('Discuss the project with native Codex.');
  await page.getByRole('button', { name: 'Open in Codex', exact: true }).click();
  expect(await page.evaluate(() => (window as any).sent.filter((m: any) => m.type === 'liveSubmit'))).toMatchObject([{ choice: { provider: 'codex', model: 'default', effort: 'default' } }]);
  await page.evaluate(() => window.postMessage({ type: 'workspace', live: true, name: 'Native Codex fixture', codexIntegration: 'appServer' }));
  await settings(page); await expect(page.getByRole('button', { name: 'Refresh models' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
});

test('chat is the default, chrome is compact and controls open only on demand', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Chat', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('log', { name: 'Conversation messages' })).toBeVisible();
  await expect(page.getByLabel('Filter requests')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pause demo', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Model', { exact: true })).toHaveCount(0);
  expect(await page.locator('.run-summary').evaluate(e => e.getBoundingClientRect().height)).toBeLessThan(85);
  await expect(page.getByRole('progressbar')).toHaveCount(2);
  await progressControls(page);
  await expect(page.getByRole('button', { name: 'Pause demo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Progress details', exact: true }).click();
  await settings(page);
  await expect(page.getByLabel('Model', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/composer-settings.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Model', { exact: true })).toHaveCount(0);
});

test('project questions and casual discussion keep requests unchanged and persist the conversation', async ({ page }) => {
  await send(page, 'Hi');
  const original = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('relay.demo.v1')!);
    return { requests: s.requests, events: s.events, decisions: s.decisions, submissions: s.submissions };
  });
  for (const text of ['What happened to REQ-001?', 'How should we improve account settings?', 'Could we use a different search strategy?', 'Can you explain the project?']) await send(page, text);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('relay.demo.v1')!));
  expect({ requests: saved.requests, events: saved.events, decisions: saved.decisions, submissions: saved.submissions }).toEqual(original);
  expect(saved.messages).toHaveLength(12);
  await expect(reply(page)).toContainText('shared project conversation');
  await page.reload();
  await expect(page.locator('.chat-message')).toHaveCount(12);
  await expect(page.getByRole('log')).toContainText('What happened to REQ-001?');
  await expect(page.getByRole('log')).toContainText('Can you explain the project?');
});

test('actionable changes receive linked acknowledgments instead of leaving the conversation', async ({ page }) => {
  await settings(page); await page.getByLabel('Agent', { exact: true }).selectOption('claude');
  const text = 'Support <img src=x onerror=alert(1)> and very_long_' + 'content'.repeat(35);
  await send(page, text);
  await expect(reply(page)).toContainText('Added REQ-004 to the Claude Code queue');
  await expect(page.getByRole('button', { name: 'Chat', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('img')).toHaveCount(0);
  await page.getByRole('button', { name: /^Open REQ-004:/ }).click();
  await expect(page.locator('.request').last()).toContainText('Claude');
  await expect(page.locator('.request-status').last()).toHaveText('Needs planning');
  await page.reload(); await requests(page);
  await expect(page.locator('.request-title').last()).toHaveText(text);
  await contained(page);
});

test('tree, checks, sample diffs and compact progress stay connected', async ({ page }) => {
  await requests(page);
  await expect(page.getByRole('progressbar', { name: 'Overall progress', exact: true })).toHaveAttribute('value', '3');
  await page.getByRole('button', { name: /SPEC-003: Responsive/ }).click();
  await expect(page.getByRole('heading', { name: 'Responsive states & overflow' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/spec-details.png' });
  await page.getByRole('tab', { name: 'Checks · 3' }).click();
  await expect(page.locator('.check-badge', { hasText: 'pending' })).toHaveCount(3);
  await progressControls(page);
  await page.getByRole('button', { name: 'Pause demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Advance demo one step' })).toBeDisabled();
  await page.getByRole('button', { name: 'Resume demo' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Advance demo one step' }).click();
  await expect(page.getByRole('progressbar', { name: 'Overall progress', exact: true })).toHaveAttribute('value', '4');
  await page.getByRole('tab', { name: 'Commits · 1' }).click();
  await page.locator('.commit-card').click();
  await expect(page.getByRole('dialog')).toContainText('SAMPLE DIFF');
  await page.screenshot({ path: 'artifacts/sample-diff.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(reply(page)).toContainText('Completed in the demo');
});

test('amendments explain stale evidence in chat and retain old commit links', async ({ page }) => {
  await send(page, 'SPEC-001: Cover long localized display names.');
  await expect(reply(page)).toContainText('Updated SPEC-001');
  await expect(reply(page)).toContainText('previous checks are stale');
  await page.getByRole('button', { name: /^Open REQ-001:/ }).last().click();
  await page.getByRole('button', { name: /SPEC-001: Profile form/ }).click();
  await expect(page.locator('.detail-meta')).toContainText('v2');
  await page.getByRole('tab', { name: 'Checks · 3' }).click();
  await expect(page.locator('.check-badge', { hasText: 'stale' })).toHaveCount(3);
  await page.getByRole('tab', { name: 'Commits · 1' }).click();
  await expect(page.locator('.commit-card')).toContainText('Spec v1');
  await expect(page.getByRole('progressbar', { name: 'Overall progress', exact: true })).toHaveAttribute('value', '2');
});

test('filtering, utilities, diagnostics, activity and report export remain available', async ({ page }) => {
  await requests(page);
  await page.getByLabel('Filter requests').fill('no-such-request');
  await expect(page.getByText('No matching requests')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filter' }).click();
  await expect(page.locator('.request')).toHaveCount(3);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.locator('.event')).toHaveCount(3);
  await utility(page, 'Provider compatibility');
  await page.getByRole('button', { name: 'Check installed runtimes' }).click();
  await expect(page.getByRole('status')).toContainText('Browser preview cannot inspect');
  const download = page.waitForEvent('download');
  await utility(page, 'Export demo report');
  expect((await download).suggestedFilename()).toBe('relay-demo-report.md');
});

for (const width of [280, 320, 360, 480]) {
  test(`conversation, inspectors and settings fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await contained(page);
    await settings(page); await contained(page); await page.keyboard.press('Escape');
    await progressControls(page); await contained(page);
    await page.getByRole('button', { name: 'Progress details', exact: true }).click();
    await requests(page); await page.getByRole('button', { name: /SPEC-003: Responsive/ }).click();
    await contained(page); await page.getByRole('tab', { name: 'Checks · 3' }).click(); await contained(page);
    await utility(page, 'Provider compatibility'); await contained(page);
    await send(page, 'Add ' + 'W'.repeat(1000)); await contained(page);
    await send(page, 'What happened to REQ-004?'); await contained(page);
  });
}
for (const theme of ['dark', 'light', 'contrast']) {
  test(`render ${theme} conversation without runtime or CSP errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(`/sidebar.html?theme=${theme}`); await contained(page);
    await page.screenshot({ path: `artifacts/sidebar-${theme}.png` });
    expect(errors).toEqual([]);
  });
}

test('invalid storage resets safely and preview server rejects arbitrary paths', async ({ page, request }) => {
  await page.evaluate(() => localStorage.setItem('relay.demo.v1', '{"schema":1,"requests":[null]}'));
  await page.reload(); await requests(page); await expect(page.locator('.request')).toHaveCount(3);
  for (const path of ['/package.json', '/.env', '/src/extension.ts', '/%2e%2e/package.json']) expect((await request.get(path)).status()).toBe(404);
});

test('full workbench uses the same conversation and width/theme controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 }); await page.goto('/');
  const sidebar = page.frameLocator('iframe');
  await expect(sidebar.getByRole('heading', { name: 'Workspace conversation' })).toBeVisible();
  await page.getByLabel('Sidebar width').selectOption('320');
  await expect(page.locator('.sidebar-frame')).toHaveCSS('width', '320px');
  await page.getByLabel('Preview theme').selectOption('light');
  await expect(sidebar.locator('body')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Preview theme').selectOption('dark');
  await page.getByLabel('Sidebar width').selectOption('360');
  await expect(sidebar.locator('body')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'artifacts/workbench-preview.png' });
});

test('request controls and option/custom decisions update the conversation', async ({ page }) => {
  await requests(page);
  const first = page.locator('.request').first();
  await expect(first.locator('.request-status')).toHaveText('Running');
  await first.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(first.locator('.request-status')).toHaveText('Paused');
  await first.getByRole('button', { name: 'Resume', exact: true }).click();
  await first.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(first.locator('.request-status')).toHaveText('Stopped');
  await first.locator('.request-row').click();
  await page.screenshot({ path: 'artifacts/request-statuses.png' });
  await page.getByRole('button', { name: /1 decision waiting/ }).click();
  const question = page.getByRole('form', { name: 'How should search build its index?' });
  await expect(question.getByRole('button', { name: 'Send answer' })).toBeDisabled();
  await question.getByRole('radio', { name: /Incremental index/ }).check();
  await question.getByLabel('Custom answer').fill('Use an incremental in-memory index and cap the cache.');
  await expect(question.getByRole('radio', { name: /Incremental index/ })).not.toBeChecked();
  await page.screenshot({ path: 'artifacts/decision-card.png' });
  await question.getByRole('button', { name: 'Send answer' }).click();
  await expect(reply(page)).toContainText('Decision recorded');
  await requests(page); await expect(page.locator('.request').nth(1).locator('.request-status')).toHaveText('Queued');
  await page.reload(); await expect(page.getByRole('log')).toContainText('Use an incremental in-memory index and cap the cache.');
});

test('sample model controls preserve text and constrain unsupported combinations', async ({ page }) => {
  await page.getByLabel('Request message').fill('Create a billing dashboard'); await settings(page);
  await expect(page.getByLabel('Reasoning level')).toBeDisabled();
  await page.getByLabel('Model', { exact: true }).selectOption('gpt-6.1-sol');
  await page.getByLabel('Reasoning level').selectOption('high');
  await page.getByLabel('Agent', { exact: true }).selectOption('claude');
  await expect(page.getByLabel('Request message')).toHaveValue('Create a billing dashboard');
  await page.getByLabel('Model', { exact: true }).selectOption('opus'); await page.getByLabel('Effort level').selectOption('max');
  await page.getByLabel('Model', { exact: true }).selectOption('haiku');
  await expect(page.getByLabel('Effort level')).toBeDisabled(); await expect(page.getByLabel('Effort level')).toHaveValue('default');
  await page.getByLabel('Model', { exact: true }).selectOption('sonnet'); await page.getByLabel('Effort level').selectOption('high');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.locator('.chat-message.user .message-context summary').last().click();
  await expect(page.locator('.chat-message.user').last()).toContainText('claude · sonnet · high');
});

test('routing questions allow ordinary chat while pending and preserve request ownership', async ({ page }) => {
  await send(page, 'Update REQ-001 and REQ-003 with a UI review');
  const question = page.getByRole('form', { name: 'Where does this message belong?' });
  await expect(question).toBeVisible();
  await send(page, 'Why is search waiting?');
  await expect(reply(page)).toContainText('Needs decision'.toLowerCase());
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('relay.demo.v1')!).submissions.length)).toBe(0);
  await question.getByRole('radio', { name: /REQ-003/ }).check(); await question.getByRole('button', { name: 'Route message' }).click();
  await expect(reply(page)).toContainText('Updated REQ-003');
  await settings(page); await page.getByLabel('Agent', { exact: true }).selectOption('claude');
  await send(page, 'REQ-001: improve the labels');
  await question.getByRole('radio', { name: /REQ-001/ }).check(); await question.getByRole('button', { name: 'Route message' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('relay.demo.v1')!).submissions[0].choice.provider)).toBe('codex');
});

test('completed work reopens through chat without losing old commit revisions', async ({ page }) => {
  await send(page, 'Hi');
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('relay.demo.v1')!);
    for (const milestone of state.requests[0].milestones) for (const spec of milestone.specs) spec.status = 'completed';
    localStorage.setItem('relay.demo.v1', JSON.stringify(state));
  });
  await page.reload(); await requests(page);
  await expect(page.locator('.request').first().locator('.request-status')).toHaveText('Done');
  await send(page, 'SPEC-001: improve localized name validation');
  await expect(reply(page)).toContainText('Reopened SPEC-001');
  await page.getByRole('button', { name: /^Open REQ-001:/ }).last().click();
  await page.getByRole('button', { name: /SPEC-001: Profile form/ }).click();
  await expect(page.locator('.detail-meta')).toContainText('v2');
  await page.getByRole('tab', { name: 'Commits · 1' }).click(); await expect(page.locator('.commit-card')).toContainText('Spec v1');
});

test('plus/paste and keyboard references stay conversational and persist metadata only', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Attach files or images' }).click();
  await (await chooser).setFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Local context') });
  await page.getByLabel('Request message').focus();
  await page.evaluate(() => {
    const data = new DataTransfer();
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
    data.items.add(new File([bytes], 'pasted.png', { type: 'image/png' }));
    document.querySelector('#draft')!.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await expect(page.getByRole('img', { name: 'Preview of pasted.png' })).toBeVisible();
  const draft = page.getByLabel('Request message'); await draft.fill('Review @src'); await draft.press('ArrowDown'); await draft.press('Enter');
  await expect(page.locator('.reference-chip')).toContainText('@src/');
  await draft.fill('Review @src/ $code'); await draft.press('Enter');
  await draft.fill('Review @src/ $code-reviewer /test'); await draft.press('Enter');
  await expect(page.locator('.reference-chip')).toHaveCount(3);
  await draft.press('End'); await draft.press('Space'); await draft.press('$'); await draft.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/composer-context.png' });
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('relay.demo.v1')!));
  expect(saved.messages.at(-2).attachments).toHaveLength(2); expect(saved.messages.at(-2).references).toHaveLength(3);
  expect(saved.requests).toHaveLength(3); expect(saved.submissions).toHaveLength(0);
  expect(JSON.stringify(saved)).not.toContain('base64'); expect(errors).toEqual([]);
});

test('narrow decisions and attachment popovers contain long input and reject oversized files', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 640 }); await page.getByRole('button', { name: /1 decision waiting/ }).click();
  await page.getByLabel('Custom answer').fill('Use ' + 'W'.repeat(600)); await contained(page);
  await page.locator('#attachment-input').setInputFiles({ name: 'too-large.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(4 * 1024 * 1024 + 1) });
  await expect(page.getByRole('status')).toContainText('Some files were skipped'); await expect(page.locator('.attachment-chip')).toHaveCount(0);
  await page.locator('#attachment-input').setInputFiles({ name: 'very_long_' + 'name'.repeat(40) + '.txt', mimeType: 'text/plain', buffer: Buffer.from('context') });
  await page.getByLabel('Request message').fill('@'); await contained(page); await page.getByLabel('Request message').press('Escape');
  await page.getByRole('button', { name: /Remove attachment/ }).click(); await expect(page.locator('.attachment-chip')).toHaveCount(0);
});

test('reading earlier messages is stable when execution adds an update', async ({ page }) => {
  for (let i = 0; i < 5; i++) await send(page, `What is the project workflow? ${i}`);
  await progressControls(page);
  await page.locator('.main-content').evaluate(e => { e.scrollTop = 0; });
  await page.getByRole('button', { name: 'Advance demo one step' }).click();
  expect(await page.locator('.main-content').evaluate(e => e.scrollTop)).toBeLessThan(2);
  await expect(page.getByRole('button', { name: 'Latest messages' })).toBeVisible();
  await page.getByRole('button', { name: 'Latest messages' }).click();
  await expect(reply(page)).toContainText('Checks passed in the demo');
  expect(await page.locator('.main-content').evaluate(e => e.scrollHeight - e.scrollTop - e.clientHeight)).toBeLessThan(64);
});
