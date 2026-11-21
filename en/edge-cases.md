# Limits and compatibility

## Supported and unqualified environments

The qualified preview uses Windows, trusted local folders, Node.js 24+, VS Code 1.96+ or IBM Bob, and at most 16 non-nested workspace projects. Remote/virtual workspaces, other operating systems, arbitrary monorepo scale and authenticated end-to-end conversations in every native agent are not qualified.

## Source and flow analysis boundaries

Default interactive flow uses five call hops, 150 nodes, 300 edges and a two-second budget. Python flow scanning is bounded to 500 files, 512 KiB per file and 12 MiB total. Frontiers, cycles, unresolved targets and size/time boundaries remain visible. Expand or retrace to continue.

TypeScript and Python extraction is static. Dynamic dispatch, generated code, external dependencies and framework runtime behavior may not resolve. Other flow languages rely on available editor call hierarchy and do not automatically receive branch extraction. Saved graph results and unsaved flow overlays have different freshness rules.

## Recovery, revisions and concurrency

One active implementation lease owns each specification. Reread a record after a revision conflict; do not retry changed input with an old operation ID. Reuse exact operation/input only after an uncertain result. Cross-project creation is recoverable and may partially succeed; it is not an atomic transaction.

An unavailable source, stale Graphify import, missing independent check, pending Knowledge proposal or unresolved blocking finding stays an explicit limitation or completion blocker. Native permissions remain in force.

## Sources

- src/codebase/config.ts
- src/codebase/import.ts
- src/analysis/python.ts
- src/providers/registration.ts
- src/service/workspace.ts
- tests/integration/workspace.test.ts

