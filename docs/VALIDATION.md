# Validation — Relay 0.2.2

Recorded 2026-11-12 on Windows with Node 24.19.0. Branch: `redesign/native-agent-foundation`.

## Automated checks

Validation passes TypeScript checking, all six production bundles plus the packaged Python AST parser, **27 core/analysis/integration tests**, and **8 Playwright UI tests**. The real local embedding test ran and passed; it was not skipped in this validation.

Coverage includes idempotency/revisions, competing provider leases and expiry, dependency cycles, current independent evidence, durable explanations, source/contract changes, later failed checks, cancellation, historical records, late text chunks, missing-model fallback, stale source/vectors, graph recursion/diamonds/limits/early returns/finally, imports and unsaved overlays. Python tests exercise source-only parsing without executing a module, imports/aliases/methods, branches/loops/finally, recursion, parameter-dispatch boundaries, incoming calls, callee expansion and stale snapshots. A full-history test pages more than 125 events with descendant filtering and hierarchy links.

Real MCP SDK stdio coverage includes all exposed management/search/flow/history tools and a complete agent workflow: create request/milestone/spec, claim a lease, run an independent check, submit an outcome, execute its returned completion action and confirm completed spec/milestone/request records. Adding planned work and reopening a spec reopen parents. Request reports exclude unrelated work and include criteria, changes and test results. Other integration checks cover all three hook output formats, role isolation, authenticated loopback requests, descriptor rotation, job restart recovery, owned registration/disconnect, configuration conflicts and junction rejection.

UI checks exercise all open requests, three recent activities, pinned footer connection controls and determinate request progress bars, inline spec expansion, new requests, explanation tabs, evidence origins, keyboard tabs, escaping, descendant filtering, 85-event history pagination, linked navigation and request-specific report messages. Diagram tests cover source navigation, expansion/exports and the separate flow surface. Both 320/860-pixel layouts pass. Fixture screenshots were inspected: [sidebar](../artifacts/companion-sidebar.png), [request details](../artifacts/request-details.png), [history](../artifacts/request-history.png), [source flow](../artifacts/source-flow.png), [relationships](../artifacts/relationships.png). These are preview fixtures, not evidence of a native model conversation.

Footer pinning is checked while scrolling long content and filtering to a short list at 320/860 pixels. Relationship coverage verifies readable record titles/IDs, descriptions, rationale, source navigation, and returning to the owning spec decision tab. Backend checks verify summary/source projections, deduplicated edges and bounded endpoints. History pagination preserves its scroll position.

## Actual editor hosts and packaging

The isolated host test passes in:

| Host               | Version                                  | Result                                                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual Studio Code | 1.145.3                                  | Activation, commands, sidebar, external service, workflow mutation, provider configurations, TS worker, Python AST, remembered cursor, no extra sidebar trace tab, overlays, a dedicated relationship workbench with request/file summaries, request report and ledger |
| IBM Bob            | VS Code API 1.126.0; installed Bob 2.2.1 | Same host test using the supplied `IBM Bob.exe`                                                                                                                                                                                                                        |

The test uses a unique disposable workspace and user/extensions directories. It does not edit the user's real provider/global settings. Both hosts also passed against the extracted VSIX through `-ExtensionPath`; the reports identify that packaged extension path. Raw reports: [VS Code](../artifacts/host-vscode.json), [Bob](../artifacts/host-bob.json).

`npm run package:vsix` produces `artifacts/relay-workspace-0.2.2.vsix`, approximately **1.9 MB compressed**. It includes the service, TypeScript worker, Python AST script, MCP/hook launchers, webview/styles, architecture/plan/template/validation docs, optional model-preparation script and dependency notices. It excludes source maps, tests, models, developer runtimes, previous chat/router outputs and screenshots. Python analysis uses the installed Python 3.10+ executable rather than bundling an interpreter.

## Measured fixture

The retained 0.2.1 engine benchmark uses 200 source files (100 TS and 100 Python, approximately 2,200 functions per language), 2,000 project records, five call hops and fresh hook processes. Hardware: Intel Core Ultra 9 285H, 16 logical CPUs, 31.4 GiB RAM. Raw data: [benchmark.json](../artifacts/benchmark.json).

| Operation                             |    Median |       p95 |
| ------------------------------------- | --------: | --------: |
| Health RPC, 30 samples                |  15.94 ms |  19.17 ms |
| Lexical search, 20 samples            |  15.95 ms |  20.01 ms |
| Warm TS flow, 10 samples              |  66.28 ms |  72.16 ms |
| Repeated Python flow, 10 samples      | 230.46 ms | 260.55 ms |
| Health RPC during TS analysis, 20     |  21.98 ms |  25.09 ms |
| Health RPC during Python analysis, 20 |  19.48 ms |  21.32 ms |
| Complete dashboard, 2,000 records, 10 |  17.25 ms |  18.60 ms |
| Hook process, 8 samples               | 128.81 ms | 152.07 ms |

Single observations: service setup 41.34 ms (in-process, excludes external process startup), first TS worker/flow 472.46 ms, first Python flow 250.56 ms, source index 1,019.90 ms, seeding records/revisions 508.04 ms. Harness + service + active compiler worker RSS was 253.5 MiB; this does **not** measure idle extension overhead, isolate service RSS or include a separate peak Python-process measurement. Repeated Python queries include a fresh parser process and a bounded workspace scan. The earlier proposed 100 ms hook target was not met at p95; the current advisory RPC deadline is 450 ms plus native-client process overhead. No claim is made that all original performance targets passed.

The optional model/runtime occupies about 486 MiB on this Windows installation. Cold model integration testing takes roughly 13–16 seconds including load, several embeddings and test cleanup. Warm model latency, multilingual/code retrieval quality and large indexes have not been qualified. The small semantic fixture retrieves a credential-renewal record ahead of unrelated color-palette text and rejects an obsolete vector after revision.

## Qualification limits

No authenticated model conversation was driven through the actual Codex, Claude Code or Bob native chat extension during this validation. Standard MCP clients now demonstrate a complete spec workflow through the actual stdio bridge; generated configurations, hook launchers and editor hosts are also tested. Provider-native hook trust/reload and a model following the completion instructions still need a live native-chat run in each client before claiming full provider qualification.

Also unqualified: WSL/SSH/containers, multi-root folders, other operating systems, universal language/framework flow extraction, runtime instrumentation, sustained idle CPU, and 10k/100k-file or 100k-record workloads. Static source diagrams show possible bounded paths, not exhaustive runtime behavior. Search, optional vectors and explicit relationships assist navigation; they do not prove complete impact or correctness.
