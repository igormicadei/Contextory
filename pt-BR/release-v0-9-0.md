# Release v0.9.0

## Revise conhecimento pendente em Approvals

Approvals é um destino principal ao lado de Work e Requests, com contador de pendências. Alertas e Review now abrem a fila diretamente. A consulta seleciona baselines observados e propostas pendentes antes da paginação; Knowledge continua um navegador independente para definições, histórico e cobertura.

Quando fontes mudarem, inspecione-as, informe um motivo e atualize o snapshot antes de aprovar a nova revisão. Atualizar mantém o item pendente. Erros locais explicam referências ausentes/conflitantes; motivos sobrevivem a navegação/falhas e envios duplicados são desabilitados. Isso não concede aprovação humana aos agentes.

## Explicações independentes e Carbon

Tools > Documentation busca explicações em inglês/português por assunto, caminho ou registro rastreado. Architecture oferece Explain this area; ações do pedido encontram documentação relacionada, incluindo vínculos nas specs descendentes. O contexto de origem recupera trechos relevantes mesmo antes de uma nova especificação ter associações explícitas.

A extensão/CLI inclui software-documentation 1.0.1, seus guias, o módulo Carbon 1.0.0 completo e fontes/tokens/modelos locais. Nenhum plugin separado é necessário. Três ferramentas Contextory fornecem leitura/guias/jobs, ações de geração/consumidor/Pages e associações observadas auditadas. Mudanças no texto, nas fontes e no conteúdo de registros marcam explicações vinculadas como desatualizadas.

A consulta funciona sem Python. A geração ocorre sob demanda com Python 3.11+ e lease atual para mutações; nunca bloqueia a inicialização do serviço. Corpora schema 1 podem ser consultados, e prévias/backups preservam conteúdo antes da geração Carbon schema 2. Publicar um projeto conectado continua uma ação explicitamente autorizada.

[Leia o fluxo de documentação](documentation.md)

## Instale e recarregue integrações

1. Baixe contextory-workspace-0.9.0.vsix e o arquivo .sha256; compare o SHA-256 antes de instalar.
2. Use Extensions > Install from VSIX e recarregue o VS Code ou IBM Bob. Reinicie integrações nativas quando solicitado para descobrir as ferramentas e skill atualizadas; a confiança permanece no cliente.
3. Abra Approvals para revisão humana pendente ou Tools > Documentation para consultar explicações. Python 3.11+ só é necessário ao executar operações de documentação.

[Baixar 0.9.0](https://github.com/igormicadei/Contextory/releases/tag/v0.9.0)

## Qualificação e escopo

As verificações cobrem a interface em barra lateral estreita e painel baixo, limites de revisão no backend, MCP/registro nativo, operações descartáveis e páginas Carbon offline nos dois idiomas em 1440/390/320 pixels. Recursos incluídos são verificados contra 469 hashes. A publicação compara VSIX/checksum baixados e o manifesto completo da documentação.

Node.js 24+ e workspaces locais confiáveis no Windows continuam o ambiente qualificado. Confiança de hooks, conversas autenticadas, outros sistemas e workspaces remotos preservam seus limites. Reutilizar metadados Contextory de projetos de referência permanece no backlog. Definições, releases e aprovações históricas são preservadas; explicações geradas não são requisitos aprovados.

## Fontes

- package.json
- src/contracts/model.ts
- src/webview/catalog.ts
- src/webview/documentation.ts
- src/documentation/manager.ts
- src/documentation/reader.ts
- resources/documentation/PROVENANCE.json
- tests/integration/catalog.test.ts
- tests/integration/documentation.test.ts
- tests/ui/documentation.spec.ts

