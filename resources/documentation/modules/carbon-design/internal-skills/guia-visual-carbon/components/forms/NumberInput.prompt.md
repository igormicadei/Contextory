# NumberInput

Steppers are stacked square buttons on the right edge, divided by a 1px rule — the native browser spinner is suppressed.

```jsx
<NumberInput label="Replicas" min={1} max={10} defaultValue={3} />
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `helperText` | `string` | — |
| `value` | `number` | — |
| `min` | `number` | — |
| `max` | `number` | — |
| `step` | `number` | `1` |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `disabled` | `boolean` | `false` |
| `invalid` | `boolean` | `false` |
| `invalidText` | `string` | — |
| `onChange` | `(value: number) => void` | — |
