# Documentation rewrite review

Date: 2026-11-21 (America/Sao_Paulo).

Initial request: rewrite the existing Contextory documentation using `software-documentation:atualizar-documentacao-software` and its default layouts. The user subsequently authorized committing and pushing all changes and deploying the documentation. A version bump and installation into a live editor remain outside this request.

## Scope and migration

- Replaced the VitePress site with the documentation skill's unchanged default Carbon renderer and assets, retained with MIT license and byte hashes in `scripts/documentation/vendor/PROVENANCE.json`.
- Authored 36 paired English/Brazilian Portuguese pages, including installation, quickstart, feature/UI walkthroughs, advanced use, all 36 MCP tool contracts, settings, architecture, Knowledge, releases, FAQ, recovery, contribution and historical release summaries.
- Preserved 29 existing HTML URLs and their recorded heading fragments. Preserved 31 original documents/configuration/skill resources in `legacy/`; their content was compared with the original Git checkout, allowing platform newline normalization. Historical material remains labeled as historical.
- Added seven application screenshots with bilingual captions/alt text. The new Knowledge screenshot uses the production webview with isolated fixture records, clearly labeled; no real project approval was performed.
- Generated 102 HTML pages (72 localized pages, 29 compatibility pages and the language-selection index), Markdown, bilingual/per-locale LLM exports, source/API metadata and local search. The final managed manifest covers 251 files.
- Updated README discovery links, managed English repository guides, preview/build commands, CI, release verification, consumer resources and local VSIX/checksum. Repository Markdown links/images and explicit section IDs were adjusted for their repository paths.
- Removed unused VitePress/Mermaid dependencies. Added deterministic LF text handling for source fingerprints across Windows/CI, preserving archived/vendor bytes. A clean LF checkout simulation validates with the same source fingerprint.

The scope is documentation pages and tooling. The application implementation's approximately 1,150 callable declarations were not rewritten with bilingual comments. Ownership for the skill's symbol audit is the documentation builder (one file, 12 documented symbols); 129 supporting files supply hash-bound product/source/test evidence. The MCP guide separately preserves exact product tool schema excerpts. Symbol counts do not claim an all-function application audit.

Source baseline before this rewrite: `295e455fb4c085d798a5d56b5a8388df7cbc9142`.

Final reviewed source fingerprint: `c13e596c60c74e49a7586d137b8b86f43e9b610e7600204a90ab1e4ffa671567`.

Final build input fingerprint: `b977f819c04a04981d0c7dc4237252e7be20a9b3788fe5b8cbd939ef0f3b20c3`.

## Validation

- `npm run check`: passed canonical skill drift, TypeScript, production build, **105 backend tests** and **36 UI tests**. This ran before the final text-only LF normalization; application source has no content diff. The final documentation/browser/package checks below ran afterward.
- `npm run docs:check`: passed corpus validation, managed build, all local HTML page/asset/anchor checks, and **four documentation browser test results** (parent plus three cases).
- Browser review: desktop and 360-pixel mobile; both locales; local search; language switching; legacy anchors; images; 36 API contracts; `/Contextory/` subpath; menu/Escape/focus; no-JavaScript navigation; no horizontal overflow or browser errors. A mobile tool-heading overflow was found and corrected through content titles without changing the default CSS.
- Final advertised `docs_map`: one complete result page, no errors, 129 supporting files and the fingerprint above. `docs_migrate` inspected schema 1 without transformation; no unknown schema was overwritten.
- Consumer bundle: 15 resources including license and referenced screenshot assets. Codex, Claude and Bob were each installed into separate disposable workspaces beneath `.contextory-local/`; dry-run made no writes, repeated install was idempotent, copied MCP queries returned English/Portuguese content, foreign workspace/mutation calls were rejected, and the skill-creator validator accepted each generated routing skill. No actual client configuration was installed or changed outside those fixtures.
- `npm run package:vsix`: passed. ZIP inspection verified all bundle hashes and confirmed exclusion of native configuration, source/test/cache files and `.remember` session/log data. The existing `.remember` directory was preserved.
- Final VSIX: `artifacts/contextory-workspace-0.7.0.vsix`, SHA-256 `e494fc831233b2e28a953bebb13be84726341a7b2fe711c1d7ed59745018789d`. This local documentation refresh is not the previously published release asset.
- Final managed build/hash verification, private local path scan, clean-checkout fingerprint simulation and `git diff --check`: passed.

Screenshots of the new documentation: `artifacts/documentation-home.png`, `artifacts/documentation-mobile.png`, and `artifacts/documentation-architecture.png`.

## Contextory tracking and catalog coverage

Two read-only `contextory_workspace_get` probes returned `SERVICE_UNAVAILABLE: Open Contextory in the connected workspace and retry.` Native source inspection and the advertised documentation tools were used instead. Existing tracked requests/decisions/catalog/export data could not be recovered. No request/spec/session/lease IDs, independent Contextory evidence, catalog approval or completed tracked state were fabricated.

Catalog maintenance remains pending service availability. The concrete documentation responsibilities to account for are the bilingual corpus, URL/anchor maps, source-backed builder, unchanged vendor runtime/provenance, repository Markdown export, consumer bundle, CI and browser tests. The new documentation UI uses the default header, navigation, locale control, search, content and page outline: menu activation exposes navigation on mobile, Escape closes it and returns focus, locale switching keeps the page ID, search stays local to the selected locale, and no-JavaScript navigation remains visible. Existing application behavior and established definitions were preserved; no human Knowledge review is claimed.

## Delivery limits

The rewritten source is committed and pushed on main, and the documentation site is deployed from gh-pages. The deployment evidence below records the source commit, Pages commit and verified live artifact. No extension release, Git tag or installation into a running editor is authorized by this deployment request. Authenticated native-agent chats and fresh editor-host qualification were not rerun for this documentation-only change. Static-analysis and platform limits remain explicit in the guides.

Preview: `npm run docs:preview` → `http://127.0.0.1:4173/en/overview.html`.

PT-BR: A documentação foi reescrita em dois idiomas com o layout Carbon padrão, preservando URLs e documentos anteriores. Validação, testes de navegador, integração portátil e pacote local passaram. O serviço conectado do Contextory permaneceu indisponível; rastreamento, catálogo e conclusão de specs não foram inventados. O usuário autorizou depois o commit, push e implantação da documentação; publicação de release da extensão e instalação em editor ativo continuam fora do escopo. A auditoria de comentários de todas as funções internas da aplicação permanece fora deste escopo de páginas e ferramentas de documentação.

## Authorized deployment

Target: `origin`, `github.com/igormicadei/Contextory`, source branch `main`, existing orphan publication branch `gh-pages:/` and site `https://igormicadei.github.io/Contextory/`.

The repository's recent Documentation Actions runs could not start: GitHub reported, "The job was not started because your account is locked due to a billing issue." Local validation and the existing branch-based Pages build were used while preserving the independent publication history and custom-domain settings. This does not change billing, credentials or repository protection rules.

The stock publisher refused the older pre-skill Pages root as foreign history without pushing. The explicit migration verifies the existing independent root 4087fdd5b6fd9dc44d3ffc8963dd37627e01b8ff, previous tip 5cc70e9c6b73c0b7998aa75249484f153d1ecac8, original Contextory site manifest and absence of unrelated files, then appends a normal fast-forward publication commit. No force push, history replacement or source-index mutation is used by publication.

## Deployment result

- Source commit a7f2d02d4483dad662b18faaaafb7493c874332d is on origin/main.
- Pages commit 48f2a018d2bd539cb4bbdf86e7a57a560ff9730a is on origin/gh-pages as a normal fast-forward. Its parent is the prior tip 5cc70e9c6b73c0b7998aa75249484f153d1ecac8; the existing root 4087fdd5b6fd9dc44d3ffc8963dd37627e01b8ff remains intact.
- GitHub Pages legacy build 1390854608 completed with status built for that exact Pages commit. The Pages status tool reports deployed and verified the live artifact manifest (SHA-256 6b56232b0fd2acd7980b24236d908c1af54c5abbaa5e5523267a2b9c48efa6ad).
- Public smoke checks returned HTTP 200 for the site root, English and Brazilian Portuguese overview pages, the preserved /docs/USER-GUIDE.html URL, the local search index, Portuguese LLM export and site JavaScript.
- GitHub Actions remained unavailable because GitHub rejected job startup for an account billing issue. The site was deployed through the existing branch-based Pages build, without relying on an Actions job.
