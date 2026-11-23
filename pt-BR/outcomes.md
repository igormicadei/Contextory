# Escreva resultados de implementação úteis

## Explique o que mudou e por quê

- Identifique pedido/especificação, revisão atual e intenção original. Descreva o comportamento resultante com referências de código.
- Registre problemas com impacto, resolução e por que a correção funciona. Informe explicitamente quando não houve problemas.
- Explique escolhas relevantes, alternativas e consequências. Distinga decisões do agente de requisitos humanos.
- Associe cada critério atual exatamente uma vez às evidências atuais. Preserve comando/resultado real do job, origem, itens ignorados e limites.
- Inclua catalog.recordIds e catalog.explanation quando houver catálogo. Explique definições atualizadas ou comportamento inalterado.

## Envie e conclua explicitamente

1. Termine as edições de código/configuração antes das verificações independentes finais. Alterações posteriores podem invalidar evidências.
2. Envie contextory_outcome_submit com revisão atual, associações de evidências, relatório/changelog e limites.
3. Use contextory_spec_change action=complete com a revisão retornada e um novo operationId. Confirme state=completed e exporte o relatório do pedido.

![Lista de pedidos ao lado da especificação selecionada.](../assets/panel-requests.png)

Pedidos no Panel horizontal do editor.

O snapshot assina o conteúdo completo dos arquivos do manifesto, usando leitura em blocos de 1 MiB. Arquivos maiores que 20 MiB continuam incluídos; não é necessário remover fixtures para executar checks. Se tamanho, datas de modificação/metadados, identidade ou tipo de um arquivo mudar durante a leitura, a captura é recusada com STALE_SOURCE. A comparação de snapshots antes e depois do comando e a exigência de evidência independente continuam ativas.

## Fontes

- src/contracts/tools.ts
- src/core/workflow.ts
- src/core/report.ts
- tests/core/workflow.test.ts
- src/verification/workspace.ts

