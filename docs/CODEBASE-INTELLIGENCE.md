# Codebase intelligence and portable agents

Version 0.3.0 adds a persistent source graph, task retrieval, an Architecture workbench, portable Agent Skills and headless execution. [Full delivery plan](CODEBASE-INTELLIGENCE-PLAN.md).

## Explore a project

Open **Architecture** in the sidebar or run **Contextory: Explore Architecture**. The view starts with a stable subsystem map, synchronized repository explorer and source inspector. Select a subsystem, a bounded file shortcut, then a symbol to inspect direct connections. Breadcrumbs and Back restore previous scopes and selection. Calls/imports/structure are shown initially; relationship and direction filters reveal other indexed evidence. **Explore connections** retrieves a fresh neighborhood around the selected source-qualified symbol. The directional **Matrix** counts indexed calls/imports/inheritance/re-exports: rows depend on columns, ↔ marks reciprocal direct dependencies, and selecting a cell explores its source subsystem. Zoom, background drag and fit support navigation. Entry points, shared symbols, conventions, index state and coverage notices remain available. Search for a symbol or describe a task, open cited source, and follow linked project decisions. **Refresh code index** checks current files and publishes a coherent snapshot. The Code map still provides detailed bounded call/control flow from the source cursor.

Agents should start related work with `contextory_code_context_get`. Exact definitions rank before textual mentions. Context expands through source calls, imports, tests, document links, message contracts and explicit project-record source references. Read-only questions need no request or lease. Use `source:src/payments.ts#charge` when a name is ambiguous. Locations are zero-based in tools and displayed one-based in source buttons.

`contextory_impact_get` accepts a source or record root and direction/depth/node bounds. `contextory_code_path_get` explains a bounded shortest connection, with each edge's source, extractor and evidence category. `contextory_code_architecture_get` provides orientation. `contextory_context_get` includes cached, bounded orientation so lifecycle hooks do not synchronously index or walk the graph.

## Configure coverage

Create an optional `contextory.project.json` at the workspace root:

```json
{
  "schemaVersion": 1,
  "name": "Checkout",
  "include": ["src/**", "tests/**", "docs/**", "*.json"],
  "exclude": ["src/generated/**"],
  "entryPoints": ["src/main.ts"],
  "conventions": ["Payment retries preserve the original idempotency key."],
  "maxFiles": 2000,
  "maxBytes": 16777216
}
```

Paths and globs are project-relative. Unknown manifest keys and invalid values fail explicitly while preserving the previous graph. Git-ignored files, dependencies, generated output, agent configuration, credential-like paths, binary input and files above 512 KiB are omitted. A non-Git workspace uses bounded filesystem enumeration. The default aggregate input budget is 16 MiB; configuration allows up to 10,000 files/64 MiB. Native extraction caps results at 20,000 nodes/100,000 edges and reports truncation. Indexing parses source and never imports or executes workspace modules.

| Input           | Native coverage and limits                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS/JS           | Compiler-resolved declarations, aliases, calls, references, inheritance, re-exports and local imports. Root tsconfig and indexed local extends/path aliases are supported. Dependency implementation, package-provided tsconfig, nested project-reference builds and dynamic dispatch are not exhaustively resolved.                                                                     |
| Python          | Isolated Python 3.10+ AST parsing: declarations, imports/aliases, straightforward instance calls, references, inheritance and test references. Shadowing/duplicate declarations suppress uncertain targets. Dynamic monkey-patching, framework injection and complete Python name/dataflow semantics are outside coverage. Python files are reparsed together when the snapshot changes. |
| Markdown/config | Headings, explicit Markdown source links, literal source-path references and external TS/JS module dependencies. Config parsing does not execute scripts or infer every build system.                                                                                                                                                                                                    |
| Contracts       | Literal RPC/MCP names and recognized worker/webview message types connect senders to handlers. These links are inferred; equal literals do not prove runtime delivery.                                                                                                                                                                                                                   |
| Project memory  | Explicit record source references and approved record relationships connect work history to code. Generated topology does not approve workflow dependencies or verification evidence.                                                                                                                                                                                                    |

Static calls describe possible connections; test references do not prove execution coverage. Every response includes snapshot/coverage or truncation information. Missing external/dynamic targets remain notices. Task context enforces a JSON UTF-8 byte cap of three bytes per requested estimated token (512–6000 requested tokens); it is not a model tokenizer guarantee. Optional local embeddings improve project-memory search when prepared; lexical/structural retrieval remains available offline.

Refresh hashes selected files, configuration and extractor version, reuses unchanged TypeScript ASTs and resolves relationships again. It removes obsolete edges after edits, renames, deletions or exclusions. Filesystem events are debounced; Git HEAD/index/ref events and a 30-second fallback poll also trigger checks. Queries verify current disk content before using the graph. Unsaved editor buffers remain the separate flow-analysis overlay feature. Large-repository latency has not been qualified.

## Optional Graphify import

Graphify is optional; no runtime dependency or Graphify source was copied. Export its node-link JSON (schema version 1), place the file in the workspace and call:

```json
{
  "name": "contextory_code_index_refresh",
  "arguments": { "graphifyPath": "graphify-out/graph.json" }
}
```

The importer validates IDs, edge endpoints, source paths and bounds, namespaces foreign IDs, and retains supplied extracted/inferred/ambiguous provenance. Source files must be readable, included workspace files; external symlinks and parent traversal are rejected. JSON is limited to 16 MiB, each source to 512 KiB, and combined imports to 50,000 nodes/200,000 edges. Re-importing the same canonical path replaces its facts transactionally. Failure preserves the prior saved import and graph. Source hashes invalidate the whole imported graph when any cited file changes, disappears or is excluded; regenerate and re-import it. Unsupported languages can use this path, with the imported extractor's own accuracy limits. Source-free conceptual nodes cannot be invalidated against source content.

## Agent portability

The canonical `skills/contextory-codebase` and `skills/contextory-workflow` folders follow the Agent Skills structure: concise discovery descriptions, `SKILL.md` entry points and progressively loaded references. `npm run skills:package` generates the runtime bundle; `npm run skills:check` detects drift. Build packages that same content for every adapter.

The skills explain task context versus history search, source-qualified ambiguity, relationship direction, bounded results, current-file verification, automatic saved-file updates, Graphify invalidation and fallback when a capability is missing. Native and headless MCP expose the same shared runtime instructions; briefs and optional lifecycle reminders reinforce this guidance. Use only tools advertised by the current session: older connections may need a native MCP reload after an upgrade, with CLI/native source inspection available in the meantime.

| Adapter     | MCP configuration      | Skills               | Optional hooks                |
| ----------- | ---------------------- | -------------------- | ----------------------------- |
| Codex       | `.codex/config.toml`   | `.agents/skills`     | `.codex/hooks.json`           |
| Claude Code | `.mcp.json`            | `.claude/skills`     | `.claude/settings.local.json` |
| IBM Bob     | `.bob/mcp.json`        | `.bob/skills`        | `.bob/settings.json`          |
| Generic MCP | `.contextory/mcp.json` | `.contextory/skills` | None                          |

Run **Contextory: Export Generic MCP Connection**, import the generated server entry into your MCP client, and install/copy the two skill folders into that client's supported discovery location. `.contextory/skills` is an export location, not a universal automatic discovery path. Clients without skills can use MCP tool schemas or the CLI directly. Native clients own trust, reload, permissions and session startup. Hooks add reminders/metadata; they are not prerequisites for retrieval or workflow correctness. Portable instructions do not make host configuration, supported tools or model behavior identical across agents.

When developing Contextory, `npm run skills:sync` regenerates the bundle and updates all four workspace skill locations without changing MCP/hooks. `npm run skills:workspace-check` detects drift. Repository development entry instructions link to the canonical resources; they are not installed into user projects. See [instruction maintenance](DEVELOPMENT.md#maintain-agent-instructions).

## Run without an editor

Use the packaged `dist` directory with Node.js 24+ (Python is needed only for Python symbols/flow):

```powershell
node dist/contextory.mjs index --root C:/Projects/Checkout
node dist/contextory.mjs context "payment retries" --root C:/Projects/Checkout --budget 3000
node dist/contextory.mjs impact "source:src/payments.ts#charge" --root C:/Projects/Checkout
node dist/contextory.mjs path "checkout" "charge" --root C:/Projects/Checkout
node dist/contextory.mjs architecture --root C:/Projects/Checkout
node dist/contextory.mjs import graphify-out/graph.json --root C:/Projects/Checkout
node dist/contextory.mjs mcp --root C:/Projects/Checkout
```

For a generic client, configure command `node` and argument array `["/absolute/path/dist/contextory.mjs", "mcp", "--root", "/absolute/workspace"]`. Stdio MCP stays alive until EOF/signals and does not need editor heartbeats. JSON responses go to stdout; diagnostics go to stderr. Native check tools can run explicitly configured workspace recipes from `.vscode/settings.json`; opening an index does not execute them.

Standalone mode uses `<root>/.contextory-local/service` by default, or `--storage <directory>`. Editor-managed storage remains in the editor's global storage and is preserved. To share existing editor records, use `--descriptor <editor-storage>/generic.json` with the matching `--root`; **Export Generic MCP Connection** shows that descriptor in its generated arguments. Keep the editor service running for that attachment. Headless storage is a separate ledger unless explicitly attached; there is no silent record merge. Concurrent headless clients can attach to an existing service in the same storage; if its owning process exits, reconnect the client to start a new owner.

## Validate

`npm run check` covers skill drift, types, build, backend and UI tests. `npm run evaluate:codebase` writes `artifacts/codebase-evaluation.json` from a deterministic checkout fixture: definition rank, relevant-file recall, call/contract correctness, memory linkage, obsolete-edge removal, response bytes and latency. This is a regression evaluation, not a claim about arbitrary repositories or autonomous model behavior. [Validation record](VALIDATION.md).

Design references: [Graphify](https://github.com/Graphify-Labs/graphify), [GitHub's portable skills guide](https://github.blog/ai-and-ml/github-copilot/build-once-run-on-any-agent-a-practical-guide-to-agent-skills/), and the [Agent Skills specification](https://agentskills.io/specification). Shared instructions are portable; client capabilities and actual tool execution remain explicit adapters.
