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

No. Agents create observations and concrete proposals. The authenticated human Knowledge UI approves or rejects exact revisions, preserving reasons and history.

## Is a graph or linked test execution evidence?

No. Static extraction and test references indicate possible relationships. Verification requires actual current check results with their provenance and source/contract/attempt fingerprints.

## Sources

- package.json
- src/providers/clients.ts
- src/core/workflow.ts
- src/core/usage.ts
- src/knowledge/catalog.ts

