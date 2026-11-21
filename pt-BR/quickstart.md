# Sua primeira alteração rastreada

## Conecte o agente nativo

1. Abra o projeto confiável. O Contextory prepara todos os agentes nativos compatíveis detectados quando Auto-connect está ativo.
2. Para configuração manual, clique no controle do agente no rodapé ou execute Contextory: Connect Native Codex, Contextory: Connect Native Claude Code ou Contextory: Connect Native IBM Bob.
3. Revise a configuração gerada no workspace e aprove MCP/hooks pelo cliente nativo. Recarregue ou reabra a sessão quando solicitado.
4. Peça ao agente para chamar contextory_workspace_get e contextory_context_get. Um indicador verde no rodapé registra tráfego MCP observado no serviço atual.

![Barra lateral do Contextory com progresso dos pedidos e controles dos agentes nativos.](../assets/companion-sidebar.png)

Barra lateral capturada da aplicação; os registros são exemplos.

> Uma conexão configurada ou reinicialização do Extension Host não concede confiança aos hooks nativos. O indicador informa tráfego, não autenticação do agente nem execução bem-sucedida de todos os hooks.

## Configure uma verificação útil

Abra Preferences: Open Workspace Settings (JSON). Adicione uma receita para um comando já existente no projeto. O exemplo serve para projetos que usam o executor de testes do Node; adapte executável, argumentos e tempo limite ao seu projeto.

Receita de verificação do workspace

```json
{
  "contextory.checks": [{
    "id": "unit", "name": "Unit tests",
    "executable": "node", "args": ["--test"], "timeoutMs": 120000
  }]
}
```

As receitas executam código confiável do workspace com executável e lista de argumentos. As chamadas MCP selecionam a receita pelo ID e não fornecem comandos de shell arbitrários.

## Implemente e conclua uma especificação

Exemplo de pedido no chat nativo

```text
Use o Contextory para rastrear esta alteração: adicionar tentativas de recuperação ao checkout. Recupere decisões anteriores, crie marcos e especificações com critérios de aceite, inspecione o código afetado, registre problemas e decisões, execute nossas verificações configuradas e conclua explicitamente cada especificação verificada.
```

1. Revise o pedido e os critérios de aceite em Requests. O agente associa a sessão e obtém um lease da especificação antes de registrar a implementação.
2. Inspecione alterações, problemas, decisões e resultados de verificações na especificação selecionada.
3. O agente envia um resultado com evidências para cada critério e chama contextory_spec_change com action=complete e a revisão retornada.
4. Confirme o estado completed. Apenas enviar o resultado deixa o trabalho aberto. Exporte o relatório do pedido para revisar o registro persistente.

![Lista de pedidos ao lado da especificação selecionada.](../assets/panel-requests.png)

Pedidos no Panel horizontal do editor.

[Resolver uma especificação aberta ou enviada](troubleshooting.md)

## Fontes

- src/core/workflow.ts
- src/providers/registration.ts
- src/agents/instructions.ts
- package.json
- tests/core/workflow.test.ts

