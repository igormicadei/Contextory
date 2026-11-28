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

## Recuperação automática e limites de requisição

O editor verifica o serviço a cada 20 segundos, com limite de cinco segundos. Perda do fluxo, inclusive encerramento normal, dispara reconexão após 1, 2, 4, 8, 16 e no máximo 30 segundos. A interface identifica dados retidos e oferece Retry now. A recuperação não repete mutações com falha.

REQUEST_TIMEOUT indica que a operação excedeu seu limite; não comprova SERVICE_UNAVAILABLE. Ferramentas comuns permitem 120 segundos e releases têm limite separado de cinco minutos. Se a resposta de uma mutação for incerta, recupere com o ID de operação e a entrada originais exatos.

Para o antigo erro Configure at most 30 check recipes, atualize para 0.8.0: até 256 receitas são aceitas. Corrija IDs duplicados ou receitas inválidas em Fix check settings. Erros de configuração preservam o serviço e suas últimas receitas válidas.

Rebuild hooks grava arquivos gerenciados imediatamente. Reparos com mudanças seguem contextory.restartAfterSetup: prompt, automatic ou never. A extensão Codex inspecionada não expõe comando público para atualizar hooks; o Contextory não concede confiança nativa nem garante recarga imediata em chat ativo. Revise /hooks na sessão, preserve maiúsculas/minúsculas do caminho e reabra o chat após reiniciar extensões quando necessário.

## Recupere resultados de código e conclusão

| Sintoma | Ação |
| --- | --- |
| Um item continua pendente em Approvals | Leia o erro ao lado do item. Fontes são atualizadas automaticamente, sem comentário. Restaure arquivos ausentes ou peça ao agente para corrigir referências. Solicite ajustes para um alvo obsoleto ou explicação incompleta; o agente revisa a proposta e aguarda novamente. Se a resposta estiver na fila, retome a conversa vinculada e confira a confiança dos hooks nativos. |
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
- src/extension.ts
- src/service/reconnect.ts
- src/service/rpc.ts
- src/webview/progress.ts
- tests/ui/console.spec.ts
- tests/integration/recipe-configuration.test.ts
- scripts/verify-background-startup.mjs
- src/knowledge/catalog.ts
- src/webview/catalog.ts
- tests/ui/catalog.spec.ts
- tests/integration/catalog.test.ts

