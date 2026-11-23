# Pagination

A 40px rule-bounded strip: page-size select on the left, range and prev/next steppers on the right, all divided by 1px rules. Pairs directly under a DataTable.

```jsx
<Pagination page={1} pageSize={20} totalItems={482} onChange={setPage} />
```

| Prop | Type | Default |
|---|---|---|
| `page` | `number` | `1` |
| `pageSize` | `number` | `10` |
| `totalItems` | `number` | `0` |
| `pageSizes` | `number[]` | `[10, 20, 30, 40, 50]` |
| `onChange` | `({ page, pageSize }) => void` | — |
