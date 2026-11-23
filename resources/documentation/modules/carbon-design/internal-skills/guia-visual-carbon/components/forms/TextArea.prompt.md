# TextArea

Same field chrome as TextInput. Setting `maxCount` shows a live character counter aligned right of the label.

```jsx
<TextArea labelText="Description" rows={4} maxCount={500} />
```

| Prop | Type | Default |
|---|---|---|
| `labelText` | `string` | — |
| `helperText` | `string` | — |
| `placeholder` | `string` | — |
| `rows` | `number` | `4` |
| `maxCount` | `number` | — |
| `disabled` | `boolean` | `false` |
| `invalid` | `boolean` | `false` |
| `invalidText` | `string` | — |
| `onChange` | `(e) => void` | — |
