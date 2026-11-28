# Release v0.10.0

## Aprovação seletiva com espera obrigatória

Agentes podem autoaprovar manutenção compatível e conflitos de implementação com classificação de impacto, motivo, validação e registro de auditoria explícitos. Conflitos que afetam regras de processo ou resultados, conflitos incertos e desativações exigem revisão humana antes da implementação. Hooks nativos PreToolUse/Stop e a barreira do serviço mantêm o agente aguardando a decisão; silêncio ou tempo decorrido nunca concedem aprovação.

Definições preservam revisões antes/depois, hashes de fontes, autores, justificativas, decisões relacionadas, especificações e evidências de verificação. Use catálogo e histórico para investigar uma funcionalidade que parou de funcionar e relacionar uma regressão confirmada à mudança responsável. Observações geradas têm revisão opcional e não se tornam requisitos aprovados por uma pessoa.

## Seguir o idioma do VS Code

Controles e contribuições da extensão usam o idioma de exibição do VS Code: inglês ou português brasileiro, com fallback para inglês nos demais idiomas. O editor propaga uiLanguage e uma instrução de idioma para o contexto do projeto e hooks. Agentes devem escrever novas entradas da interface nesse idioma, preservando identificadores exatos, código e texto histórico. A documentação mantém os dois idiomas.

## Pacote local e qualificação

Gere com npm ci e npm run package:vsix. A saída é artifacts/contextory-workspace-0.10.0.vsix e seu .sha256 correspondente. Compare o checksum antes de instalar por Extensions > Install from VSIX e recarregue o editor/integrações nativas quando solicitado. Esta entrega gera o pacote local e envia commits de código; publicar assets de release no GitHub e instalar no editor ativo são ações separadas.

A validação cobre classificação e bloqueio de aprovações, histórico ligado às fontes, transporte do idioma, cobertura de traduções/substituições, interface inglês/português, consistência de skills e documentação bilíngue. Workspaces locais confiáveis no Windows com Node.js 24+ continuam o ambiente qualificado. Notas históricas e checksums publicados são preservados.

## Fontes

- package.json
- src/contracts/model.ts
- src/knowledge/catalog.ts
- src/hooks/approval.ts
- src/core/history.ts
- src/i18n/index.ts
- src/agents/instructions.ts
- tests/integration/approval-policy.test.ts
- tests/integration/i18n.test.ts
- tests/ui/i18n.spec.ts

