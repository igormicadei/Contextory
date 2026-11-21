# Conhecimento de projeto com governança

## Descreva o comportamento esperado da aplicação

| Categoria | Conteúdo exigido |
| --- | --- |
| Arquivo | Um arquivo de código e sua responsabilidade |
| Regra | Invariante ou condição; fontes e testes ou testGap explícito |
| Funcionalidade | Capacidade observável; fontes e testes ou testGap explícito |
| Interface | Localização, elemento, gatilho, comportamento e estados; fontes e testes ou testGap |

Leia contextory_catalog_get antes de alterações relacionadas e pagine definições, propostas e inventário de forma independente. Entradas geradas começam como observações. Um grafo descreve relações possíveis; ele não aprova regras nem infere o comportamento esperado da interface.

## Revise uma revisão exata da definição

1. Abra Knowledge, escolha uma definição e inspecione fontes, testes, estado, revisão e atualização.
2. Revise as observações iniciais ou o conteúdo antes/depois de substituições ou aposentadorias. Informe um motivo antes de aprovar ou rejeitar.
3. Atualize candidatos obsoletos antes da aprovação. Propostas concorrentes devem corresponder à revisão atual exata. Rejeições mantêm a definição original e todas as revisões são preservadas.

![Definições Knowledge e proposta de revisão antes/depois com registros de pagamento de exemplo.](../assets/knowledge-preview.png)

Webview Knowledge de produção com registros isolados de teste; nenhuma aprovação de projeto foi realizada.

A aprovação pertence à interface Knowledge autenticada para revisão humana. Agentes não devem usar credenciais da interface nem apresentar observações geradas como requisitos aprovados. Propostas pendentes e definições aprovadas afetadas e obsoletas podem impedir a conclusão rastreada.

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

