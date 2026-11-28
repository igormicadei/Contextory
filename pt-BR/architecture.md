# Arquitetura de execução

## Entenda os limites dos processos

| Componente | Responsabilidade |
| --- | --- |
| Agente nativo | Conversa, modelo, autenticação, edição e permissões nativas |
| Extensão e webviews do editor | Configuração do workspace confiável, interface, navegação de código e integração de tema |
| Serviço Node isolado | Ferramentas por papel, regras do fluxo, registro, busca, verificações e observação de releases |
| Workers de análise / analisador Python | Extração estática limitada fora do Extension Host; sem importar módulos do workspace |
| Armazenamento SQLite | Registros/revisões/artefatos autoritativos e projeções reconstruíveis de grafo/busca |

Proxies MCP nativos conectam-se a descritores privados do serviço local. Hooks fornecem lembretes limitados e metadados normalizados. MCP nativo/independente, resumos e hooks compartilham orientação de execução; configurações específicas dos clientes ficam nos adaptadores.

Além de lembretes e metadados normalizados, hooks nativos impõem decisões de aprovação pendentes antes da implementação e de Stop. Agentes só aprovam automaticamente manutenção/conflitos de implementação; conflitos de processo/resultado aguardam revisão humana. A imposição depende de o cliente confiar e executar os hooks atualizados.

## Preserve os registros autoritativos

Pedidos, contratos, revisões imutáveis, decisões, evidências, resultados, definições Knowledge e releases são histórico autoritativo. O grafo de código e os índices lexicais/vetoriais são projeções reconstruíveis. Reconstruir a análise não deve apagar o histórico de trabalho.

Cada projeto possui seu registro, sessões, leases, verificações, referências e releases. O roteamento entre projetos valida a participação atual no workspace e preserva o papel do chamador. Um repositório de referência tem projeção isolada e somente leitura dentro do projeto responsável.

## Entenda privacidade e autoridade

O Contextory armazena explicações concisas e metadados observados, não transcrições de chats nativos. Saídas de verificações e conteúdo indexado ficam locais. A revisão humana Knowledge é imposta pelos papéis do serviço, mas o projeto não isola credenciais ou SQLite de processos com acesso irrestrito ao sistema de arquivos.

[Consultar detalhes de armazenamento e configurações](reference.md)

## Fontes

- src/extension.ts
- src/service/server.ts
- src/service/application.ts
- src/storage/ledger.ts
- src/codebase/worker.ts
- src/agents/instructions.ts
- src/hooks/approval.ts
- src/hooks/launcher.ts
- src/knowledge/catalog.ts
- src/core/workflow.ts
- tests/integration/approval-policy.test.ts

