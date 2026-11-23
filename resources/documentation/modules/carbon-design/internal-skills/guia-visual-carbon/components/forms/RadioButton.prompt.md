# RadioButton

The one circle in Carbon's form vocabulary. Always group radios under a shared `name`.

```jsx
<RadioButton name="plan" value="lite" labelText="Lite" checked />
<RadioButton name="plan" value="pro" labelText="Pro" />
```

| Prop | Type | Default |
|---|---|---|
| `name` | `string` | — |
| `value` | `string` | — |
| `labelText` | `string` | — |
| `checked` | `boolean` | — |
| `disabled` | `boolean` | `false` |
| `onChange` | `(e) => void` | — |
