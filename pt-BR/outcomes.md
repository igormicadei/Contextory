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

## Fontes

- src/contracts/tools.ts
- src/core/workflow.ts
- src/core/report.ts
- tests/core/workflow.test.ts

