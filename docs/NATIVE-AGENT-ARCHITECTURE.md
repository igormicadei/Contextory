<a id="responsibility-boundary"></a>
<a id="process-and-deployment-choices"></a>
<a id="records-and-invariants"></a>
<a id="transport-and-native-adapters"></a>
<a id="knowledge-and-source-flow"></a>
<a id="current-limits"></a>
<a id="protocol-references"></a>

<!-- Generated from .documentation/project.json; edit the bilingual corpus. -->

# Runtime architecture

<a id="process-boundaries"></a>

## Follow the process boundaries

| Component | Responsibility |
| --- | --- |
| Native agent | Conversation, model, sign-in, editing and native permissions |
| Editor extension and webviews | Trusted workspace setup, UI, source navigation and live theme integration |
| Isolated Node service | Role-scoped tools, workflow enforcement, ledger, search, checks and release observation |
| Analysis workers / Python parser | Bounded static extraction outside the Extension Host; no workspace module imports |
| SQLite storage | Authoritative records/revisions/artifacts and rebuildable graph/search projections |

Native MCP proxies connect to private local service descriptors. Hooks provide bounded lifecycle reminders and normalized metadata. Native/headless MCP, briefs and hooks share runtime guidance; provider-specific configuration remains in explicit adapters.

<a id="authoritative-versus-derived"></a>

## Preserve authoritative records

Requests, contracts, immutable revisions, decisions, check evidence, outcomes, Knowledge definitions and release records are authoritative project history. The source graph and lexical/vector indexes are projections that can be rebuilt. Rebuilding source analysis must not erase workflow history.

Each workspace project owns its ledger, sessions, leases, checks, references and releases. Cross-project routing validates current editor membership and preserves the caller’s role. A reference repository has an isolated read-only projection inside its owning project.

<a id="privacy-and-authority"></a>

## Understand privacy and authority

Contextory stores concise project explanations and observed metadata rather than native chat transcripts. Check output and indexed project content are retained locally. Human Knowledge review is enforced by service roles, but a process with unrestricted local filesystem access is not isolated from service credentials or SQLite by this design.

[Read storage and settings details](https://igormicadei.github.io/Contextory/en/reference.html)

## Sources

- src/extension.ts
- src/service/server.ts
- src/service/application.ts
- src/storage/ledger.ts
- src/codebase/worker.ts
- src/agents/instructions.ts
