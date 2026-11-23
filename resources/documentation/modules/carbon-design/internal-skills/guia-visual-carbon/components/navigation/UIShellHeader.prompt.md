# UIShellHeader

Always 48px tall and always g100 dark, regardless of the page theme — the shell reads as chrome above the product, so it does not follow the light/dark swap. The active nav item carries a 3px bottom border.

```jsx
<UIShellHeader prefix="IBM" name="Cloud Pak" navItems={[{ label: 'Catalog', isActive: true }, { label: 'Docs' }]} />
```

| Prop | Type | Default |
|---|---|---|
| `prefix` | `string` | `'IBM'` |
| `name` | `string` | `'Product'` |
| `navItems` | `Array<{ label: string; href?: string; isActive?: boolean }>` | `[]` |
| `actions` | `Array<{ label: string; icon: React.ReactNode; onClick?: () => void; isActive?: boolean }>` | `[]` |
| `onMenuClick` | `() => void` | — |
