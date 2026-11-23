# OverflowMenu

40px square trigger holding the vertical three-dot glyph. Destructive items set `isDelete` and turn red on hover — always place them last.

```jsx
<OverflowMenu items={[{ label: 'Edit' }, { label: 'Duplicate' }, { label: 'Delete', isDelete: true }]} />
```

| Prop | Type | Default |
|---|---|---|
| `items` | `Array<{ label: string; onClick?: () => void; disabled?: boolean; isDelete?: boolean }>` | `[]` |
| `ariaLabel` | `string` | `'Open and close list of options'` |
| `flipped` | `boolean` | `false` |
