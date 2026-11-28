# Frequently asked questions

## Does Contextory replace my chat or model?

No. Keep using your native agent. Contextory supplies shared project records and tools; conversation history, sign-in, model selection and editing stay with the client.

## Do I need Python or a model download?

Node.js 24+ is required. Python 3.10+ is needed only for Python analysis. Local semantic retrieval is optional; lexical/structural retrieval works without an embedding download.

## Does a code question need a tracked request?

Read-only source questions and documentation exports do not. Authorized implementation uses requests, milestones, criteria, a session/lease and independent evidence before explicit completion.

## Why is a submitted specification still open?

Outcome submission records the explanation. The agent must separately request completion with the returned current revision. Missing checks, stale evidence, dependencies, blocking findings and catalog proposals can prevent completion.

## Does a green agent light prove authentication?

It proves observed MCP traffic for that configured provider in this service instance. It does not prove model sign-in or execution of every hook. Use native trust controls and connection diagnostics for more detail.

## Can an agent approve its own Knowledge definition?

Compatible maintenance needs no new human decision. Agents may auto-approve implementation conflicts too, with an explicit conflict assessment, rationale, source/test links and validation. Conflicts involving process rules or results, changed approved behavior, retirements and uncertain conflicts require human review before implementation. New observations have optional baseline review and do not trigger mandatory approval alerts.

## Is a graph or linked test execution evidence?

No. Static extraction and test references indicate possible relationships. Verification requires actual current check results with their provenance and source/contract/attempt fingerprints.

## Does Contextory follow VS Code's language?

Yes. The built-in interface supports English and Brazilian Portuguese using vscode.env.language, with English fallback for other locales. Agents receive the project uiLanguage and must author new interface entries in that language. Historical/user content and code are preserved; documentation retains its English/pt-BR pair.

## Sources

- package.json
- src/providers/clients.ts
- src/core/workflow.ts
- src/core/usage.ts
- src/knowledge/catalog.ts
- src/i18n/index.ts
- src/i18n/pt-BR.json
- package.nls.json
- package.nls.pt-br.json
- src/extension.ts
- src/webview/document.ts
- src/service/application.ts
- src/service/server.ts
- src/hooks/launcher.ts
- tests/core/i18n.test.ts
- tests/integration/i18n.test.ts
- tests/ui/i18n.spec.ts

