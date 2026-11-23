# SideNav

256px rail with 32px rows. The selected row is marked by a 3px left border plus a layer-selected fill — never a rounded pill. Nested items indent rather than float in a submenu.

```jsx
<SideNav items={[{ label: 'Overview', isActive: true }, { label: 'Storage', items: [{ label: 'Buckets' }] }]} />
```

| Prop | Type | Default |
|---|---|---|
| `items` | `Array<{ label: string; href?: string; icon?: React.ReactNode; isActive?: boolean; items?: Array<object> }>` | `[]` |
| `expanded` | `boolean` | `true` |
| `ariaLabel` | `string` | `'Side navigation'` |
