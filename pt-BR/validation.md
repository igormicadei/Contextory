# Validação e limites das evidências

## Associe cada verificação à sua afirmação

| Verificação | Comprova |
| --- | --- |
| npm run check | Consistência do bundle de skills, tipos, build de produção e regressões de backend/interface |
| Integração serviço/headless/registro | Contratos de ferramentas, transporte, isolamento de papéis, propriedade de configuração e cenários de trabalho rastreado |
| Smoke tests do host do editor | Ativação real do pacote, comandos, serviço, configuração e persistência em perfis isolados |
| docs:validate e docs:build | Estrutura bilíngue do corpus, hashes das fontes, imagens, exportações e links/âncoras locais |
| Revisão da documentação no navegador | Layout desktop/mobile, paridade de idiomas, navegação, busca e imagens do build revisado |

## Separe qualificação anterior desta reescrita

O registro de validação original e as notas de release ficam preservados como downloads históricos. Os resultados descrevem o código/artefatos testados na época. Eles não representam novas execuções para esta reescrita. Comandos/resultados concretos da reescrita ficam em .documentation/REVIEW.md.

As imagens existentes são capturas da aplicação com registros de exemplo. O build valida presença dos arquivos e legendas/textos alternativos bilíngues. A revisão no navegador verifica a renderização; ela não recria uma conversa autenticada com agente nativo.

## Mantenha as lacunas explícitas

A reescrita anterior registrou serviço indisponível; a entrega 0.8.0 recuperou o registro original e usa verificações rastreadas de release. Entradas do catálogo permanecem observações até revisão humana. Confiança nativa, chats autenticados, lacunas estáticas/dinâmicas, workspaces remotos e outros sistemas mantêm limites de qualificação próprios.

## Fontes

- package.json
- tests/integration/service.test.ts
- tests/integration/headless.test.ts
- tests/integration/registration.test.ts
- tests/ui/catalog.spec.ts
- artifacts/host-release-070-vscode.json
- artifacts/host-release-070-bob.json
- src/extension.ts
- src/service/reconnect.ts
- src/service/rpc.ts
- src/webview/progress.ts
- tests/ui/console.spec.ts
- tests/integration/recipe-configuration.test.ts
- scripts/verify-background-startup.mjs

