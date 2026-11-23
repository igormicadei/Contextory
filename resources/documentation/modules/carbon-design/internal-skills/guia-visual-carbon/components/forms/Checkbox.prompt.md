# Checkbox

16px square that fills solid on check. Supports the indeterminate (dash) state for parent rows in a tree or table.

```jsx
<Checkbox labelText="Enable logging" />
<Checkbox labelText="All regions" indeterminate />
```

| Prop | Type | Default |
|---|---|---|
| `labelText` | `string` | — |
| `checked` | `boolean` | — |
| `defaultChecked` | `boolean` | `false` |
| `indeterminate` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |
| `invalid` | `boolean` | `false` |
| `invalidText` | `string` | — |
| `onChange` | `(e) => void` | — |
