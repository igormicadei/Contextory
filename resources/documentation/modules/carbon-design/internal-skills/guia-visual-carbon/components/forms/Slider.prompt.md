# Slider

2px rail with min/max labels flanking it and a paired number field on the right, so the exact value is always typeable.

```jsx
<Slider labelText="Memory (GB)" min={1} max={64} defaultValue={8} />
```

| Prop | Type | Default |
|---|---|---|
| `labelText` | `string` | — |
| `value` | `number` | — |
| `min` | `number` | `0` |
| `max` | `number` | `100` |
| `step` | `number` | `1` |
| `disabled` | `boolean` | `false` |
| `hideTextInput` | `boolean` | `false` |
| `onChange` | `({ value }) => void` | — |
