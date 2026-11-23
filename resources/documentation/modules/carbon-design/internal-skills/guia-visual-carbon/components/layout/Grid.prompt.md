# Grid

Carbon's 2x Grid: 16 columns at lg and above, 8 at md, 4 at sm. Span values are per-tier column counts, matching Carbon's own API. Exports `Grid` and `Column`.

```jsx
<Grid>
  <Column sm={4} md={4} lg={8}>Left</Column>
  <Column sm={4} md={4} lg={8}>Right</Column>
</Grid>
```

| Prop | Type | Default |
|---|---|---|
| `condensed` | `boolean` | `false` |
| `narrow` | `boolean` | `false` |
| `fullWidth` | `boolean` | `false` |
