# ProgressIndicator

Complete steps show a filled checkmark, the current step an open ring, upcoming steps a hollow circle — shape carries state, not just colour.

```jsx
<ProgressIndicator steps={['Account', 'Plan', 'Confirm']} currentIndex={1} />
```

| Prop | Type | Default |
|---|---|---|
| `steps` | `Array<string \| { label: string; secondaryLabel?: string; invalid?: boolean }>` | `[]` |
| `currentIndex` | `number` | `0` |
| `vertical` | `boolean` | `false` |
