---
name: integrar-mcp-carbon
description: "Orientar o uso do MCP oficial do Carbon quando estiver conectado, consultando apenas as ferramentas realmente disponíveis e registrando fontes, versões e limitações."
---

Descubra no host se o servidor oficial `https://mcp.carbondesignsystem.com/mcp`
está conectado. Os nomes podem receber prefixos: inspecione as ferramentas e seus
schemas reais. Se disponível, leia também a skill oficial `carbon-builder`.
O servidor local `carbon_visual_agent` e o Carbon MCP remoto são conexões distintas;
o agente do host coordena as chamadas entre eles.

Use apenas as ferramentas realmente expostas pelo host; o runtime visual atual não declara uma ferramenta `carbon.guidance`. Registre disponibilidade, uso bem-sucedido, fontes, versões e limitações nos artefatos de revisão.

Consulte as ferramentas efetivamente disponíveis para a dúvida atual:

- `docs_search`: convenções, tokens, componentes e acessibilidade.
- `code_search`: exemplos e APIs de implementação.
- `get_charts`: escolha e uso de gráficos.
- `labs_search`: orientação experimental quando necessária; não presume suporte local.
- `code_audit`: auditoria de um trecho autorizado, com findings reais.

Faça consultas pequenas; reutilize resultados pertinentes na sessão. Não envie
o dossiê, notas privadas, credenciais ou dados de cliente por padrão. Trate os
resultados como referências: exemplos React precisam de adaptação ao Vue/Slidev
e às versões fixadas. Novos componentes/dependências passam pelo registry e pelos
contratos locais. Não substitua revisão visual/browser, acessibilidade, autoria
narrativa nem a verificação do HTML offline por uma pesquisa ou auditoria remota.

Presentation Agent mantém a orquestração; Visual Design Director usa a orientação
de design e Story Architect mantém narrativa/evidências. Registre origem e versão
ou data das orientações usadas nos artefatos privados de revisão existentes.

Se estiver ausente, parcial ou sem autenticação, use tokens, referências e
componentes locais e informe a limitação somente quando relevante. Não repita
tentativas de autenticação. A instalação opcional está no
[guia oficial](https://www.carbondesignsystem.com/getting-started/carbon-mcp/onboarding-and-setup).
OAuth/w3id fica no host; no Bob, o guia recomenda instalar o conector globalmente
para manter token/session ID fora do repositório. Não peça segredos no chat.
