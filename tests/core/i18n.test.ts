import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLanguage,
  setLanguage,
  language,
  tx,
  ui,
  contentLanguageInstruction,
} from "../../src/i18n";
import { webviewDocument } from "../../src/webview/document";
import { describeActivity } from "../../src/core/history";

test("VS Code locale normalization and English fallback are deterministic", () => {
  for (const value of ["pt-br", "pt-BR", "pt"])
    assert.equal(normalizeLanguage(value), "pt-BR");
  for (const value of [undefined, "en", "en-US", "fr", "pt-PT"])
    assert.equal(normalizeLanguage(value), "en");
  setLanguage("fr");
  assert.equal(language(), "en");
  assert.equal(tx("Work"), "Work");
});

test("Portuguese source messages preserve stored content, code, identifiers and interpolation boundaries", () => {
  setLanguage("pt-BR");
  try {
    assert.equal(tx("Work"), "Trabalho");
    assert.equal(
      ui`<h1>Work</h1><p>${"Work"}</p>`,
      "<h1>Trabalho</h1><p>Work</p>",
    );
    assert.equal(
      ui`<button data-action="requests" title="Review ${"Work"}">Requests</button>`,
      '<button data-action="requests" title="Revisar Work">Pedidos</button>',
    );
    assert.equal(
      ui`<p>Sources: ${"<code>src/Work.ts</code>"}</p>`,
      "<p>Fontes: <code>src/Work.ts</code></p>",
    );
    assert.equal(
      ui`<pre><code>Work</code></pre>`,
      "<pre><code>Work</code></pre>",
    );
    assert.equal(
      ui`<p>${"\uE0000\uE001{0}<script>Requests</script>"}</p>`,
      "<p>\uE0000\uE001{0}<script>Requests</script></p>",
    );
    assert.equal(
      ui`data-map="${"Requests"}" aria-label="Zoom in"`,
      'data-map="Requests" aria-label="Ampliar"',
    );
    assert.equal(ui`${3} files`, "3 arquivos");
    assert.equal(
      ui`Unknown source-owned phrase ${"Work"}`,
      "Unknown source-owned phrase Work",
    );
    assert.match(
      contentLanguageInstruction(language()),
      /Brazilian Portuguese/,
    );
    const event = describeActivity(
      {
        sequence: 1,
        type: "request.created",
        entityId: "REQ-test",
        actor: "codex",
        time: "now",
        data: { title: "Work" },
      },
      () => undefined,
    );
    assert.equal(event.presentation?.subject, "Work");
    assert.equal(
      ui`${tx(event.presentation!.action)}: ${event.presentation!.subject}`,
      "Pedido criado: Work",
    );
  } finally {
    setLanguage("en");
  }
});

test("all webview documents carry the VS Code language with localized title and unchanged CSP", () => {
  for (const surface of [
    "sidebar",
    "flow",
    "relationships",
    "architecture",
  ] as const) {
    const doc = webviewDocument({
      language: "pt-br",
      surface,
      script: "app.js",
      stylesheet: "app.css",
      cspSource: "vscode-webview:",
      nonce: "test-nonce",
    });
    assert.match(doc, /<html lang="pt-BR">/);
    assert.match(doc, /Contextory — Tarefas do workspace/);
    assert.match(doc, /connect-src 'none'/);
    assert.match(doc, /nonce-test-nonce/);
  }
});
