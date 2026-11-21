# What Contextory provides

## Choose a capability

| Capability | Result |
| --- | --- |
| Requests, milestones and specifications | Original intent, acceptance criteria, dependencies, revisions and verified completion |
| Project memory | Findings, fixes, choices, alternatives, evidence and outcome reports |
| Workspace projects | Separate records and source graphs; linked requests across explicitly selected folders |
| Architecture and Code map | Source navigation, subsystem dependencies, task context and bounded call/branch flow |
| Governed Knowledge | File responsibilities, rule/feature/test links and UI interaction definitions with human review |
| Versions | Repository-wide Git observation, release plans, local tags and separately authorized publication |
| Search and reports | Lexical search, optional local semantic retrieval, paged history and request exports |
| Native and portable integrations | Codex/Claude/Bob adapters, shared skills, generic MCP and standalone CLI |

[Follow the UI walkthroughs](walkthroughs.md)

[Use advanced source and workspace workflows](advanced.md)

## Read results with their limits

1. Select the owning Project before inspecting records. Preserve project identity when copying citations or exporting results.
2. Read coverage, freshness and truncation notices beside source results. Refine the scope or follow pagination before drawing conclusions.
3. Use independently executed checks to verify a specification. Indexed test references and source diagrams describe possible relationships.

![Subsystem map, repository explorer and source inspector.](../assets/architecture-explorer.png)

Architecture explorer captured from Contextory.

## Sources

- src/webview/main.ts
- src/core/workflow.ts
- src/knowledge/catalog.ts
- src/releases/manager.ts
- src/codebase/queries.ts

