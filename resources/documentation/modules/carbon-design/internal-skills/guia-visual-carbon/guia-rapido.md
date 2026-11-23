# IBM Carbon Design System — guia rápido

Referência visual **dos artefatos que o plugin `documentador` gera** (dossiê
exportado, cronograma, mocks). Não é norma para o código do projeto que está
sendo documentado, nem para este repositório fora dos exports.

## Comece por

- `SKILL.md` — as regras de uso, e o mapa de qual skill usa o quê
- `readme.md` — visão geral, temas, índice de componentes
- `styles.css` — a única folha a linkar (importa todos os tokens + camada base)

## Layout

- `tokens/` — paleta, temas (white/g10/g90/g100), componentes, tipografia,
  espaçamento, movimento, forma, fontes
- `components/` — 42 componentes, cada um com `.jsx`, `.d.ts`, `.prompt.md`
- `guidelines/` — cartões-espécime de fundamentos
- `ui_kits/` — superfícies acabadas: homepage, dashboard, relatório para impressão,
  deck 16:9
- `assets/fonts/` — IBM Plex Sans + Mono (woff2, SIL OFL-1.1)
- `assets/icons/` — SVGs Carbon reais, 32px (+ variantes ópticas de 16px)
- `_ds_bundle.js` — componentes compilados para preview no navegador
- `_adherence.oxlintrc.json` — regras de lint de aderência ao design system

## Regras que não se negociam

- Cantos são 0 (exceções: tag pílula, tooltip 2px)
- Nunca negrite um título de display — peso 300 acima de 42px é a marca
- IBM Blue `#0f62fe` é o único acento cromático, e é escasso
- Sem sombra projetada em UI de produto — suba a escala de camada
  (`background` → `layer-01` → `layer-02` → `layer-03`)
- Mantenha `letter-spacing: 0.16px` no corpo de 14px
- Caixa de frase em tudo; botões são verbos no imperativo; sem emoji
- Foco é anel de 2px por dentro — nunca remova
- Estado nunca se apoia só na cor

## Temas

```html
<html data-carbon-theme="g100">   <!-- documento inteiro -->
<div class="cds--g100">…</div>    <!-- qualquer subárvore -->
```

Os exports do dossiê usam `white`, que é o tema certo para impressão.

## Notas

- Os componentes são uma reimplementação sem dependências, não o `@carbon/react`.
  Para código de aplicação em produção, instale `@carbon/react` e use isto como
  camada de token e orientação.
- IBM Plex Serif não vem incluída; adicione os binários em `assets/fonts/` se
  precisar.
- Nenhum logo de 8 barras da IBM é incluído, por decisão — obtenha os arquivos
  oficiais pelos canais de marca da IBM.
- Os tokens são gerados dos pacotes `@carbon/*` v11. Regenere `tokens/` em vez de
  editar à mão.
