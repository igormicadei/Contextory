# Button

Carbon buttons are square, weight 400, and reserve a wide right gutter so the optional icon sits at the far edge rather than beside the label. lg (48px) is the product default; xl/2xl are the expressive marketing sizes where the label top-aligns.

```jsx
<Button variant="primary">Get started</Button>
<Button variant="tertiary" size="md">Learn more</Button>
<Button variant="danger" renderIcon={<TrashIcon />}>Delete</Button>
<Button hasIconOnly renderIcon={<CloseIcon />}>Close</Button>
```

| Prop | Type | Default |
|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'tertiary' \| 'ghost' \| 'danger' \| 'danger--tertiary' \| 'danger--ghost'` | `'primary'` |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | `'lg'` |
| `disabled` | `boolean` | `false` |
| `isSelected` | `boolean` | `false` |
| `hasIconOnly` | `boolean` | `false` |
| `renderIcon` | `React.ReactNode` | — |
| `href` | `string` | — |
| `children` | `React.ReactNode` | — |
| `onClick` | `() => void` | — |
