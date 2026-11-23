# ProgressBar

Square fill on a flat track. Omit `value` to get the indeterminate sweep for work of unknown duration.

```jsx
<ProgressBar label="Uploading" value={62} helperText="62 of 100 MB" />
<ProgressBar label="Analyzing" />
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `helperText` | `string` | — |
| `value` | `number` | — |
| `max` | `number` | `100` |
| `size` | `'small' \| 'big'` | `'big'` |
| `status` | `'active' \| 'finished' \| 'error'` | `'active'` |
| `hideLabel` | `boolean` | `false` |
