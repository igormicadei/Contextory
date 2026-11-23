# Software documentation / Documentação de software

EN: This independent role documents an existing application's behavior or a library/plugin's installation, APIs and extension contracts. It owns the `software_documentation` MCP, whose ten tools take an explicit authorized absolute `workspace`. Its Python 3.11+ runtime uses only the standard library. The existing dossier `project-documentation` profile remains a separate workflow.

PT-BR: Este papel independente documenta o comportamento de aplicações ou a instalação, APIs e contratos de extensão de bibliotecas/plugins. Ele fornece o MCP `software_documentation`, cujas dez ferramentas recebem um `workspace` absoluto autorizado. O runtime Python 3.11+ usa apenas a biblioteca padrão. O perfil existente `project-documentation`, para dossiês, continua sendo outro fluxo.

EN: Start with [create documentation](skills/documentar-software/SKILL.md), or [update/migrate](skills/atualizar-documentacao-software/SKILL.md) for an existing corpus. The [coordinator](agents/documentador-de-software.md) loads [source comments](internal-skills/documentar-codigo-fonte/SKILL.md) and [deployment/consumer integration](internal-skills/integrar-documentacao/SKILL.md) only when needed. Internal files remain packaged but outside public command discovery; this is not an authorization boundary.

PT-BR: Comece por [criar documentação](skills/documentar-software/SKILL.md), ou [atualizar/migrar](skills/atualizar-documentacao-software/SKILL.md) quando já houver um corpus. O [coordenador](agents/documentador-de-software.md) carrega [comentários de código](internal-skills/documentar-codigo-fonte/SKILL.md) e [publicação/integração no consumidor](internal-skills/integrar-documentacao/SKILL.md) conforme a necessidade. Os guias internos são distribuídos sem acrescentar comandos públicos; isso não limita autorização ou acesso aos arquivos.

EN: `carbon-design` is a required dependency; load its installed Carbon visual guide before authoring or migrating documentation. Resolve dependency and companion entries from `modules` or `inheritedModules` for the current client in the selected `.custom-agents/registry.json`, then read installed routing and internal guidance. Contextory remains optional. Discover actual host tools; never invent calls or install/configure another service silently. Mapping may continue if Contextory is unavailable, while retaining the concrete error and unverified coverage. Preserve native human-only decisions and permissions.

PT-BR: `carbon-design` é dependência obrigatória; leia seu guia visual instalado antes de criar ou migrar documentação. Resolva dependências e módulos complementares em `modules` ou `inheritedModules` do cliente no `.custom-agents/registry.json` selecionado e leia seus guias internos. Contextory continua opcional. Descubra as ferramentas reais; não invente chamadas nem instale/configure outro serviço implicitamente. O mapeamento pode continuar sem Contextory, mantendo o erro concreto e a cobertura não verificada. Preserve decisóes humanas e permissões nativas.

<!-- custom-agents exposure -->
## Public entries and internal guidance

Users can select entries in `skills/` and supported native roles in `agents/`. Load the linked `internal-skills/` playbooks and `internal-agents/` role guides when the workflow requires them. Internal roles are instruction files, not registered native subagent types. For supported and authorized delegation, pass the role instructions and explicit artifacts to an available agent. Sequential execution may load the same guides; preserve independent review and human acceptance requirements.

- público: [Documentar software](skills/documentar-software/SKILL.md) (`documentar-software`). Documentar aplicações, bibliotecas e plugins a partir do código, em português brasileiro e inglês, com comentários de código, guias de uso, site Carbon, versão para agentes e publicação no GitHub Pages quando autorizada.
- público: [Atualizar documentação de software](skills/atualizar-documentacao-software/SKILL.md) (`atualizar-documentacao-software`). Atualizar ou migrar a documentação de uma aplicação, biblioteca ou plugin, preservando conteúdo e traduções, verificando mudanças nas fontes e reconstruindo o site e suas integrações.
- interno: [Documentar código-fonte](internal-skills/documentar-codigo-fonte/SKILL.md) (`documentar-codigo-fonte`). Orientar a documentação bilíngue de módulos, classes, métodos e funções com comentários nativos da linguagem e cobertura rastreável das fontes.
- interno: [Integrar documentação de software](internal-skills/integrar-documentacao/SKILL.md) (`integrar-documentacao`). Orientar a publicação da documentação no GitHub Pages e a distribuição de skills, agentes e MCP de consulta para projetos consumidores de bibliotecas e plugins.
- público: [Documentador de software](agents/documentador-de-software.md) (`documentador-de-software`). Coordenar o mapeamento e a documentação bilíngue de aplicações, bibliotecas e plugins, com fontes, cobertura, site Carbon, integrações para agentes e publicação verificada.

Nomes técnicos encontrados nas referências originais devem ser resolvidos por esta tabela; os nomes de uso e as descrições estão em português. Os identificadores dos módulos e das ferramentas MCP permanecem estáveis.

| Identificador de origem | Nome de uso |
|---|---|
| `document-software` | `documentar-software` |
| `update-software-docs` | `atualizar-documentacao-software` |
| `source-docstrings` | `documentar-codigo-fonte` |
| `documentation-integrations` | `integrar-documentacao` |
| `software-documenter` | `documentador-de-software` |

For installed companions, resolve `modules` or the current client `inheritedModules` in `.custom-agents/registry.json` and read that module `routing.md`; inherited modules may be global. Always load the required `carbon-design` internal visual guide for the documentation template. For shared visual tool diagnostics, load the installed `visual-runtime` internal playbook. These links neither install companions nor authorize delegation.
