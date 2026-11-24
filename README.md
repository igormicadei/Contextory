# Contextory

Contextory connects requests, specifications, source code, decisions and verification evidence in a local project ledger. Keep working in native **Codex**, **Claude Code** or **IBM Bob** chat while the extension preserves the project context needed for the next session.

**Current version: 0.10.0.** This preview is qualified on Windows with trusted local project folders in VS Code and IBM Bob. The project is **UNLICENSED**.

## Install and start

1. Install **Node.js 24+** and VS Code **1.96+** or IBM Bob. Install and authenticate your preferred native agent separately.
2. Build the 0.10.0 checkout with `npm ci` and `npm run package:vsix` (or obtain the package from your build provider), verify `artifacts/contextory-workspace-0.10.0.vsix` against its `.sha256` and choose **Extensions > Install from VSIX…**.
3. Open a trusted local project and select **Contextory** in the activity bar. Automatic setup prepares detected supported agents; review MCP/hooks through the native client's own trust controls.
4. Configure a meaningful project check recipe, then ask your agent to track an authorized change with acceptance criteria, decisions and test evidence.

Python **3.10+** is needed for Python source analysis and **3.11+** for on-demand documentation generation. Reading project explanations needs no Python or separately installed plugin. Lexical/source retrieval works without an embedding model download. Remote/virtual workspaces, other operating systems, arbitrary large repositories and authenticated conversations in every native agent remain outside the qualified scope.

## What you can do

| Capability                   | Result                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Track implementation         | Requests, milestones, specifications, immutable revisions and completion backed by current evidence.           |
| Recover project memory       | Findings, fixes, decisions, alternatives, reports and searchable history.                                      |
| Understand source            | Architecture, task context, impact/path queries, bounded call/branch flow and isolated reference repositories. |
| Coordinate projects          | Independent records and graphs per folder, with linked requests across explicitly selected projects.           |
| Review application knowledge | File responsibilities, rules/features, test links and UI contracts with selective approval and audited history.                          |
| Explain the project          | Source-backed bilingual documentation, stale-section review and bundled Carbon generation without extra plugins. |
| Inspect versions             | Repository-wide Git history, concrete release plans and separately authorized tag publication.                 |
| Use your preferred client    | Shared portable skills, native adapters, generic MCP and standalone CLI.                                       |

Controls follow the VS Code display language in English or Brazilian Portuguese. Agents receive instructions to write new UI-facing entries in that language. Process/outcome conflicts wait for human review; compatible maintenance and implementation conflicts may be auto-approved with an audit record.

A green agent light means MCP traffic was observed in the current service. Native clients retain conversation history, models, sign-in, editing and permissions. Static diagrams and linked tests describe possible relationships; actual checks provide execution evidence.

## Guides

- [User guide](docs/USER-GUIDE.md): daily work, multiple projects, connections and recovery.
- [Work console and recovery](docs/WORK-CONSOLE.md): the redesigned interface, review alerts, within-spec progress and automatic reconnection.
- [Code intelligence](docs/CODEBASE-INTELLIGENCE.md): source retrieval, references, freshness and limits.
- [MCP API](docs/MCP-TOOLS.md): all 39 tool contracts, revisions, retries and completion.
- [Project documentation](docs/PROJECT-DOCUMENTATION.md): explanations, source/change links and the bundled documentation/Carbon workflow.
- [Knowledge](docs/PROJECT-KNOWLEDGE.md) and [Versions](docs/PROJECT-RELEASES.md): definitions, review, releases and provenance.
- [Architecture](docs/NATIVE-AGENT-ARCHITECTURE.md), [development](docs/DEVELOPMENT.md) and [validation](docs/VALIDATION.md).
- [Release notes](docs/releases/v0.10.0.md) and [changelog](CHANGELOG.md): historical delivery records.

The rewritten website uses the documentation skill's **default Carbon layouts** with English and Brazilian Portuguese content, local search, responsive navigation, Markdown and LLM exports. Previous page URLs and heading fragments are preserved. The original English documents remain in the migration archive; current guides in `docs/` are generated from the bilingual corpus.

## Develop and preview documentation

```powershell
npm ci
npm run check
npm run docs:validate
npm run docs:build
npm run docs:preview
```

Documentation tooling requires **Python 3.11+**. Preview opens at `http://127.0.0.1:4173/en/overview.html`. Edit [.documentation/project.json](.documentation/project.json), then review the source fingerprint and rebuild. See the [documentation workflow](.documentation/README.md) for source ownership, archives, consumer guidance and validation limits.

`npm run package:vsix` refreshes the local package/checksum. Building or packaging does not publish the site, release the repository or install into a live editor. Native project records live in editor-managed storage; standalone mode defaults to `<root>/.contextory-local/service`. Back up the authoritative storage you use.

## Português brasileiro

O Contextory conecta pedidos, especificações, código, decisões e evidências em um registro local do projeto. Continue no chat nativo do **Codex**, **Claude Code** ou **IBM Bob** e recupere o contexto nas próximas sessões.

Instale **Node.js 24+**, VS Code **1.96+** ou IBM Bob e o VSIX **0.10.0**. Gere o pacote com `npm ci` e `npm run package:vsix`; confira o `.sha256` em `artifacts/` antes de instalar. Abra um projeto local confiável, revise a configuração MCP/hooks pelo cliente nativo e configure uma verificação útil do projeto. Python **3.10+** é necessário para análise Python e **3.11+** para geração de documentação sob demanda. A consulta de explicações dispensa Python e instalação de outro plugin. A prévia é qualificada no Windows; permissões e autenticação continuam no cliente nativo.

A interface segue o idioma do VS Code em inglês ou português brasileiro, e agentes devem escrever novas entradas no mesmo idioma. Conflitos de processo/resultado aguardam revisão humana; manutenção compatível e conflitos de implementação podem receber autoaprovação auditada.

A documentação foi reescrita em português e inglês com os **layouts Carbon padrão** da skill, busca local e exportações para pessoas e agentes. Edite o corpus bilíngue em `.documentation/project.json`; o gerador requer **Python 3.11+**. `npm run docs:build` gera o site e `npm run docs:preview` oferece a prévia local. URLs antigas e documentos históricos foram preservados. Gerar ou empacotar não publica nem instala a extensão.

## License

Contextory remains **UNLICENSED**. Bundled runtime dependency notices are in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). The vendored documentation generator retains its original MIT license and attribution in `scripts/documentation/vendor/LICENSE`.

<!-- software-documentation:start -->

## Documentação / Documentation

- [Português (Brasil)](https://igormicadei.github.io/Contextory/pt-BR/overview.html)
- [English](https://igormicadei.github.io/Contextory/en/overview.html)
- [Índice para agentes / Agent index](https://igormicadei.github.io/Contextory/llms.txt)
- [Texto completo / Full text](https://igormicadei.github.io/Contextory/llms-full.txt)
- [API e cobertura / API and coverage](https://igormicadei.github.io/Contextory/api.json)
<!-- software-documentation:end -->
