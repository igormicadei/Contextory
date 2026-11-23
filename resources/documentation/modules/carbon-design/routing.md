# carbon-design routing

Local IBM Carbon tokens, fonts, guidelines and optional official Carbon MCP guidance.

Required companions: none.

Optional companions: none.

The installer writes `.custom-agents/registry.json` in its selected project or user root. Read it for installed modules, runtime paths and exact MCP tool ownership; a dependency declaration is not proof that a tool is callable. Discover actual host tools. Execute specialist roles sequentially unless delegation is supported and authorized. Handoffs carry absolute workspace, artifact path, schema version, IDs/revisions/hashes, classification, source refs, acceptance checks and findings. Do not rely on hidden conversation state. Only the owning coordinator accepts changes and publishes. No module grants credentials, permission overrides or automatic external actions.

<!-- custom-agents exposure -->
## Public entries and internal guidance

Users can select entries in `skills/` and supported native roles in `agents/`. Load the linked `internal-skills/` playbooks and `internal-agents/` role guides when the workflow requires them. Internal roles are instruction files, not registered native subagent types. For supported and authorized delegation, pass the role instructions and explicit artifacts to an available agent. Sequential execution may load the same guides; preserve independent review and human acceptance requirements.

- interno: [Guia visual Carbon](internal-skills/guia-visual-carbon/SKILL.md) (`guia-visual-carbon`). Consultar os tokens, componentes, fontes e exemplos locais do Carbon durante a criação e revisão de apresentações ou aplicações visuais.
- interno: [Orientação para o MCP Carbon](internal-skills/integrar-mcp-carbon/SKILL.md) (`integrar-mcp-carbon`). Orientar o uso do MCP oficial do Carbon quando estiver conectado, consultando apenas as ferramentas realmente disponíveis e registrando fontes, versões e limitações.

Nomes técnicos encontrados nas referências originais devem ser resolvidos por esta tabela; os nomes de uso e as descrições estão em português. Os identificadores dos módulos e das ferramentas MCP permanecem estáveis.

| Identificador de origem | Nome de uso |
|---|---|
| `ibm-carbon-design` | `guia-visual-carbon` |
| `carbon-mcp-guidance` | `integrar-mcp-carbon` |

For installed companions, resolve `modules` or the current client's `inheritedModules` in `.custom-agents/registry.json` and read that module's `routing.md`; inherited modules may be global. For shared visual tool diagnostics, load the installed `visual-runtime` internal playbook. When `carbon-design` is installed and Carbon is relevant, load its internal references. These links neither install optional companions nor authorize delegation.
