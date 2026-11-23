# IBM Carbon Design System

A working implementation of **Carbon** — IBM's open-source design system and the software
expression of the IBM Design Language. Built for web pages, application interfaces,
documents and presentation decks.

**Source:** every token in this system is generated from the official `@carbon/*` v11 npm
packages (Apache-2.0), not transcribed from documentation or sampled from screenshots —
`@carbon/colors`, `@carbon/themes`, `@carbon/type`, `@carbon/layout`, `@carbon/motion`,
`@carbon/styles` and `@carbon/icons`. Regenerate rather than hand-editing `tokens/`. Icons
are the real Carbon SVGs and IBM Plex is bundled as real webfont binaries.

## What Carbon looks like, in one paragraph

White or gray-10 surfaces, charcoal type, and **IBM Blue `#0f62fe` as the only chromatic
accent**. Every corner is square. There are no drop shadows in product UI — depth comes
from stepping up the layer scale (`background` → `layer-01` → `layer-02` → `layer-03`).
Display type runs IBM Plex Sans at **weight 300**, which is the brand's typographic
signature: a 42px headline at weight 300 reads as quietly authoritative where weight 700
would read as generic enterprise. Body type carries `letter-spacing: 0.16px` — a Carbon
precision detail worth preserving.

## Themes

Four themes ship, all generated from `@carbon/themes`:

| Theme | Mode | Page background | Typical use |
|---|---|---|---|
| `white` | Light | `#ffffff` | Marketing pages, ibm.com-style surfaces |
| `g10` | Light | `#f4f4f4` | **Product UI** — the page is darker than its cards |
| `g90` | Dark | `#262626` | Dark product UI |
| `g100` | Dark | `#161616` | Dark product UI, the UI Shell, footers |

```html
<html data-carbon-theme="g100">           <!-- whole document -->
<div class="cds--g100">…</div>            <!-- any subtree -->
<html data-carbon-theme="auto">           <!-- opt in to OS preference -->
```

Carbon itself never switches theme automatically, so neither does this — linking
`styles.css` gives you the white theme and nothing else unless you ask for more.

The white/g10 distinction is load-bearing: marketing surfaces sit on white with gray-10
alternating bands, while product surfaces invert that (gray-10 page, white cards).

## Index

- `styles.css` — the single stylesheet to link. Imports everything below plus a small base layer.
- `tokens/`
  - `palette.css` — 12 colour families × 10 grades
  - `themes.css` — 234 semantic tokens × 4 themes
  - `components.css` — 78 component tokens × 4 themes (button, tag, notification, status)
  - `typography.css` — 58 type tokens + `.cds--type-*` utility classes, including fluid styles
  - `spacing.css` — 13-step 2x Grid scale, fluid spacing, breakpoints, `.cds--grid`
  - `motion.css`, `shape.css`, `fonts.css`
- `components/` — 42 components in six groups, each with `.jsx`, `.d.ts` and `.prompt.md`
- `guidelines/` — 14 foundation specimen cards
- `ui_kits/` — four finished surfaces (see below)
- `assets/fonts/` — IBM Plex Sans (16 cuts) + Plex Mono (5), woff2, SIL OFL-1.1
- `assets/icons/` — 213 real Carbon icons at 32px, plus 46 optically-drawn 16px variants
- `_ds_bundle.js` — all 42 components compiled for browser preview
- `SKILL.md` — portable skill definition

## Components

| Group | Components |
|---|---|
| `forms/` | Button, TextInput, TextArea, Select, Search, Dropdown, NumberInput, Checkbox, RadioButton, Toggle, FileUploader, Slider |
| `navigation/` | UIShellHeader, SideNav, Tabs, Breadcrumb, Pagination, OverflowMenu, ProgressIndicator, Link |
| `data/` | DataTable, Tile, StructuredList, CodeSnippet |
| `feedback/` | Modal, InlineNotification, ToastNotification, Tag, Accordion, Tooltip, Loading, InlineLoading, ProgressBar, SkeletonText |
| `layout/` | Grid, Column, Stack, AspectRatio |
| `marketing/` | HeroBand, FeatureCard, CTABanner, Footer |

Each component reads its colours from theme tokens, so the same markup renders correctly in
all four themes without modification.

## UI kits

The four surfaces this system is built to produce:

- **`ui_kits/web/Homepage.html`** — marketing page: utility bar, nav, fluid hero, feature
  grid, logo marquee, blue CTA band, dark footer.
- **`ui_kits/app/Dashboard.html`** — product UI on the g10 theme: UI Shell, side nav,
  breadcrumb, metric tiles, tabs, sortable/selectable data table, pagination.
- **`ui_kits/document/Report.html`** — print-ready A4 report: cover, contents, numbered
  sections, tables, callouts, serif pull quote. Plain HTML, no React, prints to PDF cleanly.
- **`ui_kits/deck/Deck.html`** — 16:9 presentation deck: title, agenda, statement, stat row,
  table and closing slides. Scales to fit, prints one slide per page.

## Content fundamentals

- **Voice:** precise and declarative, written like engineering spec rather than persuasion.
  "Form follows function. Nothing is gratuitous or there for decoration."
- **Casing:** sentence case everywhere — headlines, buttons, nav, eyebrows. Carbon
  deliberately resists the all-caps tracked eyebrow common to other enterprise brands.
- **Buttons** are imperative verbs ("Create instance", "Start building free"), never hype.
- **No emoji** in system chrome or copy.

## Visual rules worth not breaking

- **Corners stay at 0.** Only two exceptions exist in all of Carbon: the tag (pill) and the
  tooltip (2px). Rounding a button breaks the look faster than any other single change.
- **Never bold a display headline.** Weight 300 above 42px is the brand.
- **Blue is scarce.** Links, primary buttons, focus rings, selected indicators, and the one
  full-bleed CTA band. Using it as a general card background is drift.
- **No drop shadows in product UI.** Step the layer scale instead.
- **Keep `letter-spacing: 0.16px`** on 14px body sizes.
- **Status never rests on colour alone** — pair it with an icon, a shape, or a label.
- **Focus is a 2px ring** in the focus colour, drawn inside the element. Never remove it.

## Accessibility

Carbon targets WCAG 2.1 AA. Contrast is reasoned about in *grade steps*: two colours from
the same family need a gap of at least 50 grades for body text (gray-100 on gray-10 is 90
steps, comfortably safe). Minimum tap target is 48px on touch. `tokens/motion.css` honours
`prefers-reduced-motion`, and `styles.css` ships a `.cds--visually-hidden` utility.

## Iconography

213 curated icons are bundled as the real Carbon SVGs in `assets/icons/32/` (plus 46
optically-redrawn 16px variants where Carbon provides them). They are drawn on a 32px grid
with a uniform 2px stroke so they sit level with Plex letterforms. Size 32 is Carbon's
canonical complete set — the 16/20/24 directories upstream contain only the handful of icons
that are optically redrawn at those sizes.

For the full ~2,500-icon set, load from CDN or npm rather than bundling:

```html
<!-- single icon, by name -->
<img src="https://unpkg.com/@carbon/icons@11/svg/32/rocket.svg" width="32" height="32" alt="">
```
```bash
npm install @carbon/icons        # svg/32/<name>.svg
npm install @carbon/icons-react  # <Rocket size={32} />
```

## Logo

**No IBM 8-bar logo is included, deliberately.** The mark (Paul Rand, 1972) is one of IBM's
most protected assets and must never be hand-drawn, traced or generated. Where a lockup
belongs, this system sets the plain "IBM" wordmark in Plex Sans SemiBold with tight negative
tracking — see `guidelines/wordmark.html`. Obtain the official files through IBM's brand
channels before shipping anything real.

## Caveats

- **IBM Plex Serif is not bundled.** It is referenced by `quotation-01/02` and the report
  pull quote only; add the binaries to `assets/fonts/` if you need it offline.
- **These components are a faithful re-implementation, not `@carbon/react`.** They are
  dependency-free and styled from the real tokens, which makes them ideal for prototypes,
  mocks and static output. For production application code, install `@carbon/react` and use
  this system as the token and guidance layer.
- **Token values track `@carbon/*` v11** as of July 2026. Re-run the generators against a
  newer version to refresh.
- Carbon components not covered here (ComboBox, MultiSelect, DatePicker, TreeView,
  ContainedList, Toggletip, FluidForm and the AI-specific surfaces) exist in Carbon proper —
  ask and they can be added in the same style.
