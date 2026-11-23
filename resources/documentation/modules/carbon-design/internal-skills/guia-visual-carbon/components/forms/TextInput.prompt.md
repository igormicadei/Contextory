# TextInput

The single bottom rule is the whole visual identity of a Carbon field — there is no box border. Focus replaces that rule with a 2px ring drawn inside the field.

```jsx
<TextInput labelText="Email" placeholder="you@example.com" helperText="We'll never share it." />
<TextInput labelText="API key" invalid invalidText="That key isn't valid." />
```

| Prop | Type | Default |
|---|---|---|
| `labelText` | `string` | — |
| `helperText` | `string` | — |
| `placeholder` | `string` | — |
| `value` | `string` | — |
| `type` | `string` | `'text'` |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `disabled` | `boolean` | `false` |
| `readOnly` | `boolean` | `false` |
| `invalid` | `boolean` | `false` |
| `invalidText` | `string` | — |
| `warn` | `boolean` | `false` |
| `warnText` | `string` | — |
| `light` | `boolean` | `false` |
| `onChange` | `(e) => void` | — |
