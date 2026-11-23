# Release v0.8.0

## Console de trabalho e conexões confiáveis

Work e Requests concentram a interface na especificação atual e em um plano por vez. Tools abre a exploração do projeto sob demanda. A mesma view se adapta à barra lateral vertical e ao painel horizontal, preservando seleção, rascunhos e rolagem.

O progresso mostra evidências por critério, verificações em execução, bloqueios e trabalho recente em vez de estimar tempo. Alertas persistentes, badge e notificações deduplicadas destacam Knowledge aguardando revisão humana.

A recuperação detecta falhas de heartbeat e fluxos encerrados, reconecta com espera limitada e distingue limites de requisição. A inicialização independe de abrir a view. Até 256 receitas são aceitas; configurações inválidas preservam conexão e receitas válidas.

Reparos de hooks seguem a política de recarga configurada e a confiança permanece no cliente nativo. Snapshots processam arquivos completos em blocos de 1 MiB, inclusive acima de 20 MiB, e recusam mudanças durante a leitura.

[Instalar 0.8.0](install.md)

[Baixar VSIX e checksum](https://github.com/igormicadei/Contextory/releases/tag/v0.8.0)

## Qualificação e limites

A implementação passou em 115 testes de backend/core/integração/análise e 43 testes de navegador. Perfis isolados do VS Code 1.147.0 verificam ativação automática com Explorer visível, runtime reparado e inicialização pausada. O teste não chama extension.activate(). Um teste do pacote também verificou 33 receitas, preservação após configuração inválida e recuperação de serviço. Assets finais e Pages são conferidos separadamente na publicação.

Aprovação nativa de hooks e dispensa de notificações permanecem verificações humanas. Reuso de metadados de referências e documentação integrada permanecem no backlog; o estudo de viabilidade não implementa essas integrações.

## Fontes

- src/extension.ts
- src/service/reconnect.ts
- src/webview/progress.ts
- src/verification/workspace.ts
- tests/ui/console.spec.ts
- tests/integration/recipe-configuration.test.ts
- scripts/verify-background-startup.mjs

