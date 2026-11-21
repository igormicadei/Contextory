# Clientes, CLI e integração

## Entenda os adaptadores de clientes

| Cliente | Configuração MCP | Skills / hooks |
| --- | --- | --- |
| Codex | .codex/config.toml | .agents/skills; .codex/hooks.json |
| Claude Code | .mcp.json | .claude/skills; .claude/settings.local.json |
| IBM Bob | .bob/mcp.json | .bob/skills; .bob/settings.json |
| MCP genérico | .contextory/mcp.json | .contextory/skills para exportação; sem hooks |

Conecte pelos comandos da extensão. O Contextory grava entradas gerenciadas locais do workspace e preserva configurações alheias. Conflitos malformados, links ou entradas sem propriedade falham sem substituição. Clientes nativos mantêm autenticação, seleção de modelo, edição, permissões e confiança. Hooks fornecem lembretes e metadados opcionais.

## Use outro cliente MCP

1. Execute Contextory: Export Generic MCP Connection no projeto escolhido.
2. Importe a entrada do servidor no cliente e copie as pastas exportadas de skills de código, fluxo de trabalho e migração para o local de descoberta suportado pelo cliente.
3. Aprove/recarregue pelo cliente e faça uma leitura de workspace/contexto. .contextory/skills é um local de exportação, não um caminho universal de descoberta automática.

![Barra lateral do Contextory com progresso dos pedidos e controles dos agentes nativos.](../assets/companion-sidebar.png)

Barra lateral capturada da aplicação; os registros são exemplos.

## Execute sem editor

Comandos independentes do pacote

```powershell
node dist/contextory.mjs help
node dist/contextory.mjs index --root C:/Projects/Checkout
node dist/contextory.mjs context "payment retries" --root C:/Projects/Checkout --budget 3000
node dist/contextory.mjs mcp --root C:/Projects/Checkout
```

Use Node.js 24+ com a pasta dist do pacote. Para MCP stdio configure node com os argumentos ["/absolute/path/dist/contextory.mjs", "mcp", "--root", "/absolute/project"]. O servidor permanece ativo até EOF/sinais. A inspeção analisa os arquivos sem executá-los; verificações configuradas só executam quando solicitadas explicitamente.

> Registros independentes usam <root>/.contextory-local/service por padrão e formam um registro separado. Para compartilhar registros do editor, use --descriptor com o descritor genérico exportado pelo editor ativo e --root correspondente. Faça backup do registro efetivamente usado.

## Instale orientação opcional de documentação

O bundle gerado .documentation/integrations/contextory contém esta versão da documentação bilíngue, orientações de uso/desenvolvimento e um MCP de consulta somente leitura. Ele é separado do MCP operacional do Contextory e das skills de código/fluxo de trabalho/migração.

Simular instalação explícita no workspace consumidor escolhido

```powershell
python .documentation/integrations/contextory/install.py --workspace C:/Projects/Consumer --client codex --dry-run
```

Remova --dry-run apenas para o projeto consumidor explicitamente escolhido. Clientes suportados: codex, claude e bob. Instalar a extensão ou importar um pacote não ativa silenciosamente esta integração opcional. Suas consultas leem a versão instalada e não controlam o Contextory.

## Fontes

- src/providers/clients.ts
- src/cli.ts
- src/providers/registration.ts
- skills/contextory-codebase/SKILL.md
- skills/contextory-workflow/SKILL.md
- skills/contextory-migrate/SKILL.md
- tests/integration/headless.test.ts

