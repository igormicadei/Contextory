---
name: guia-visual-carbon
description: "Consultar os tokens, componentes, fontes e exemplos locais do Carbon durante a criação e revisão de apresentações ou aplicações visuais."
---

Esta skill é a fonte de verdade visual dos artefatos que o plugin produz. Ela não
decide o que o documento diz; decide como ele se parece.

**Ela não é um comando.** `user-invocable: false` no frontmatter é deliberado: não
há momento do trabalho em que uma pessoa queira "abrir o design system" — ela quer
um PDF, um cronograma ou uma resposta sobre uma cor. Quem chega aqui é o agente,
atrás de um token; ou o motor de exportação em `scripts/`, que encontra este
diretório no disco e não passa por esta skill. Não reative a invocação humana sem
antes ter uma ação que só ela entregue.

Raiz da skill, em caminho portável:
o diret?rio que cont?m este `SKILL.md`

## Antes de desenhar qualquer coisa à mão, verifique se já existe renderizador

Os exports do dossiê **já estão implementados** em `${CLAUDE_PLUGIN_ROOT}/scripts/`.
Escrever HTML de dossiê na mão produz divergência entre PDF e DOCX e perde os
marcadores do documento. A ordem correta é:

| Pedido do usuário | Caminho certo |
|---|---|
| Exportar o dossiê em PDF | skill `exportar-pdf` |
| Exportar o dossiê em DOCX | skill `exportar-docx` |
| Apresentação do dossiê em PPTX | skill `exportar-apresentacao` |
| Cronograma / gantt / timeline | skill `gerar-cronograma` |
| Outra superfície (página, mock, diagrama) | desenhe aqui, com as regras abaixo |

Os renderizadores leem os tokens **desta** pasta em tempo de execução
(`scripts/carbon_tokens.py`). Alterar `tokens/` muda os exports.

## Regras que não se negociam

São elas que fazem o resultado ler como Carbon e não como "enterprise genérico":

1. **Cantos são 0.** As duas únicas exceções em todo o Carbon são a tag (pílula) e
   o tooltip (2px). Nunca arredonde botão, cartão, input ou modal.
2. **Tipografia de display é peso 300.** Nunca coloque negrito num título de 42px
   ou mais.
3. **O IBM Blue `#0f62fe` é escasso** — links, botão primário, anel de foco,
   indicador de seleção e no máximo uma faixa de CTA por página. Nunca como
   preenchimento geral de cartão.
4. **Sem sombra projetada em UI de produto.** Profundidade é subir a escala de
   camada: `background` → `layer-01` → `layer-02` → `layer-03`.
5. **Nunca escreva um hex na mão.** Sempre um token `--cds-*`, para que os quatro
   temas continuem funcionando. Quando o formato não tem variável CSS (DOCX, SVG),
   resolva o token pelo `scripts/carbon_tokens.py` — não transcreva a cor.
6. **Mantenha `letter-spacing: 0.16px`** nos corpos de texto de 14px.
7. **Estado nunca se apoia só na cor** — junte ícone, forma ou rótulo. Isto vale
   duas vezes no cronograma, onde "concluído" e "a fazer" precisam se distinguir
   também impressos em preto e branco.
8. **Foco é um anel de 2px** em `--cds-focus`, desenhado por dentro do elemento.
   Nunca remova.
9. **Caixa de frase em tudo.** Sem eyebrow em caixa alta espaçada.
10. **Nunca desenhe o logo de 8 barras da IBM.** Use o wordmark em tipo, como em
    `guidelines/wordmark.html`.

## Escolha do tema

- Documento, relatório, página editorial → `white`
- UI de produto ou aplicação → `g10` (página cinza-10, cartões brancos — a
  inversão é intencional)
- UI escura → `g90` ou `g100`
- O header do UI Shell e o rodapé do site são **sempre** escuros, qualquer que
  seja o tema da página.

Os exports do dossiê usam `white`, que é o tema certo para impressão.

## Início rápido

```html
<html data-carbon-theme="white">
<link rel="stylesheet" href="styles.css">
```

`styles.css` importa fontes, paleta, os quatro temas, tokens de componente, escala
tipográfica, espaçamento, movimento e forma. Depois é só usar os tokens:

```css
.painel {
  background: var(--cds-layer-01);
  color: var(--cds-text-primary);
  border-block-end: 1px solid var(--cds-border-subtle-01);
  padding: var(--cds-spacing-05);
  border-radius: var(--cds-radius-none);
}
```

Ou as utilitárias de tipo: `.cds--type-heading-04`, `.cds--type-body-01`,
`.cds--type-fluid-heading-05` (as fluidas reescalam e mudam de peso a cada
breakpoint).

**Para arquivo único, sem dependência externa** (é o que os exports fazem), use
`carbon_tokens.css_autocontido()`: ele resolve os `@import` e embute as fontes
como data URI, para que o HTML abra offline e imprima igual.

## O que existe nesta pasta

Índice completo em `readme.md` — leia antes de explorar. Em resumo:

- `styles.css` — a única folha a linkar
- `tokens/` — paleta (12 famílias × 10 graus), 4 temas, componentes, tipografia,
  espaçamento, movimento, forma, fontes
- `components/` — 42 componentes, cada um com `.jsx`, `.d.ts` e `.prompt.md`
- `guidelines/` — 14 cartões-espécime de fundamentos
- `ui_kits/` — quatro superfícies acabadas. **`ui_kits/document/Report.html` é a
  base dos exports do dossiê**: A4, capa, sumário, seções numeradas, tabelas,
  callouts, `@page { size: A4; margin: 18mm }`. As outras: `web/Homepage.html`,
  `app/Dashboard.html`, `deck/Deck.html`.
- `assets/fonts/` — IBM Plex Sans (16 cortes) + Mono (5), woff2, SIL OFL-1.1
- `assets/icons/` — 213 ícones Carbon reais em 32px (+ 46 variantes ópticas 16px)
- `guia-rapido.md` — a mesma orientação em uma página

## Limites desta cópia

- **IBM Plex Serif não vem incluída.** É referenciada por `quotation-01/02` e pela
  citação do relatório; sem os binários, o navegador cai numa serifada do sistema.
- **Os componentes são uma reimplementação sem dependências, não o
  `@carbon/react`.** Servem para mock, protótipo e saída estática. Para código de
  produção, instale `@carbon/react` e use isto como camada de token e orientação.
- **Os tokens acompanham `@carbon/*` v11** em julho de 2026. Para atualizar,
  regenere `tokens/` — não edite à mão.
- Nenhum arquivo de logo da IBM é incluído, por decisão.
