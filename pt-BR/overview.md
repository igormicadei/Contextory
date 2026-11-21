# Contextory

## Memória de projeto para agentes nativos

O Contextory conecta pedidos, especificações, código, decisões e evidências de verificação em um registro local do projeto. Trabalhe no chat nativo do Codex, Claude Code ou IBM Bob e use o Contextory para recuperar o que foi pedido, o que mudou e por quê.

Este guia descreve o Contextory 0.7.0, uma prévia qualificada no Windows com pastas locais confiáveis no VS Code e IBM Bob. A extensão precisa do Node.js 24+. Python 3.10+ é opcional para análise Python. Cada agente usa sua própria conta, modelo e conversa.

[Instalar o Contextory](install.md)

[Concluir sua primeira alteração rastreada](quickstart.md)

## Encontre o próximo passo

| Objetivo | Guia |
| --- | --- |
| Conectar um agente e configurar verificações | Primeiros passos e instalação |
| Entender a interface no dia a dia | Guia do usuário e guias passo a passo |
| Inspecionar código ou comparar repositórios | Inteligência de código e uso avançado |
| Integrar outro cliente | Adaptação, CLI e API MCP |
| Compilar ou melhorar o Contextory | Contribuição e arquitetura |

[Explorar a interface](walkthroughs.md)

[Consultar contratos MCP](api.md)

## Do pedido ao resultado verificado

1. Descreva uma alteração autorizada no chat nativo. Recupere decisões anteriores e inspecione o código atual.
2. Revise um pedido dividido em marcos e especificações com critérios de aceite claros.
3. Mantenha problemas, decisões e resultados independentes vinculados a cada especificação.
4. Confirme a conclusão explícita e exporte um relatório que explique o resultado final.

[Escrever um resultado de implementação útil](outcomes.md)

## Fontes

- package.json
- src/extension.ts
- src/service/server.ts
- src/providers/clients.ts

