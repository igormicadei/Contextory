# Corpus contract / Contrato do corpus

EN: The installed `runtime/server.py` advertises callable schemas and bilingual server instructions. `docs_init` creates `.documentation/project.json` with Carbon schema v2, grouped navigation and draft pages; edit this file through native file tools. `docs_map` is read-only and paginates symbol details: follow `nextOffset` until null. `sourceFingerprint` covers the complete selected source inventory, including pages not returned in the current response. Run mapping again after source comments change.

PT-BR: O `runtime/server.py` instalado anuncia os schemas e instruções bilíngues do servidor. `docs_init` cria `.documentation/project.json` com schema Carbon v2, navegação agrupada e páginas em rascunho; edite esse arquivo pelas ferramentas nativas. `docs_map` apenas lê e pagina os detalhes dos símbolos: siga `nextOffset` até null. `sourceFingerprint` cobre todas as fontes selecionadas, inclusive páginas ausentes na resposta atual. Refaça o mapa após alterar comentários nas fontes.

## Project and coverage / Projeto e cobertura

```json
{
  "schemaVersion": 2,
  "designSystem": "carbon",
  "navigation": [{"id": "getting-started", "title": {"pt-BR": "Comece aqui", "en": "Get started"}, "pages": ["quickstart"]}],
  "name": "Distance Kit",
  "slug": "distance-kit",
  "version": "1.0.0",
  "kind": "library",
  "hasUserInterface": false,
  "pagesHost": "github.com",
  "sourceRoots": ["src"],
  "exclude": [{"pattern": "src/generated/*", "reason": "Generated from the checked-in protocol schema / Gerado a partir do schema de protocolo versionado"}],
  "draft": false,
  "audit": {"featuresReviewed": true, "reviewedSourceFingerprint": "COPY_CURRENT_DOCS_MAP_FINGERPRINT"},
  "features": [{
    "id": "convert-distance",
    "name": {"pt-BR": "Converter distâncias", "en": "Convert distances"},
    "sources": [{"path": "src/distance.py", "line": 10}],
    "pages": ["quickstart", "api"]
  }],
  "externalCoverage": [],
  "pages": []
}
```

EN: The `designSystem` value is fixed to `carbon`; migration replaces any prior visual theme when the site is rebuilt. Every navigation group has a safe unique `id`, a `title` translated into `pt-BR` and `en`, and a nonempty `pages` list. Each page appears in exactly one group, with all groups and pages rendered in both locales. The default navigation groups start here, guides, reference, integrations and help; customize labels and grouping while retaining page coverage.
PT-BR: O valor de `designSystem` é fixo como `carbon`; a migração substitui qualquer tema visual anterior quando o site é reconstruúdo. Cada grupo de navegação tem `id` seguro e único, `title` traduzido para `pt-BR` e `en` e uma lista `pages` não vazia. Cada página aparece em exatamente um grupo, e todos os grupos e páginas são renderizados nos dois idiomas. Os grupos padrão organizam início, guias, referência, integrações e ajuda; personalize rótulos e grupos mantendo a cobertura das páginas.

EN: The generated Carbon shell uses grouped collapsible navigation, local search derived from the corpus, a navbar language switch and browser-language routing at `/`. Every HTML page advertises `/llms.txt` with a `text/plain` alternate link. Do not add visible LLM links to generated pages; `llms.txt` links to locale/full exports and the API manifest.
PT-BR: O shell Carbon gerado usa navegação agrupada e recolhível, busca local derivada do corpus, troca de idioma na barra superior e roteamento pelo idioma do navegador em `/`. Cada página HTML anuncia `/llms.txt` por um alternate `text/plain`. Não adicione links LLM visíveis às páginas; `llms.txt` aponta para exportações por idioma/completas e para o manifesto da API.


PT-BR: Substitua fingerprint e caminhos ilustrativos pelas evidências atuais. `kind` aceita `application`, `library` ou `plugin`. `sourceRoots` precisa de pelo menos um diretório relativo ao workspace. Exclusões exigem motivo explícito e se aplicam a arquivos relativos. Dependências, artefatos gerados, ferramentas e links simbólicos são ignorados e relatados. Revise exclusões e projetos mistos manualmente; a exclusão automática não comprova documentação de comportamentos omitidos. Marque `featuresReviewed` somente depois de reconciliar rotas, comandos, configurações, estados da interface, extensões, APIs e testes com o inventário. Descoberta dinâmica e serviços externos precisam de notas de verificação no conteúdo.

## Pages and blocks / Páginas e blocos

EN: `hasUserInterface` defaults to true for applications and false for libraries/plugins. Set it from the actual project: headless services do not need invented screenshots; libraries/plugins with a UI additionally require `walkthroughs`, feature steps and actual images. Mixed projects retain the library/API pages as well as their UI guides.

PT-BR: `hasUserInterface` é true por padrão em aplicações e false em bibliotecas/plugins. Defina-o conforme o projeto real: serviços sem interface não precisam de capturas inventadas; bibliotecas/plugins com interface também exigem `walkthroughs`, passos por funcionalidade e imagens reais. Projetos mistos mantêm referência de biblioteca/API e guias da interface.

EN: Mapping also hashes supporting files (configuration, manifests, assets and prose) in ownership roots and sources cited outside those roots. They affect freshness without being treated as programming-language declarations. Only this tool's managed README links block is omitted from its prose hash, preventing a build→publication→README cycle; changes to the surrounding README still invalidate the review.

PT-BR: O mapa também calcula hashes dos arquivos de apoio (configurações, manifestos, assets e textos) nas raízes e das fontes citadas fora delas. Eles afetam a atualização sem serem tratados como declarações da linguagem. Apenas o bloco de links README gerenciado por esta ferramenta é omitido do hash do texto, evitando o ciclo geração→publicação→README; alterações no texto ao redor invalidam a revisão.

EN: Every page has unique safe `id`, translated `title`, current `sources`, and nonempty `sections`. Every section has an `id` unique within that page, translated `title`, and nonempty `blocks`. The same object supplies both locales, preserving navigation parity. `source-api` is reserved for generated symbol reference. Source citations use existing workspace-relative `path` and optional valid one-based `line`. Required page IDs are generated by `docs_init`; preserve them when importing old documentation. Extra pages preserve legacy URLs, with a translated notice and a link to their replacement.

PT-BR: Cada página possui `id` seguro e único, `title` traduzido, `sources` atuais e `sections` não vazias. Cada seção possui `id` único na página, `title` traduzido e `blocks` não vazios. O mesmo objeto fornece os dois idiomas e preserva a navegação equivalente. `source-api` é reservado para a referência automática. Citações usam `path` relativo existente e `line` opcional, válida e iniciada em 1. Os IDs obrigatórios são gerados por `docs_init`; preserve-os na importação. Páginas extras preservam URLs legadas com aviso traduzido e link para a substituta.

```json
{
  "id": "quickstart",
  "title": {"pt-BR": "Primeiros passos", "en": "Quickstart"},
  "sources": [{"path": "src/distance.py", "line": 1}],
  "sections": [{
    "id": "conversion",
    "title": {"pt-BR": "Converter metros", "en": "Convert metres"},
    "blocks": [
      {"type": "paragraph", "text": {"pt-BR": "A entrada usa metros e recusa valores negativos.", "en": "Input uses metres and rejects negative values."}},
      {"type": "steps", "items": [{"pt-BR": "Crie Distance(2500).", "en": "Create Distance(2500)."}, {"pt-BR": "Chame kilometres(); o resultado é 2.5.", "en": "Call kilometres(); the result is 2.5."}]},
      {"type": "code", "language": "python", "caption": {"pt-BR": "Converter 2.500 metros", "en": "Convert 2,500 metres"}, "code": "Distance(2500).kilometres()"},
      {"type": "link", "text": {"pt-BR": "Referência da API", "en": "API reference"}, "href": "api"}
    ]
  }]
}
```

| Type / Tipo | Fields / Campos |
|---|---|
| `paragraph`, `heading`, `notice` | `text: {"pt-BR": "…", "en": "…"}` |
| `list`, `steps` | `items`: nonempty array of translated text / lista não vazia de textos traduzidos |
| `code` | `language`, translated `caption`, `code` as shared string or translated object / legenda traduzida e código comum ou traduzido |
| `image` | `src: "assets/screen.png"`, translated `alt` and `caption`; file under `.documentation/assets/` / arquivo local e textos traduzidos |
| `table` | `headers`: translated cells; `rows`: arrays of translated cells, matching header length / células traduzidas com colunas consistentes |
| `link` | translated `text`, `href` as a page ID or credential-free HTTPS URL / ID de página ou URL HTTPS sem credenciais |

EN: Text is plain text, escaped in HTML; use blocks for formatting and links. Code fences and Markdown tables are generated. Arbitrary raw HTML and executable remote assets are not accepted. UI feature records must link to pages containing steps and real screenshots, with captions/alt in both languages. Validators establish structural coverage; human/agent review must also establish screenshot truth, example correctness, translation quality and complete behavior coverage.

PT-BR: O texto é simples e escapado no HTML; use blocos para formatação e links. Cercas de código e tabelas Markdown são geradas. HTML arbitrário e assets remotos executáveis não são aceitos. Funcionalidades de interface precisam apontar para páginas com passos e capturas reais, legendas e textos alternativos bilíngues. A validação comprova estrutura; a revisão também precisa comprovar imagens reais, exemplos corretos, traduções de qualidade e cobertura comportamental completa.

## Native comments and external inventories / Comentários nativos e inventários externos

```python
def kilometres(metres: float) -> float:
    """PT-BR: Converter metros não negativos em quilômetros.

    Args: metres: distância em metros, sem arredondamento.
    Returns: distância em quilômetros.
    Raises: ValueError se metres for negativo.

    EN: Convert non-negative metres to kilometres.

    Args: metres: distance in metres, without rounding.
    Returns: distance in kilometres.
    Raises: ValueError when metres is negative.
    """
    if metres < 0:
        raise ValueError("negative distance")
    return metres / 1000
```

EN: The Python AST audit requires `PT-BR:` and `EN:` in every module/class/callable docstring, including private and nested declarations. It preserves the actual signature in the generated API pages and `api.json`. Semantic quality and runtime compatibility still require review/tests.

PT-BR: A auditoria AST exige `PT-BR:` e `EN:` em cada docstring de módulo/classe/função/método, inclusive privados e aninhados. A assinatura real aparece nas páginas de API e em `api.json`. Qualidade semântica e compatibilidade de execução continuam exigindo revisão/testes.

```json
{
  "path": "src/convert.ts",
  "sha256": "COPY_CURRENT_FILE_BYTE_HASH",
  "provider": "TypeScript language service VERSION; reviewed complete declarations / declarações completas revisadas",
  "complete": true,
  "symbols": [
    {"name": "<module>", "kind": "module", "line": 1, "docStartLine": 1, "docEndLine": 4},
    {"name": "convert", "kind": "function", "line": 10, "signature": "convert(metres: number): number", "docStartLine": 5, "docEndLine": 9}
  ]
}
```

EN: Add one `externalCoverage` entry per non-Python source file. Include its module and every class/function/method; use actual native comment line ranges containing both locale markers. Hash actual file bytes, including Windows CRLF differences. A reviewed complete inventory is supplied by Contextory, language tooling or a source review with named provenance; the runtime does not pretend to independently parse these languages. Source changes invalidate the inventory.

PT-BR: Inclua uma entrada `externalCoverage` por arquivo não Python. Inclua módulo e todas as classes/funções/métodos; use intervalos reais de comentários nativos com marcadores dos dois idiomas. Calcule o hash dos bytes reais, inclusive CRLF no Windows. Contextory, ferramentas de linguagem ou revisão identificada fornecem o inventário completo revisado; o runtime não afirma analisar essas linguagens de forma independente. Alterações invalidam o inventário.

## Update and deployment / Atualização e publicação

EN: `pagesHost` is optional. Conventional GitHub.com/Enterprise hostnames are detected; for a custom Enterprise hostname such as `code.company.com`, set `pagesHost` explicitly. It must match the selected remote. Existing `gh` authentication handles that host; this setting does not create credentials or trust.

PT-BR: `pagesHost` é opcional. Hosts convencionais GitHub.com/Enterprise são detectados; para um Enterprise com hostname próprio como `code.company.com`, defina `pagesHost` explicitamente. Ele precisa corresponder ao remoto selecionado. A autenticação existente do `gh` atende esse host; a definição não cria credenciais nem confiança.

EN: `docs_migrate` defaults to read-only inspection, reports added/removed/changed source files and previews v0/v1-to-v2 migrations or a schema-v2 Carbon repair. Applying a migration creates a version-specific byte-for-byte backup, preserves authored content and IDs, normalizes legacy `pt` keys, forces the Carbon theme and grouped navigation, clears stale review evidence, and leaves the corpus as a draft. Unknown future schemas and conflicting locale keys are refused. Legacy HTML/Markdown content must be reviewed and transferred into the corpus; the old visual shell is discarded when rebuilding. Build into managed `.documentation/site/`; unrelated files block replacement. Source/content/image/template changes invalidate build evidence.

PT-BR: `docs_migrate` apenas inspeciona por padrão, relata fontes adicionadas/removidas/alteradas e prevê migrações de v0/v1 para v2 ou correção Carbon do schema v2. Aplicar cria backup byte a byte específico da versão, preserva conteúdo e IDs autorais, normaliza chaves antigas `pt`, força tema Carbon e navegação agrupada, limpa provas de revisão obsoletas e deixa o corpus como rascunho. Schemas futuros e chaves de idioma conflitantes são recusados. Conteúdo HTML/Markdown legado precisa ser revisado e transferido ao corpus; o shell visual antigo é descartado na reconstrução. Gere em `.documentation/site/`; arquivos alheios impedem substituição. Mudanças nas fontes/conteúdo/imagens/template invalidam a prova de geração.

EN: Presentation review uses the same Carbon baseline as the installed authoring guidance: bundled v11 tokens, white article canvas, `g100` header, neutral grouped navigation, local IBM Plex fonts, an approximately 52rem reading measure, locale-aware local search and a responsive drawer. Keep the optional contents rail out of constrained layouts. Horizontally scrollable tables and code blocks remain keyboard-focusable; narrow screens show a localized hint only while more columns remain off-screen. The mobile backdrop is decorative and never receives keyboard focus; the open drawer confines focus and makes the underlying page inert. Use the authoring skill's 1440px, 390px and 320px review widths after build or migration.

PT-BR: A revisão visual usa a mesma base Carbon da orientação instalada de autoria: tokens v11 incluídos, canvas branco, cabeçalho `g100`, navegação neutra e agrupada, fontes IBM Plex locais, largura de leitura próxima de 52rem, busca local por idioma e drawer responsivo. Retire o sumário opcional de layouts estreitos. Tabelas e blocos de código com rolagem horizontal continuam acessíveis pelo teclado; telas estreitas mostram uma dica localizada somente enquanto houver mais colunas fora da tela. O fundo do drawer móvel é decorativo e nunca recebe foco de teclado; o drawer aberto contém o foco e deixa inerte a página abaixo. Use as larguras de revisão de 1440px, 390px e 320px da skill de autoria após geração ou migração.