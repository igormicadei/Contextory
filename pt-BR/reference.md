# Configurações, comandos e armazenamento

## Configurações do workspace

| Configuração | Padrão | Comportamento |
| --- | --- | --- |
| contextory.autoConnect | true | Prepara conexões detectadas; pausar preserva conexões existentes |
| contextory.startupAgent | auto | auto, last-used, codex, claude, bob ou none |
| contextory.restartAfterSetup | prompt | prompt, automatic ou never após mudanças de MCP/hooks/runtime |
| contextory.nodeExecutable | node | Executável Node.js 24+ com escopo de máquina |
| contextory.pythonExecutable | python | Executável Python 3.10+ com escopo de máquina para análise |
| contextory.flowDepth | 5 | Profundidade de chamadas, 0–12 |
| contextory.checks | [] | Receitas nomeadas com executável/lista de argumentos para verificações independentes |

## Comandos do editor

Use a Command Palette para configurar/recuperar conexões, explorar arquitetura/fluxo, indexar, preparar busca semântica, exportar relatórios e MCP genérico. IDs/títulos exatos e valores padrão são declarados em package.json; confira-os ao adaptar automações para versões novas.

[Configurar conexões e verificações](quickstart.md)

[Assinaturas de ferramentas e schemas de entrada](api.md)

## Armazenamento e backups

Registros, revisões, eventos de auditoria, artefatos e credenciais do serviço ficam no armazenamento global do editor para contextory-local.contextory-workspace, separados pelo caminho canônico do projeto. O local exato depende do editor/perfil. Mover um projeto altera sua identidade nesta prévia. Configurações de agentes e skills portáteis ficam no workspace.

O modo independente usa <root>/.contextory-local/service por padrão, salvo --storage ou --descriptor de editor ativo correspondente. Esse armazenamento é autoritativo, não apenas cache descartável. Faça backup ao usar o modo independente.

1. Feche os clientes do projeto e aguarde o serviço parar após aproximadamente 65 segundos de tolerância.
2. Copie o armazenamento do projeto gerenciado pelo editor ou o diretório de serviço independente para obter um backup consistente.
3. Mantenha credenciais dos agentes separadamente. Não edite SQLite ou descritores para contornar o fluxo ou os controles de revisão.

## Interprete a cobertura desta documentação

O corpus bilíngue origina páginas humanas, Markdown e exportações LLM. Suas raízes de propriedade abrangem scripts do gerador; fontes e testes do Contextory são evidências de apoio com hashes. Docstrings de funções/classes da aplicação não foram reescritas. Assim, o apêndice de símbolos documenta o gerador, enquanto a página de API MCP documenta os contratos públicos do produto.

A recuperação de workspace/catálogo/exportação do Contextory estava indisponível durante esta reescrita: SERVICE_UNAVAILABLE — Open Contextory in the connected workspace and retry. Foi usada inspeção do código atual. Não se afirma conclusão de spec rastreada nem aprovação humana do catálogo. Consulte o registro de revisão para verificações e limites exatos.

## Fontes

- package.json
- src/providers/clients.ts
- src/cli.ts
- src/storage/ledger.ts
- scripts/documentation/build.py
- src/agents/instructions.ts
- src/analysis/engine.ts
- src/analysis/manager.ts
- src/analysis/python-flow.py
- src/analysis/python.ts
- src/analysis/worker.ts
- src/cli.ts
- src/codebase/config.ts
- src/codebase/extract.ts
- src/codebase/import.ts
- src/codebase/index.ts
- src/codebase/model.ts
- src/codebase/python-index.py
- src/codebase/queries.ts
- src/codebase/references.ts
- src/codebase/watch.ts
- src/codebase/worker.ts
- src/contracts/model.ts
- src/contracts/tools.ts
- src/contracts/usage.ts
- src/core/history.ts
- src/core/report.ts
- src/core/usage.ts
- src/core/workflow.ts
- src/editor/calls.ts
- src/extension.ts
- src/hooks/launcher.ts
- src/hooks/observation.ts
- src/knowledge/catalog.ts
- src/knowledge/export.ts
- src/knowledge/search.ts
- src/mcp/proxy.ts
- src/mcp/readiness.ts
- src/mcp/tool-definitions.d.ts
- src/providers/clients.ts
- src/providers/recovery.ts
- src/providers/registration.ts
- src/providers/reload.ts
- src/providers/skill-content.ts
- src/providers/startup.ts
- src/releases/config.ts
- src/releases/git.ts
- src/releases/manager.ts
- src/releases/watch.ts
- src/service/application.ts
- src/service/client.ts
- src/service/main.ts
- src/service/rpc.ts
- src/service/server.ts
- src/service/workspace.ts
- src/storage/atomic.ts
- src/storage/ledger.ts
- src/verification/checks.ts
- src/verification/workspace.ts
- src/webview/architecture.ts
- src/webview/assets.d.ts
- src/webview/catalog.ts
- src/webview/document.ts
- src/webview/explorer.ts
- src/webview/flow.ts
- src/webview/html.ts
- src/webview/main.ts
- src/webview/relationships.ts
- src/webview/versions.ts
- artifacts/architecture-dark.png
- artifacts/architecture-explorer.png
- artifacts/architecture-light-320.png
- artifacts/code-map-explorer.png
- artifacts/companion-sidebar.png
- artifacts/contextory-brand.png
- artifacts/relationships.png
- artifacts/request-details.png
- artifacts/request-history.png
- artifacts/source-flow.png
- artifacts/themes.png
- media/contextory-icon.png
- media/contextory-icon.svg
- media/contextory.svg
- .documentation/redirects.json
- .documentation/aliases.json
- .documentation/markdown-targets.json
- .documentation/tool-contracts.json
- .documentation/legacy-assets.json
- scripts/docs.mjs
- scripts/licenses.mjs
- scripts/verify-release.mjs
- scripts/documentation/vendor/PROVENANCE.json

