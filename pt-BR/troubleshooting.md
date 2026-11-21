# Solução de problemas e recuperação

## Recupere o serviço e conexões nativas

| Sintoma | Ação |
| --- | --- |
| Serviço indisponível | Mantenha o editor aberto, confira Node 24+ no PATH, ajuste contextory.nodeExecutable se necessário e inspecione Output > Contextory |
| Análise ou conexão desabilitada | Confie em um workspace local suportado; evite raízes virtuais/remotas ou aninhadas |
| Indicador cinza | Veja o estado no tooltip, clique para refazer a configuração, revise a confiança MCP/hooks e faça uma leitura |
| Ferramentas ausentes em chat antigo | Reinicie extensões dos agentes, recarregue a conexão MCP e reabra o chat conforme exigido pelo cliente |
| Hooks sem eventos observados | Reconstrua uma vez, confira os reparos e depois verifique a confiança e dispare um evento suportado; arquivos inalterados não comprovam execução |
| Configuração sem propriedade ou malformada | Resolva o conflito concreto; o registro preserva entradas alheias e recusa caminhos com links |
| Serviço antigo após atualização | Siga a mensagem de divergência; feche editores do projeto por cerca de 65 segundos antes de reabrir quando solicitado |

[Guia de recuperação de conexões e hooks](user-guide.md)

## Recupere resultados de código e conclusão

| Sintoma | Ação |
| --- | --- |
| Fluxo Python falha | Confira Python 3.10+ e contextory.pythonExecutable; use caminho absoluto se necessário |
| Raiz de código inesperada | Informe projectId/codebaseId explicitamente e foque o símbolo desejado antes do trace |
| Busca de código parece obsoleta | Consulte novamente o código salvo; atualize índices vazios/com falha, confira exclusões e gere/reimporte Graphify obsoleto |
| Busca semântica indisponível | Prepare o runtime local opcional e o índice ou use busca lexical/fallback híbrido |
| Especificação permanece enviada | Acompanhe jobs, resolva bloqueios e evidências obsoletas, envie todos os critérios e conclua explicitamente com a revisão retornada |
| Grupo entre projetos incompleto | Restaure os projetos ausentes/offline e recupere os ramos no responsável original; verifique cada pedido local |

## Relate um problema reproduzível

Inclua versão do Contextory, editor/versão, versões Node/Python, erro exato e passos de reprodução. Remova credenciais, descritores privados, tokens e registros privados antes de compartilhar logs. Preserve a cobertura atual e os limites não verificados.

[Abrir o rastreador de problemas](https://github.com/igormicadei/Contextory/issues)

## Fontes

- src/mcp/readiness.ts
- src/providers/registration.ts
- src/storage/atomic.ts
- src/service/server.ts
- src/core/workflow.ts
- tests/core/readiness.test.ts

