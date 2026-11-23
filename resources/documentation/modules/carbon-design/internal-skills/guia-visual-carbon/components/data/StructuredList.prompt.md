# StructuredList

Lighter than a DataTable — no header fill, just a semibold header row over 1px-ruled rows. Use it for read-only detail lists and single-select choices.

```jsx
<StructuredList headers={['Plan', 'Price']} rows={[['Lite', 'Free'], ['Pro', '$99/mo']]} />
```

| Prop | Type | Default |
|---|---|---|
| `headers` | `string[]` | `[]` |
| `rows` | `Array<string[] \| Record<string, any>>` | `[]` |
| `selection` | `boolean` | `false` |
| `selectedIndex` | `number` | — |
| `onSelect` | `(index: number) => void` | — |
