# Conhecimento de projeto com governança

## Descreva o comportamento esperado da aplicação

| Categoria | Conteúdo exigido |
| --- | --- |
| Arquivo | Um arquivo de código e sua responsabilidade |
| Regra | Invariante ou condição; fontes e testes ou testGap explícito |
| Funcionalidade | Capacidade observável; fontes e testes ou testGap explícito |
| Interface | Localização, elemento, gatilho, comportamento e estados; fontes e testes ou testGap |

Leia contextory_catalog_get antes de alterações relacionadas e pagine definições, propostas e inventário de forma independente. Entradas geradas começam como observações. Um grafo descreve relações possíveis; ele não aprova regras nem infere o comportamento esperado da interface.

## Revise itens pendentes em Approvals

Um alerta persistente conta definições observadas e alterações pendentes. A view do editor também mostra um badge e oferece Review now quando mudam as revisões pendentes. Notificações são deduplicadas por projeto entre reinícios; dispensá-las mantém o alerta disponível.

1. Abra Approvals ao lado de Work e Requests ou use o alerta persistente. Essa aba contém apenas alterações pendentes e linhas de base observadas. Inspecione fontes, testes, estado, revisão e atualização. Use Tools > Knowledge separadamente para consultar todas as definições e a cobertura dos arquivos.
2. Revise as observações iniciais ou o conteúdo antes/depois de substituições ou aposentadorias. Informe um motivo antes de aprovar ou rejeitar.
3. Se aparecer Sources need review, abra os arquivos alterados e confira a definição. Informe um motivo e use Refresh source snapshot. Isso registra os hashes atuais e mantém o item pendente; aprove ou rejeite a revisão atualizada separadamente. Arquivos ausentes precisam ser corrigidos ou o item obsoleto rejeitado. Uma proposta contra uma revisão anterior deve ser rejeitada e substituída.

Salvamento, sucesso e erros aparecem ao lado dos controles. Revisões com falha preservam o motivo informado e não aprovam nada. Os controles ficam desativados enquanto a revisão está em andamento. Alternar para Knowledge e voltar preserva o motivo; os filtros de Knowledge não ocultam a fila de aprovações. Atualizar o snapshot não altera a definição nem concede aprovação.

![A aba Approvals com contador de pendências, alterações antes/depois e controles de revisão.](../assets/knowledge-preview.png)

Approvals renderizado pela webview de produção com exemplos isolados; nenhuma aprovação real do projeto foi realizada.

A aprovação pertence à aba Approvals autenticada para revisão humana. Agentes não podem usar suas credenciais nem apresentar observações como requisitos aprovados. Propostas pendentes e definições aprovadas afetadas e obsoletas podem impedir a conclusão rastreada.

## Consulte Knowledge separadamente

1. Escolha Tools > Knowledge para consultar definições atuais e históricas, seus vínculos com fontes/testes e seu histórico.
2. Expanda Find definitions & coverage e filtre por texto, caminho ou categoria. O inventário de arquivos continua disponível nesse navegador.
3. Escolha Approvals para revisar pendências. Os filtros e a paginação de Knowledge não afetam essa fila; itens revisados saem de Approvals e continuam disponíveis em Knowledge.

![Consulta ao conhecimento do projeto sem formulários de aprovação.](../assets/knowledge-browser.png)

Navegador Knowledge usando a interface de produção e registros isolados de teste.

## Crie a linha de base de um projeto existente

Use a skill portátil contextory-migrate dentro de um pedido de implementação autorizado. contextory_catalog_migrate captura um manifesto limitado e retoma por migrationId/cursor. Repetir a mesma operação/entrada retorna o resultado armazenado. state=scanned indica o fim da varredura; não significa revisão semântica ou aprovação concluída.

Inspecione candidatos contra código atual, chamadores, testes e decisões históricas. Preserve contradições, testes ausentes e observações de runtime indisponíveis como lacunas explícitas. Reconcilie arquivos adicionados depois do manifesto capturado.

## Exporte os conjuntos de documentação armazenados

Descobrir e paginar exportações do projeto

```json
{ "section": "overview", "offset": 0, "limit": 20 }
```

Chame contextory_project_export com o projectId escolhido. Pagine records, revisions, history, relationships, code_files, code_nodes, code_edges, code_imports, jobs, usage e artifacts até nextOffset=null. Preserve sequência/snapshot, estado atual versus histórico, proveniência e atualização das fontes. Artefatos usam unidades de 400 caracteres; os outros conjuntos paginam linhas.

A exportação exclui credenciais, conversas nativas e vetores numéricos de embeddings. Respostas grandes podem retornar identificadores de artefatos para paginação adicional. Uma exportação somente leitura não precisa de pedido de implementação.

## Fontes

- src/knowledge/catalog.ts
- src/knowledge/catalog.ts
- src/knowledge/export.ts
- src/webview/catalog.ts
- tests/integration/catalog.test.ts
- src/extension.ts
- src/service/reconnect.ts
- src/service/rpc.ts
- src/webview/progress.ts
- tests/ui/console.spec.ts
- tests/integration/recipe-configuration.test.ts
- scripts/verify-background-startup.mjs
- tests/ui/catalog.spec.ts
- src/webview/main.ts

