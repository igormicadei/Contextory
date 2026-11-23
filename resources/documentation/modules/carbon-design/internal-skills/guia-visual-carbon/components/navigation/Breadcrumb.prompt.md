# Breadcrumb

The final item is rendered unlinked with aria-current="page". Separators are thin slashes, not chevrons.

```jsx
<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Services', href: '/services' }, 'Databases']} />
```

| Prop | Type | Default |
|---|---|---|
| `items` | `Array<string \| { label: string; href?: string; isCurrentPage?: boolean }>` | `[]` |
| `noTrailingSlash` | `boolean` | `true` |
