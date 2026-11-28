# Release v0.11.0

## Decida a partir de uma explicação clara

Cartões de aprovação pedem que o agente explique o que muda, por que a aprovação é necessária e como o comportamento da aplicação muda. Aprovar ou Rejeitar dispensa comentário. Solicitar ajustes aceita instruções, mantém a implementação bloqueada e permite atualizar a mesma proposta antes de outra decisão. Definições antes/depois, autores, hashes e justificativas permanecem indexados.

Snapshots de fontes legíveis são atualizados automaticamente, sem comentário do usuário nem aprovação implícita. Referências ausentes, edições concorrentes e alvos alterados continuam protegidos. A revisão opcional começa recolhida e pode ser aberta com clique ou teclado; o estado escolhido sobrevive à atualização e navegação. Decisões pendentes continuam visíveis.

## Mantenha a conversa de origem

Projeto, provedor e sessão nativa exata são mantidos no trabalho e nas propostas vinculadas. Respostas duráveis de aprovação/rejeição/feedback retornam apenas à mesma sessão por hooks confiáveis. Um hook em espera pode retornar a resposta dentro de quatro minutos; expiração ou falha do serviço nunca concede aprovação. Estados de fila/envio/sem vínculo distinguem transporte de execução pelo modelo.

Reabrir conversa usa o comando de sessão do Claude instalado. Codex retoma a conversa salva exata em um terminal interativo e requer sua CLI. Bob/clientes genéricos ou adaptadores indisponíveis copiam o ID para recuperação no histórico nativo. Um cliente parado ou sem confiança pode exigir retomada manual; identidades históricas desconhecidas nunca são adivinhadas. Permissões, autenticação e disponibilidade do histórico continuam no cliente nativo.

## Instale e verifique

Baixe contextory-workspace-0.11.0.vsix e o .sha256 correspondente, compare o SHA-256 e use Extensions > Install from VSIX. Recarregue o editor e as integrações nativas quando solicitado para descobrir os contratos e hooks de espera atualizados. Revise a confiança dos hooks no cliente nativo. Inglês e português brasileiro seguem o idioma do VS Code, incluindo instruções para novas entradas da interface escritas pelo agente.

[Baixar a release 0.11.0](https://github.com/igormicadei/Contextory/releases/tag/v0.11.0)

A qualificação cobre aprovação e histórico das fontes, respostas reais de hooks em espera, limites de serviço/headless/registro, interface inglês/português, recolhimento por teclado, documentação bilíngue, consistência de skills e checksums. Workspaces locais confiáveis no Windows com Node.js 24+ continuam o ambiente qualificado. Conversas autenticadas com modelos mantêm os limites dos clientes nativos.

## Fontes

- package.json
- src/contracts/model.ts
- src/knowledge/catalog.ts
- src/core/conversations.ts
- src/hooks/review-wait.ts
- src/providers/conversations.ts
- src/webview/catalog.ts
- src/webview/main.ts
- tests/ui/catalog.spec.ts
- tests/integration/approval-conversations.test.ts

