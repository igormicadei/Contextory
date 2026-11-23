---
name: contextory-documentation
description: Author, update, retrieve and build source-backed bilingual project documentation through Contextory's bundled software-documentation and Carbon runtime, including source and tracked-change associations.
metadata:
  version: "1"
---

<!-- contextory-managed-documentation -->

Use the existing Contextory MCP connection or packaged CLI. The documentation runtime, documentation playbooks, complete Carbon module, fonts and assets ship with Contextory; no CustomAgents/plugin installation or extra MCP registration is needed. Python 3.11+ is needed only for generator operations, using the project's `contextory.pythonExecutable`. Reading explanations and guidance does not require Python. Optional official Carbon MCP guidance is included; use it only if its tools are actually advertised.

Select the intended project with `contextory_workspace_get` and carry its `projectId` on every call. Read current task/source context and catalog before authoring. Page the relevant `contextory_project_export` datasets when documenting decisions, definitions, architecture, changes or evidence; retain record IDs, revisions, approval state, source freshness and historical provenance. Do not publish private history merely because it is exportable.

For existing explanations, call `contextory_docs_get` with `section=sections` and a query, source path or local record ID. Page results, inspect source links and distinguish authored drafts, stale/unknown citations and approved requirements. The source graph remains the basis for definitions and dependencies. Use `Tools > Documentation`, Architecture's **Explain this area**, or a request's **Related documentation** for the human browser. Approvals remains the human knowledge review destination.

Before creating or migrating a corpus, read the bundled upstream playbooks through `contextory_docs_get section=guidance resource=...`. `offset` and `limit` page 400-character units; follow `nextOffset` to the end of the needed guide:

- Create: `modules/software-documentation/skills/documentar-software/SKILL.md`.
- Update/migrate: `modules/software-documentation/skills/atualizar-documentacao-software/SKILL.md`.
- Corpus/schema and examples: `modules/software-documentation/references/corpus.md`.
- Native source comments: `modules/software-documentation/internal-skills/documentar-codigo-fonte/SKILL.md`.
- Consumer bundles/Pages: `modules/software-documentation/internal-skills/integrar-documentacao/SKILL.md`.
- Carbon: `modules/carbon-design/internal-skills/guia-visual-carbon/SKILL.md`. List more tokens, component guides, templates and licenses with `section=guidance query=...`.

The upstream copies retain their original tool names and installation routing. In Contextory, use `contextory_docs_run action=...` instead of an external `docs_*` tool: `map`, `init`, `validate`, `build`, `integrations`, `migrate`, `readme`, `pages_plan`, `pages_publish`, `pages_status`. Project scope supplies the authorized root; do not pass an arbitrary workspace. Discover the advertised argument schema. Mutations require your current spec lease. `init` needs a name/kind, preserves existing docs and produces drafts. `migrate` and `readme` preview unless `apply=true`. Author the corpus with native file tools. A map/build does not write verified explanations for you or establish complete coverage.

The bundled generator creates schema 2 Carbon sites; retrieval also reads schema 1. Preserve existing content/IDs/translations/URLs/assets and preview migration before applying its backup-protected change. Contextory's own schema-1 documentation build is separately pinned and must not be silently upgraded as part of another feature. Write substantive paired English/pt-BR content and real source/API/UI evidence, with explicit coverage gaps. Use the local Carbon renderer and assets; do not substitute a generic theme.

Operations return a durable job ID immediately. Poll `contextory_docs_get section=job jobId=...` (or `contextory_entity_get`) until terminal. Read large retained JSON artifacts with `contextory_project_export section=artifacts artifact=...`. A passed job means the operation ran; inspect validation/build results. A stale/invalid draft still needs work. Reuse the exact operation ID/input to recover an interrupted response, and inspect partially written output before starting a new job. No automatic mutation replay or publication occurs.

After reviewing a section against source, use leased `contextory_docs_link` with its stable page/section IDs, current `corpusFingerprint`, relevant local record IDs and a reason. It records observed associations and citation hashes; later text/source changes mark the explanation stale. Preserve association audit history. This is maintenance evidence, not human approval. Keep affected explanations current as tracked work changes, and link outcome/decision/catalog records as appropriate.

Build/check locally and inspect responsive Carbon output, both locales, search, navigation, source coverage and consumer integration before delivery. A request to implement documentation does not itself authorize publishing a connected project's website. With existing publication authorization, inspect `pages_plan`, then run `pages_publish publish=true` with the selected remote and verify `pages_status`. Preserve native trust, unrelated configuration and work. Follow the Contextory workflow skill's independent checks, catalog accounting, outcome and explicit spec completion requirements for authorized implementation.
