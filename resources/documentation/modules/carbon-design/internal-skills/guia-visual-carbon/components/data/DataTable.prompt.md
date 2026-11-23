# DataTable

Header row sits on layer-accent, body rows on layer with 1px rules between. Row height is the density control — xs (24px) through xl (64px). Selection uses a checkbox column, never a row colour alone.

```jsx
<DataTable
  isSortable
  headers={[{ key: 'name', header: 'Name' }, { key: 'status', header: 'Status' }]}
  rows={[{ id: 1, name: 'db-prod', status: 'Active' }]}
/>
```

| Prop | Type | Default |
|---|---|---|
| `headers` | `Array<string \| { key: string; header: string }>` | `[]` |
| `rows` | `Array<Record<string, any>>` | `[]` |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'` |
| `title` | `string` | — |
| `description` | `string` | — |
| `isSortable` | `boolean` | `false` |
| `selectable` | `boolean` | `false` |
| `selectedRows` | `Array<string \| number>` | `[]` |
| `onSelect` | `(id) => void` | — |
| `onSort` | `({ key, direction }) => void` | — |
