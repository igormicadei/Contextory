---
name: integrar-documentacao
description: "Orientar a publicação da documentação no GitHub Pages e a distribuição de skills, agentes e MCP de consulta para projetos consumidores de bibliotecas e plugins."
---

# Site and consumer integrations / Integrações do site e do consumidor

EN: Use this internal guide from the [documentation workflow](../../skills/documentar-software/SKILL.md). Discover the actual tool schemas and only call advertised operations. Every generator/deployment call selects the authorized absolute source workspace; consumer installation additionally selects the explicit target workspace. Examples such as `C:/Projetos/Taskwright` do not authorize editing that project.

PT-BR: Use este guia pelo [fluxo de documentação](../../skills/documentar-software/SKILL.md). Descubra os schemas reais e execute apenas operações anunciadas. Cada chamada de geração/publicação seleciona o workspace de origem absoluto autorizado; a instalação no consumidor também seleciona seu destino explícito. Exemplos como `C:/Projetos/Taskwright` não autorizam alterações nesse projeto.

## Library/plugin consumers / Consumidores de bibliotecas/plugins

EN: `carbon-design` is a required installed companion for this role, including projects that publish library/plugin documentation. Load its installed visual guide before creating or migrating the website. The default HTML template is Carbon-based and carries no remote font/runtime dependency; the consumer bundle remains self-contained.

PT-BR: `carbon-design` é um módulo instalado obrigatório para este papel, inclusive em projetos que publicam documentação de biblioteca/plugin. Leia seu guia visual instalado antes de criar ou migrar o site. O template HTML padrão usa Carbon e não depende de fonte/runtime remoto; o bundle consumidor permanece independente.


EN: After source and content validation/build, use `docs_integrations` to generate the portable consumer bundle from verified public documentation. Distribute it with the library/plugin and document its explicit activation command for the project's package ecosystem. Installing/importing the library must not silently change agent host settings. The bundle contains project-specific bilingual use/development guidance, one public routing skill, internal role references, the corpus and a read-only documentation query MCP. Copy every required resource; installed paths must remain usable after the source project and generator checkout are unavailable.

PT-BR: Após validar e gerar fontes/conteúdo, use `docs_integrations` para criar o bundle portátil a partir da documentação pública verificada. Distribua-o com a biblioteca/plugin e documente seu comando explícito de ativação no ecossistema do pacote. Instalar/importar a biblioteca não deve alterar configurações do host de agentes implicitamente. O bundle contém guias específicos bilíngues de uso/desenvolvimento, uma skill pública de roteamento, papéis internos, corpus e MCP de consulta somente leitura. Copie todos os recursos necessários; os caminhos instalados devem funcionar sem o projeto de origem ou checkout do gerador.

EN: Install only into an explicitly selected authorized consumer workspace using the supported Codex/Claude/Bob project adapter. Inspect the generated installer CLI before invoking it. Preflight unowned skill/server/configuration collisions, preserve unrelated settings, and require transactional rollback on failure. Bind the query MCP to that consumer workspace; reject calls for another workspace, traversal and mutation tools. Test discovery and real query responses from the copied installation. Keep one public entry to avoid duplicating use/develop commands in menus.

PT-BR: Instale apenas no consumidor absoluto autorizado e explicitamente escolhido, usando o adaptador de projeto Codex/Claude/Bob suportado. Inspecione a CLI do instalador gerado antes de executá-lo. Verifique conflitos com skills/servidores/configurações não gerenciados, preserve definições alheias e exija rollback transacional em caso de falha. Vincule o MCP de consulta ao workspace consumidor; recuse outro workspace, travessia de caminhos e ferramentas de mutação. Teste descoberta e respostas reais pela cópia instalada. Mantenha uma entrada pública para não duplicar comandos de uso/desenvolvimento nos menus.

EN: Guidance must explain the library's actual install/import/configure/use/extend/test contracts with source/API links and limits. Add a specialized application-control MCP only when supported by verified public interfaces and the authorized target task; document its schemas and side effects separately. A read-only documentation MCP does not establish an application mutation API, and package installation does not authorize controlling the application.

PT-BR: Os guias devem explicar contratos reais de instalação/importação/configuração/uso/extensão/testes com links de fontes/API e limites. Acrescente MCP de controle da aplicação apenas quando houver interfaces públicas verificadas e autorização na tarefa de destino; documente schemas e efeitos separadamente. Um MCP de documentação somente leitura não comprova API de mutação da aplicação, e instalar o pacote não autoriza controlá-la.

## GitHub Pages / GitHub Pages

EN: Build and validate first. Call `docs_pages_plan` to inspect remotes and current artifact state without mutation. With no GitHub repository, ask the user to configure/add the intended remote. Normalize SSH/HTTPS identities; several aliases of the same repository are not multiple choices. With multiple distinct repositories, request an explicit choice before publication. Do not assume `origin` is intended. Support the selected GitHub.com/Enterprise host through its actual API/CLI and retain concrete authentication or Pages availability errors.

PT-BR: Gere e valide primeiro. Use `docs_pages_plan` para examinar remotos e artefatos sem mutação. Sem repositório GitHub, peça configuração/adição do remoto pretendido. Normalize identidades SSH/HTTPS; aliases do mesmo repositório não são escolhas distintas. Com repositórios distintos, peça a escolha antes de publicar. Não suponha que `origin` seja o destino. Use a API/CLI real do host GitHub.com/Enterprise selecionado e preserve erros concretos de autenticação ou disponibilidade do Pages.

EN: With publication authorized, call `docs_pages_publish` for the concrete validated artifact. Use the orphan `gh-pages` branch with root source, `.nojekyll` and subpath-safe assets. The initial commit must have no parents; subsequent updates must be fast-forward on verified orphan history. Never force-push, replace a foreign/non-orphan branch, reset/switch the user's worktree, or alter their index. Detect concurrent changes and stale source/content/output hashes. Preserve custom-domain configuration. Configure Pages for `gh-pages:/` through the chosen repository API; a branch push alone does not configure Pages.

PT-BR: Com publicação autorizada, use `docs_pages_publish` no artefato concreto validado. Use a branch órfã `gh-pages`, origem na raiz, `.nojekyll` e assets compatíveis com subcaminhos. O primeiro commit não pode ter pais; atualizações devem ser fast-forward em histórico órfão verificado. Não force push, substitua branch alheia/não órfã, faça reset/troca do worktree do usuário ou altere seu index. Detecte concorrência e hashes obsoletos de fontes/conteúdo/saída. Preserve configuração de domínio próprio. Configure Pages para `gh-pages:/` pela API escolhida; push da branch não configura Pages sozinho.

EN: Use `docs_pages_status` to verify repository source, build result and live URL/artifact identity. Distinguish prepared, pushed, configured, building, deployed and failed states. Retry status within a bounded time and preserve a resumable status action for asynchronous builds; do not report deployment success on an HTTP response from an older artifact. Refresh bilingual README human links and its single `/llms.txt` agent entrypoint with the verified site address. Generated HTML advertises that entrypoint in metadata and has no visible LLM link.

PT-BR: Use `docs_pages_status` para verificar origem, resultado do build e identidade da URL/artefato publicado. Distinga estados preparado, enviado, configurado, em build, publicado e falhou. Consulte o status por tempo limitado e preserve uma ação retomável para builds assúncronos; resposta HTTP de versão anterior não comprova implantação. Atualize links humanos bilíngues do README e sua única entrada para agentes `/llms.txt` com o endereço confirmado. O HTML gerado anuncia essa entrada em metadados e não mostra link LLM.

## Carbon review before delivery / Revisão Carbon antes da entrega

EN: Before packaging or publishing, inspect the generated shell against the public Carbon layout review contract. Confirm token-based surfaces, the white reading canvas and `g100` header, professional task-based navigation, local search, responsive mobile focus behavior, the localized table overflow hint and the absence of visible LLM links. Include the 1440px/390px/320px screenshots and interaction results in the delivery evidence.

PT-BR: Antes de empacotar ou publicar, compare o shell gerado com o contrato público de revisão de layout Carbon. Confirme superfícies baseadas em tokens, canvas branco de leitura e cabeçalho `g100`, navegação profissional por tarefa, busca local, comportamento responsivo de foco no celular, aviso localizado para tabelas largas e ausência de links LLM visíveis. Inclua capturas de 1440px/390px/320px e resultados de interação nas evidências da entrega.