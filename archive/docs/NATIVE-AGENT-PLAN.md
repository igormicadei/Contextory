# Native-agent rebuild: delivery record

2026-11-12 · Branch `redesign/native-agent-foundation` · Base `4fcbc44` · Version 0.2.0

The approved direction is implemented as a replacement architecture. Native chat owns the conversation; Contextory owns durable project workflow, checks, knowledge and source navigation. The earlier chat composer, agent dispatch, runtime adapters, handoff broker, conversation stores and their obsolete fixtures/docs/assets were removed. Git history preserves that implementation. No compatibility layer or legacy data migration is provided.

## Milestone results

| Milestone                           | Delivered                                                                                                                                | Qualification boundary                                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| N00 — Deployment choices            | External Node 24+, built-in SQLite/FTS, TypeScript worker, loopback RPC, local model profile; measured fixture                           | Windows editor hosts tested; no Rust spike or large-monorepo claim                                                        |
| N01 — Authoritative service         | Transactional records/revisions/audit, leases, dependencies, configured checks, fingerprints, restart recovery                           | One local folder; no remote/multi-root mapping                                                                            |
| N02 — Native integration            | Standard stdio MCP, three project configuration adapters, advisory hooks, managed skill, observed-traffic status, owned disconnect       | Protocol/hook fixtures and host configuration tested; authenticated native model sessions remain to qualify               |
| N03 — Companion UI and explanations | Overview, request/spec tree, contract/issues/decisions/evidence/outcome/history, deterministic exports                                   | Browser accessibility/navigation/responsive tests and actual editor-host smoke tests                                      |
| N04 — Project memory                | FTS chunks, current-source filtering, historical detail reads, indexed project/source relationships and bounded impact traversal         | Current projection search; explicit revision reads for historical material                                                |
| N05 — Call map                      | Editor context-menu command, public call hierarchy, bounded traversal, recursion, source navigation, snapshot expansion, SVG/JSON export | Other languages depend on installed call providers                                                                        |
| N06 — TS/JS flow                    | Compiler-based calls, branches, loops, returns, exceptions/finally, overlays, resource/cancellation boundaries                           | Static supported subset; no runtime coverage claim                                                                        |
| N07 — Optional vectors              | Pinned local q8 model, content/model-bound vectors, explicit refresh and hybrid fusion                                                   | Real CPU model test passed; 10k vector capacity, small relevance fixture, no broad multilingual/code-retrieval evaluation |
| N08 — Delivery checks               | Clean source layout, focused tests, measured benchmark, VS Code/Bob host smoke, VSIX and notices                                         | Native model sessions and broad deployment/scale matrix remain release qualification work                                 |

## Final source layout

```text
src/
  extension.ts        editor/UI composition
  contracts/          shared schemas and graph/domain types
  core/               workflow invariants and report projections
  service/            process lifecycle, RPC, clients, tool dispatch
  storage/            SQLite records, revisions, audit and projections
  providers/          owned native MCP/hook/skill registration
  mcp/ hooks/         small provider-facing launchers
  knowledge/          lexical, vector and relationship queries
  analysis/           bounded compiler engine and worker manager
  editor/             public call-hierarchy bridge
  verification/       source validation/fingerprints and named checks
  webview/            companion views and source diagram
tests/                core, analysis, integration, UI, host
scripts/              build, preview, host tests, benchmark, model preparation
```

## Important implementation decisions

1. Use SQLite edges alongside records instead of deploying a graph database. Relationships and source graphs have bounded traversal; vectors do not determine truth or completion.
2. Isolate heavier work from the extension host. Load the compiler worker and optional model only when needed. Hooks perform no indexing, embedding, checks, transcript reads or model calls.
3. Keep completion stricter than an agent's final message. A current outcome and independent criterion evidence are required, while explanations and failed attempts remain stored.
4. Make native support observable. Configuration, MCP traffic and hook traffic have separate status, and the implementation does not claim complete interception of native tools.
5. Keep model preparation explicit. Tracking, lexical retrieval and flow analysis work without its download or runtime footprint.
6. Preserve original intent and full record revisions. Agents record concise conclusions and tradeoffs rather than a reasoning transcript.

## Remaining qualification

Run disposable authenticated sessions in each native agent extension: start from native chat, observe the session/prompt/tool/stop hooks, create and complete a tracked spec, restart, then retrieve its findings/decisions from another provider. Also qualify hook trust/disable behavior and each provider version's reload behavior. Protocol fixtures and launching the Bob editor do not replace this model-driven path.

Before broad distribution, measure substantially larger repositories, high-fanout providers, sustained idle CPU, optional model warm latency/RSS and representative retrieval quality. Remote hosts and additional language-specific extractors each need their own test matrix. A Rust engine or external graph/vector backend should follow an identified bottleneck, not become an installation dependency preemptively.

Commands and recorded evidence are in [VALIDATION.md](VALIDATION.md). The implemented behavior is described in [NATIVE-AGENT-ARCHITECTURE.md](NATIVE-AGENT-ARCHITECTURE.md).

## Request-focused iteration — 0.2.1

Implemented the follow-up UI and agent-workflow changes: all open requests in Overview, three readable recent activities, compact bottom connection cards, a full linked/paged History tab, inline milestone/spec expansion inside one request card, and descendant-aware request filtering in place of the Knowledge tab. Request-scoped exports now present contracts, criteria, changes, issue resolutions, choices, test recipes/results, evidence provenance and outcomes.

Agent search/relationship/source-flow tools remain available and are called out in MCP instructions, workspace briefs and provider skills. Outcome submission returns an explicit completion call; verified completion and reopen/new-work actions update the hierarchy. A real stdio MCP test runs checks, submits, completes and reads the closed spec/milestone/request without a UI status change.

Python adds an isolated standard-library AST backend, including incoming/outgoing calls, branches, loops, early exits, conservative exceptions/finally, imports, methods, unsaved overlays, bounded expansion and explicit dynamic boundaries. Tracing preserves the source selection, stays in the sidebar when invoked there and uses a dedicated editor flow surface from the editor command. The packaged parser and both editor hosts have regression coverage. Updated performance measurements include Python and the complete 2,000-record dashboard.

## Visual refinement and relationship view — 0.2.2

Removed the Overview introduction, added completed/total spec progress to current requests, and moved agent controls into a pinned footer using names and status lights. Main content scrolls independently and retains its position during updates. Replaced the relationship-ID banner with a dedicated workbench view containing record titles/IDs, summaries, states, source references, relationship direction and rationale. Related records navigate back to the owning spec's detail tab. Impact queries now return readable bounded projections and deduplicated edges, also available through MCP.

## Contextory identity — 0.2.3

Renamed the extension, commands, settings, MCP tool/server names, provider-managed workflow skills, hooks, service errors, report branding, developer paths and package artifacts to Contextory. The extension identity is `contextory-local.contextory-workspace`; tool names use `contextory_` and settings use `contextory.`. Previous builds should be disconnected before replacement; prior extension storage is retained without automatic import.

The new symbol combines a request card with three linked context nodes. A theme-aware monochrome version is shared by the activity bar and webview header; a matching color version is supplied as vector artwork and a generated 256-pixel extension icon. Superseded release checksums were removed; Git retains previous releases.

All surfaces now use live VS Code semantic color tokens instead of fixed dark fallback colors, including buttons, input/select fields, links, focus rings, progress bars, status indicators, diagrams and pinned agent controls. Workbench views use editor colors and the sidebar uses sidebar colors. High-contrast borders, badges and graph edges receive explicit treatment. Theme changes rely on the editor's existing CSS-token updates, so they do not reload the webview or reset work in progress. UI regression checks switch through light, dark, custom and both high-contrast modes while preserving request elements and draft text.
