# Tile

Carbon's workhorse container — a flat layer-01 rectangle with square corners and no shadow. Depth comes from the surface change against the page background, never from elevation.

```jsx
<Tile>Static content</Tile>
<Tile variant="clickable" href="/catalog">Browse the catalog</Tile>
<Tile variant="selectable" onSelect={setChosen}>Standard plan</Tile>
<Tile variant="expandable" aboveTheFold={<h4>Summary</h4>}>Full detail…</Tile>
```

| Prop | Type | Default |
|---|---|---|
| `variant` | `'base' \| 'clickable' \| 'selectable' \| 'expandable'` | `'base'` |
| `selected` | `boolean` | — |
| `expanded` | `boolean` | — |
| `href` | `string` | — |
| `disabled` | `boolean` | `false` |
| `aboveTheFold` | `React.ReactNode` | — |
| `onClick` | `(expanded?: boolean) => void` | — |
| `onSelect` | `(selected: boolean) => void` | — |
