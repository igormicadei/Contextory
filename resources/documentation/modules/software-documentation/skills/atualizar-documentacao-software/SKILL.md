---
name: atualizar-documentacao-software
description: "Atualizar ou migrar a documentação de uma aplicação, biblioteca ou plugin, preservando conteúdo e traduções, verificando mudanças nas fontes e reconstruindo o site e suas integrações."
---

EN: Use the [corpus contract](../../references/corpus.md) for schema migration, source inventories, preserved URLs and bilingual content fields.

PT-BR: Use o [contrato do corpus](../../references/corpus.md) para migrar o schema, revisar inventários, preservar URLs e editar os campos bilíngues.

# Atualizar ou migrar / Update or migrate

EN: `carbon-design` is required. Resolve its installed guide through the module registry before changing site presentation. Every supported legacy migration must force `designSystem: "carbon"`, add or repair grouped navigation, preserve authored content and URLs, create a version-specific backup and leave the corpus in draft for review. Rebuild old HTML/CSS layouts from the current corpus with the Carbon template; do not copy the old theme into the generated site.

PT-BR: `carbon-design` é obrigatório. Resolva seu guia instalado pelo registro de módulos antes de alterar a apresentação. Toda migração compatúvel deve forçar `designSystem: "carbon"`, criar ou corrigir a navegação agrupada, preservar conteúdo autoral e URLs, criar backup da versão e deixar o corpus em rascunho para revisão. Reconstrua layouts HTML/CSS antigos a partir do corpus atual usando o template Carbon; não copie o tema anterior para o site gerado.

EN: Use the [documentation workflow](../documentar-software/SKILL.md) for its source, audience and bilingual coverage requirements. This entry updates an existing software corpus or migrates legacy documentation; it does not refresh the installed agent/runtime package, which belongs to the repository's `refresh-guidance` or installation workflow.

PT-BR: Use o [fluxo de documentação](../documentar-software/SKILL.md) para requisitos de fontes, público e cobertura bilíngue. Esta entrada atualiza um corpus de software existente ou migra documentação antiga; a atualização do pacote de agente/runtime instalado usa `refresh-guidance` ou o instalador do repositório.

EN: Select the absolute authorized workspace, inspect the current schema, corpus, hashes, outputs, redirects and existing site URL, then re-map with `docs_map`. When available, consult current Contextory exports and decisions with explicit project identity and provenance. Compare changed/removed/renamed files, features and APIs against documented content and consumer guidance. Keep a review list of affected pages, symbols, screenshots, examples, translations and links.

PT-BR: Selecione o workspace absoluto autorizado, examine schema, corpus, hashes, saídas, redirecionamentos e URL existente e refaça o mapa com `docs_map`. Quando disponíveis, consulte exportações e decisões atuais do Contextory com identidade explícita e proveniência. Compare arquivos, recursos e APIs alterados/removidos/renomeados com o conteúdo e guias de consumo. Liste páginas, símbolos, capturas, exemplos, traduções e links afetados.

EN: Discover `docs_migrate`'s real schema and use its version-aware migration for supported older corpora. Review/create backups before transformations; reject unknown future schemas. Preserve authored content, paired locale IDs, assets, historical links and meaningful redirects. Treat imported Markdown/HTML as source material for review, never proof of current correctness. Do not overwrite an unmanaged corpus or blindly initialize over existing documentation. Resolve legacy structure into the current contract with explicit source evidence.

PT-BR: Descubra o schema real de `docs_migrate` e use sua migração versionada para corpora antigos suportados. Revise/crie backups antes das transformações; recuse schemas futuros desconhecidos. Preserve conteúdo autoral, IDs correspondentes dos idiomas, assets, links anteriores e redirecionamentos úteis. Markdown/HTML importado é material para revisão, não prova do comportamento atual. Não sobrescreva corpus não gerenciado nem inicialize sobre documentação existente. Adapte o legado ao contrato atual com fontes explícitas.

EN: Update source docstrings and every affected locale together, regenerate the feature/API coverage and revise examples/screenshots against current behavior. Run validation and project checks, rebuild all human/LLM exports and refresh the README links and consumer bundle as needed. Review the artifact manifest for removed pages and stale files; managed cleanup must preserve unrelated files. Later source/content/output edits invalidate publication readiness. Publish only with existing authorization through the [integration workflow](../../internal-skills/integrar-documentacao/SKILL.md), verify the live deployment, and explicitly close tracked Contextory specs when available. Retain unresolved limitations when evidence is unavailable.

PT-BR: Atualize docstrings e todos os idiomas afetados em conjunto, regenere a cobertura de funcionalidades/API e revise exemplos/capturas com o comportamento atual. Valide, execute os checks do projeto, reconstrua exportações humanas/LLM e atualize links no README e bundle do consumidor quando necessário. Revise o manifesto para páginas removidas e arquivos obsoletos; a limpeza gerenciada deve preservar arquivos alheios. Alterações posteriores nas fontes/conteúdo/saída invalidam a prontidão de publicação. Publique com autorização existente pelo [fluxo de integração](../../internal-skills/integrar-documentacao/SKILL.md), verifique a implantação e conclua explicitamente as specs do Contextory quando disponível. Preserve limitações sem evidência.

## Carbon layout acceptance / Critérios de layout Carbon

EN: Apply the Carbon v11 layout contract from `documentar-software` to every migrated site: bundled Carbon tokens, white reading canvas, `g100` header, neutral grouped side navigation, local locale-aware search, language switch in the header and a responsive drawer. Rebuild the shell from the current corpus rather than carrying legacy CSS forward. After migration, inspect 1440px, 390px and 320px output, test focus confinement/Escape/search/language switching, and resolve overflow, contrast, spacing, translation or navigation findings before clearing draft status.

PT-BR: Aplique o contrato de layout Carbon v11 de `documentar-software` a todo site migrado: tokens Carbon incluídos, canvas branco de leitura, cabeçalho `g100`, navegação lateral neutra e agrupada, busca local por idioma, troca de idioma no cabeçalho e drawer responsivo. Reconstrua o shell a partir do corpus atual em vez de carregar o CSS legado. Depois da migração, inspecione 1440px, 390px e 320px, teste contenção de foco/Escape/busca/troca de idioma e corrija transbordamento, contraste, espaçamento, tradução ou navegação antes de remover o estado de rascunho.