# Perguntas frequentes

## O Contextory substitui meu chat ou modelo?

Não. Continue usando seu agente nativo. O Contextory oferece registros e ferramentas compartilhados; histórico de conversa, autenticação, seleção de modelo e edição permanecem no cliente.

## Preciso de Python ou de baixar um modelo?

Node.js 24+ é obrigatório. Python 3.10+ só é necessário para análise Python. A busca semântica local é opcional; busca lexical/estrutural funciona sem baixar embeddings.

## Uma pergunta sobre código precisa de pedido rastreado?

Perguntas somente leitura e exportações de documentação não precisam. Implementações autorizadas usam pedidos, marcos, critérios, sessão/lease e evidências independentes antes da conclusão explícita.

## Por que uma especificação enviada continua aberta?

O envio do resultado registra a explicação. O agente precisa pedir a conclusão separadamente com a revisão atual retornada. Verificações ausentes, evidências obsoletas, dependências, problemas bloqueantes e propostas de catálogo podem impedir a conclusão.

## Um indicador verde comprova autenticação?

Ele comprova tráfego MCP observado para aquele agente configurado nesta instância do serviço. Não comprova autenticação do modelo nem execução de todos os hooks. Use controles nativos de confiança e diagnósticos para mais detalhes.

## Um agente pode aprovar sua própria definição Knowledge?

Não. Agentes criam observações e propostas concretas. A interface Knowledge autenticada para uso humano aprova ou rejeita revisões exatas, preservando motivos e histórico.

## Um grafo ou teste vinculado é evidência de execução?

Não. Extração estática e referências de testes indicam relações possíveis. A verificação exige resultados atuais de verificações com proveniência e fingerprints de código/contrato/tentativa.

## Fontes

- package.json
- src/providers/clients.ts
- src/core/workflow.ts
- src/core/usage.ts
- src/knowledge/catalog.ts

