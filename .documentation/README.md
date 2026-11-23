# Contextory documentation

The canonical bilingual content is [project.json](project.json). It uses schema 1 from the **software-documentation:atualizar-documentacao-software** skill and the skill's unchanged default Carbon renderer. Page and section IDs are shared by English and Brazilian Portuguese.

```powershell
npm run docs:map
npm run docs:migrate
npm run docs:validate
npm run docs:check
npm run docs:build
npm run docs:integrations
npm run docs:preview
```

Requires Python 3.11+; set `DOCUMENTATION_PYTHON` to an alternative executable. Preview serves `.documentation/site` at `http://127.0.0.1:4173/en/overview.html`. All assets and links work under a repository subpath such as `/Contextory/`.

After reviewing changed sources, update `audit.reviewedSourceFingerprint` to the value reported by `docs:map`. The build refuses stale reviews and never approves new source automatically. Update both locales together. `markdown-targets.json` lists the English guides exported back to `docs/`; edit the corpus, not those generated guides.

`redirects.json` preserves old HTML URLs; `aliases.json` preserves their heading fragments. `legacy/` contains the original English guides, skills, release records and VitePress configuration. Builds publish these originals as archive downloads. They are historical source material, not proof of current behavior. Unmanaged files in the site directory block replacement. Repository text uses LF for reproducible source hashes across Windows and CI; archived originals and the unchanged vendor runtime preserve their original bytes.

The documentation-only ownership scope covers `scripts/documentation/build.py`. The unchanged vendored runtime/assets are excluded with recorded provenance. Application source and tests are hashed supporting citations. The source-symbol appendix covers the build tooling; the MCP API guide separately documents all 36 product tool contracts. This rewrite does not claim an all-function bilingual source-comment audit.

The earlier rewrite recorded `SERVICE_UNAVAILABLE`; that historical evidence remains in [REVIEW.md](REVIEW.md). The 0.8.0 delivery recovered the original project ledger and tracks release validation. See [the 0.8.0 review](RELEASE-0.8.0.md) for current scope and limits.

PT-BR: O conteúdo bilíngue canônico está em `project.json`. Edite os dois idiomas juntos e execute os comandos acima. O build usa o layout Carbon padrão da skill, recusa revisões de fontes obsoletas e preserva URLs e arquivos históricos. O apêndice de símbolos cobre apenas o gerador da documentação; a API MCP documenta os 36 contratos do produto. A auditoria de comentários de todas as funções internas não faz parte deste escopo. A publicação é uma ação separada; consulte `REVIEW.md` para sua autorização e evidências de implantação.
