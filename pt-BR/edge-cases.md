# Limites e compatibilidade

## Ambientes suportados e não qualificados

A prévia qualificada usa Windows, pastas locais confiáveis, Node.js 24+, VS Code 1.96+ ou IBM Bob e no máximo 16 projetos não aninhados. Workspaces remotos/virtuais, outros sistemas, escala arbitrária de monorepos e conversas autenticadas completas em todos os agentes nativos não estão qualificados.

## Limites de análise de código e fluxo

O fluxo interativo padrão usa cinco saltos de chamada, 150 nós, 300 arestas e dois segundos. A varredura de fluxo Python limita-se a 500 arquivos, 512 KiB por arquivo e 12 MiB no total. Fronteiras, ciclos, destinos não resolvidos e limites de tamanho/tempo continuam visíveis. Expanda ou trace novamente para continuar.

A extração TypeScript e Python é estática. Despacho dinâmico, código gerado, dependências externas e comportamento de frameworks em execução podem não ser resolvidos. Outras linguagens de fluxo dependem da hierarquia de chamadas disponível no editor e não recebem extração automática de desvios. Resultados do grafo salvo e sobreposições de buffers não salvos têm regras de atualização diferentes.

## Recuperação, revisões e concorrência

Um lease de implementação ativo pertence a cada especificação. Releia o registro após conflito de revisão; não repita uma entrada alterada com o ID antigo. Reutilize operação/entrada exatas apenas após resultado incerto. A criação entre projetos pode ser recuperada e ter sucesso parcial; não é uma transação atômica.

Uma fonte indisponível, importação Graphify obsoleta, verificação independente ausente, proposta Knowledge pendente ou problema bloqueante não resolvido permanece como limite ou impedimento explícito. As permissões nativas continuam válidas.

## Fontes

- src/codebase/config.ts
- src/codebase/import.ts
- src/analysis/python.ts
- src/providers/registration.ts
- src/service/workspace.ts
- tests/integration/workspace.test.ts

