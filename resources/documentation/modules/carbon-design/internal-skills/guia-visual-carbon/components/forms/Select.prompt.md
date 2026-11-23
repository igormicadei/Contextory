# Select

Wraps the native <select>, so it inherits platform keyboard and mobile behaviour. Reach for Dropdown instead when you need custom option rendering.

```jsx
<Select labelText="Region" items={['us-south', 'eu-de', 'jp-tok']} />
```

| Prop | Type | Default |
|---|---|---|
| `labelText` | `string` | — |
| `helperText` | `string` | — |
| `items` | `Array<string \| { value: string; label: string }>` | `[]` |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `disabled` | `boolean` | `false` |
| `invalid` | `boolean` | `false` |
| `invalidText` | `string` | — |
| `onChange` | `(e) => void` | — |
